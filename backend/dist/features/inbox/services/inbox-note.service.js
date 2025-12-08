"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InboxNoteService = void 0;
const tsyringe_1 = require("tsyringe");
const conversation_note_repository_1 = require("../repositories/conversation-note.repository");
const conversation_repository_1 = require("../repositories/conversation.repository");
const inbox_sse_service_1 = require("./inbox-sse.service");
const team_service_1 = require("../../teams/services/team.service");
const enums_1 = require("../enums");
const http_exceptions_1 = require("../../../shared/exceptions/http-exceptions");
const logger_config_1 = require("../../../config/logger.config");
/**
 * Service layer for managing internal notes on conversations.
 *
 * Notes are internal-only content visible to operators but not customers.
 * They support:
 * - Scoped visibility (conversation-specific vs customer-wide)
 * - @mentions for team collaboration
 * - Edit history (via updated_at tracking)
 *
 * Access Control:
 * - Users must have access to the conversation to create/read notes
 * - Only the author can edit/delete their own notes
 */
let InboxNoteService = class InboxNoteService {
    noteRepository;
    conversationRepository;
    sseService;
    teamService;
    constructor(noteRepository, conversationRepository, sseService, teamService) {
        this.noteRepository = noteRepository;
        this.conversationRepository = conversationRepository;
        this.sseService = sseService;
        this.teamService = teamService;
    }
    // ============================================================================
    // Create Note
    // ============================================================================
    /**
     * Creates a new note on a conversation.
     *
     * @param tenantId - The tenant ID for isolation
     * @param conversationId - The conversation to attach the note to
     * @param userId - The user creating the note
     * @param data - Note data including content, scope, and mentions
     * @returns The created note
     * @throws NotFoundException if conversation not found
     * @throws ForbiddenException if user lacks conversation access
     */
    async createNote(tenantId, conversationId, userId, data) {
        // Validate user has access to conversation
        const conversation = await this.validateConversationAccess(tenantId, userId, conversationId);
        // Build mentions array from user IDs
        const mentions = this.buildMentions(data.mentions);
        // Create the note
        const note = await this.noteRepository.create({
            tenantId,
            conversationId,
            customerId: conversation.customerId,
            createdById: userId,
            scope: data.scope ?? enums_1.NoteScope.CONVERSATION,
            content: data.content,
            mentions,
        });
        // Emit SSE event for real-time updates
        this.sseService.emitToTenant(tenantId, 'note:created', {
            noteId: note.id,
            conversationId,
            customerId: conversation.customerId,
            scope: note.scope,
            authorId: userId,
            content: note.content,
            mentions: note.mentions,
        });
        logger_config_1.auditLogger.info('Note created', {
            action: 'note.create',
            tenantId,
            noteId: note.id,
            conversationId,
            userId,
            scope: note.scope,
        });
        return note;
    }
    // ============================================================================
    // Get Notes
    // ============================================================================
    /**
     * Retrieves notes for a conversation.
     *
     * @param tenantId - The tenant ID for isolation
     * @param conversationId - The conversation to get notes for
     * @param userId - The user requesting the notes
     * @param scope - Optional filter by scope (conversation, customer, or all)
     * @returns Array of notes matching the criteria
     * @throws NotFoundException if conversation not found
     * @throws ForbiddenException if user lacks conversation access
     */
    async getNotes(tenantId, conversationId, userId, scope) {
        // Validate user has access to conversation
        const conversation = await this.validateConversationAccess(tenantId, userId, conversationId);
        // Fetch notes based on scope
        if (scope === enums_1.NoteScope.CONVERSATION) {
            return this.noteRepository.findByConversation(conversationId, enums_1.NoteScope.CONVERSATION);
        }
        if (scope === enums_1.NoteScope.CUSTOMER) {
            // If no customer associated with conversation, return empty array
            if (!conversation.customerId) {
                return [];
            }
            return this.noteRepository.findByCustomer(tenantId, conversation.customerId);
        }
        // If no scope specified, return both conversation and customer notes
        const conversationNotes = await this.noteRepository.findByConversation(conversationId, enums_1.NoteScope.CONVERSATION);
        // If no customer, only return conversation notes
        if (!conversation.customerId) {
            return conversationNotes;
        }
        const customerNotes = await this.noteRepository.findByCustomer(tenantId, conversation.customerId);
        // Merge and sort by creation time (newest first)
        return [...conversationNotes, ...customerNotes].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }
    // ============================================================================
    // Update Note
    // ============================================================================
    /**
     * Updates an existing note.
     *
     * @param tenantId - The tenant ID for isolation
     * @param noteId - The note ID to update
     * @param userId - The user performing the update
     * @param data - Update data (content and/or mentions)
     * @returns The updated note
     * @throws NotFoundException if note not found
     * @throws ForbiddenException if user is not the author
     */
    async updateNote(tenantId, noteId, userId, data) {
        // Find the note
        const note = await this.noteRepository.findById(tenantId, noteId);
        if (!note) {
            throw new http_exceptions_1.NotFoundException('Note not found');
        }
        // Validate user is the author
        this.validateNoteAuthor(note, userId);
        // Build update payload
        const updatePayload = {};
        if (data.content !== undefined) {
            updatePayload.content = data.content;
        }
        if (data.mentions !== undefined) {
            updatePayload.mentions = this.buildMentions(data.mentions);
        }
        // Update the note
        const updatedNote = await this.noteRepository.update(tenantId, noteId, updatePayload);
        if (!updatedNote) {
            throw new http_exceptions_1.NotFoundException('Note not found');
        }
        // Emit SSE event for real-time updates
        this.sseService.emitToTenant(tenantId, 'note:updated', {
            noteId,
            conversationId: note.conversationId,
            content: updatedNote.content,
            mentions: updatedNote.mentions,
        });
        logger_config_1.auditLogger.info('Note updated', {
            action: 'note.update',
            tenantId,
            noteId,
            conversationId: note.conversationId,
            userId,
        });
        return updatedNote;
    }
    // ============================================================================
    // Delete Note
    // ============================================================================
    /**
     * Deletes a note.
     *
     * @param tenantId - The tenant ID for isolation
     * @param noteId - The note ID to delete
     * @param userId - The user performing the deletion
     * @throws NotFoundException if note not found
     * @throws ForbiddenException if user is not the author
     */
    async deleteNote(tenantId, noteId, userId) {
        // Find the note
        const note = await this.noteRepository.findById(tenantId, noteId);
        if (!note) {
            throw new http_exceptions_1.NotFoundException('Note not found');
        }
        // Validate user is the author
        this.validateNoteAuthor(note, userId);
        // Delete the note
        const deleted = await this.noteRepository.delete(tenantId, noteId);
        if (!deleted) {
            throw new http_exceptions_1.NotFoundException('Note not found');
        }
        // Emit SSE event for real-time updates
        this.sseService.emitToTenant(tenantId, 'note:deleted', {
            noteId,
            conversationId: note.conversationId,
        });
        logger_config_1.auditLogger.info('Note deleted', {
            action: 'note.delete',
            tenantId,
            noteId,
            conversationId: note.conversationId,
            userId,
        });
    }
    // ============================================================================
    // Private Helpers
    // ============================================================================
    /**
     * Validates that a user has access to a conversation.
     *
     * Access is granted if EITHER:
     * 1. The conversation's channel account is in the user's accessible channels
     * 2. The conversation is assigned to the user
     *
     * @param tenantId - The tenant ID for isolation
     * @param userId - The user ID to validate access for
     * @param conversationId - The conversation ID
     * @returns The conversation if access is valid
     * @throws NotFoundException if conversation not found
     * @throws ForbiddenException if user lacks access
     */
    async validateConversationAccess(tenantId, userId, conversationId) {
        const conversation = await this.conversationRepository.findById(tenantId, conversationId);
        if (!conversation) {
            throw new http_exceptions_1.NotFoundException('Conversation not found');
        }
        // Check 1: Is the conversation assigned to this user?
        if (conversation.assignedToId === userId) {
            return conversation;
        }
        // Check 2: Does the user have access to the channel account?
        const accessibleChannelAccountIds = await this.teamService.getAccessibleChannelAccountIds(userId);
        if (accessibleChannelAccountIds.includes(conversation.channelAccountId)) {
            return conversation;
        }
        throw new http_exceptions_1.ForbiddenException('You do not have access to this conversation');
    }
    /**
     * Validates that the user is the author of the note.
     *
     * @param note - The note to validate
     * @param userId - The user ID to check
     * @throws ForbiddenException if user is not the author
     */
    validateNoteAuthor(note, userId) {
        if (note.createdById !== userId) {
            throw new http_exceptions_1.ForbiddenException('You can only modify your own notes');
        }
    }
    /**
     * Builds NoteMention array from user IDs.
     *
     * Note: This is a simplified implementation. In a production system,
     * the mentions would typically include offset and length based on
     * the actual position of @mentions in the content string.
     *
     * @param userIds - Array of user IDs being mentioned
     * @returns Array of NoteMention objects
     */
    buildMentions(userIds) {
        if (!userIds || userIds.length === 0) {
            return [];
        }
        return userIds.map((userId, index) => ({
            userId,
            offset: index * 10, // Placeholder - would be calculated from content
            length: 5, // Placeholder - would be calculated from content
        }));
    }
};
exports.InboxNoteService = InboxNoteService;
exports.InboxNoteService = InboxNoteService = __decorate([
    (0, tsyringe_1.singleton)(),
    __param(0, (0, tsyringe_1.inject)(conversation_note_repository_1.ConversationNoteRepository)),
    __param(1, (0, tsyringe_1.inject)(conversation_repository_1.ConversationRepository)),
    __param(2, (0, tsyringe_1.inject)(inbox_sse_service_1.InboxSseService)),
    __param(3, (0, tsyringe_1.inject)(team_service_1.TeamService)),
    __metadata("design:paramtypes", [conversation_note_repository_1.ConversationNoteRepository,
        conversation_repository_1.ConversationRepository,
        inbox_sse_service_1.InboxSseService,
        team_service_1.TeamService])
], InboxNoteService);
