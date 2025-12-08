import { ConversationNoteRepository } from '../repositories/conversation-note.repository';
import { ConversationRepository } from '../repositories/conversation.repository';
import { InboxSseService } from './inbox-sse.service';
import { TeamService } from '../../teams/services/team.service';
import { ConversationNote } from '../entities/conversation-note.entity';
import { NoteScope } from '../enums';
/**
 * Data transfer object for creating a note.
 */
export interface CreateNoteData {
    content: string;
    scope?: NoteScope;
    mentions?: string[];
}
/**
 * Data transfer object for updating a note.
 */
export interface UpdateNoteData {
    content?: string;
    mentions?: string[];
}
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
export declare class InboxNoteService {
    private noteRepository;
    private conversationRepository;
    private sseService;
    private teamService;
    constructor(noteRepository: ConversationNoteRepository, conversationRepository: ConversationRepository, sseService: InboxSseService, teamService: TeamService);
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
    createNote(tenantId: string, conversationId: string, userId: string, data: CreateNoteData): Promise<ConversationNote>;
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
    getNotes(tenantId: string, conversationId: string, userId: string, scope?: NoteScope): Promise<ConversationNote[]>;
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
    updateNote(tenantId: string, noteId: string, userId: string, data: UpdateNoteData): Promise<ConversationNote>;
    /**
     * Deletes a note.
     *
     * @param tenantId - The tenant ID for isolation
     * @param noteId - The note ID to delete
     * @param userId - The user performing the deletion
     * @throws NotFoundException if note not found
     * @throws ForbiddenException if user is not the author
     */
    deleteNote(tenantId: string, noteId: string, userId: string): Promise<void>;
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
    private validateConversationAccess;
    /**
     * Validates that the user is the author of the note.
     *
     * @param note - The note to validate
     * @param userId - The user ID to check
     * @throws ForbiddenException if user is not the author
     */
    private validateNoteAuthor;
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
    private buildMentions;
}
