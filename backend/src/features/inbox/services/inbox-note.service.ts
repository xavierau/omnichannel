import { singleton, inject } from 'tsyringe';
import { ConversationNoteRepository } from '../repositories/conversation-note.repository';
import { ConversationRepository } from '../repositories/conversation.repository';
import { InboxSseService } from './inbox-sse.service';
import { TeamService } from '../../teams/services/team.service';
import { ConversationNote, NoteMention } from '../entities/conversation-note.entity';
import { Conversation } from '../entities/conversation.entity';
import { NoteScope } from '../enums';
import {
  NotFoundException,
  ForbiddenException,
} from '../../../shared/exceptions/http-exceptions';
import { auditLogger } from '../../../config/logger.config';

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
@singleton()
export class InboxNoteService {
  constructor(
    @inject(ConversationNoteRepository) private noteRepository: ConversationNoteRepository,
    @inject(ConversationRepository) private conversationRepository: ConversationRepository,
    @inject(InboxSseService) private sseService: InboxSseService,
    @inject(TeamService) private teamService: TeamService
  ) {}

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
  async createNote(
    tenantId: string,
    conversationId: string,
    userId: string,
    data: CreateNoteData
  ): Promise<ConversationNote> {
    // Validate user has access to conversation
    const conversation = await this.validateConversationAccess(
      tenantId,
      userId,
      conversationId
    );

    // Build mentions array from user IDs
    const mentions = this.buildMentions(data.mentions);

    // Create the note
    const note = await this.noteRepository.create({
      tenantId,
      conversationId,
      customerId: conversation.customerId,
      createdById: userId,
      scope: data.scope ?? NoteScope.CONVERSATION,
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

    auditLogger.info('Note created', {
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
  async getNotes(
    tenantId: string,
    conversationId: string,
    userId: string,
    scope?: NoteScope
  ): Promise<ConversationNote[]> {
    // Validate user has access to conversation
    const conversation = await this.validateConversationAccess(
      tenantId,
      userId,
      conversationId
    );

    // Fetch notes based on scope
    if (scope === NoteScope.CONVERSATION) {
      return this.noteRepository.findByConversation(conversationId, NoteScope.CONVERSATION);
    }

    if (scope === NoteScope.CUSTOMER) {
      // If no customer associated with conversation, return empty array
      if (!conversation.customerId) {
        return [];
      }
      return this.noteRepository.findByCustomer(tenantId, conversation.customerId);
    }

    // If no scope specified, return both conversation and customer notes
    const conversationNotes = await this.noteRepository.findByConversation(
      conversationId,
      NoteScope.CONVERSATION
    );

    // If no customer, only return conversation notes
    if (!conversation.customerId) {
      return conversationNotes;
    }

    const customerNotes = await this.noteRepository.findByCustomer(
      tenantId,
      conversation.customerId
    );

    // Merge and sort by creation time (newest first)
    return [...conversationNotes, ...customerNotes].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
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
  async updateNote(
    tenantId: string,
    noteId: string,
    userId: string,
    data: UpdateNoteData
  ): Promise<ConversationNote> {
    // Find the note
    const note = await this.noteRepository.findById(tenantId, noteId);

    if (!note) {
      throw new NotFoundException('Note not found');
    }

    // Validate user is the author
    this.validateNoteAuthor(note, userId);

    // Build update payload
    const updatePayload: { content?: string; mentions?: NoteMention[] } = {};

    if (data.content !== undefined) {
      updatePayload.content = data.content;
    }

    if (data.mentions !== undefined) {
      updatePayload.mentions = this.buildMentions(data.mentions);
    }

    // Update the note
    const updatedNote = await this.noteRepository.update(tenantId, noteId, updatePayload);

    if (!updatedNote) {
      throw new NotFoundException('Note not found');
    }

    // Emit SSE event for real-time updates
    this.sseService.emitToTenant(tenantId, 'note:updated', {
      noteId,
      conversationId: note.conversationId,
      content: updatedNote.content,
      mentions: updatedNote.mentions,
    });

    auditLogger.info('Note updated', {
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
  async deleteNote(tenantId: string, noteId: string, userId: string): Promise<void> {
    // Find the note
    const note = await this.noteRepository.findById(tenantId, noteId);

    if (!note) {
      throw new NotFoundException('Note not found');
    }

    // Validate user is the author
    this.validateNoteAuthor(note, userId);

    // Delete the note
    const deleted = await this.noteRepository.delete(tenantId, noteId);

    if (!deleted) {
      throw new NotFoundException('Note not found');
    }

    // Emit SSE event for real-time updates
    this.sseService.emitToTenant(tenantId, 'note:deleted', {
      noteId,
      conversationId: note.conversationId,
    });

    auditLogger.info('Note deleted', {
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
  private async validateConversationAccess(
    tenantId: string,
    userId: string,
    conversationId: string
  ): Promise<Conversation> {
    const conversation = await this.conversationRepository.findById(tenantId, conversationId);

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    // Check 1: Is the conversation assigned to this user?
    if (conversation.assignedToId === userId) {
      return conversation;
    }

    // Check 2: Does the user have access to the channel account?
    const accessibleChannelAccountIds =
      await this.teamService.getAccessibleChannelAccountIds(userId);

    if (accessibleChannelAccountIds.includes(conversation.channelAccountId)) {
      return conversation;
    }

    throw new ForbiddenException('You do not have access to this conversation');
  }

  /**
   * Validates that the user is the author of the note.
   *
   * @param note - The note to validate
   * @param userId - The user ID to check
   * @throws ForbiddenException if user is not the author
   */
  private validateNoteAuthor(note: ConversationNote, userId: string): void {
    if (note.createdById !== userId) {
      throw new ForbiddenException('You can only modify your own notes');
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
  private buildMentions(userIds?: string[]): NoteMention[] {
    if (!userIds || userIds.length === 0) {
      return [];
    }

    return userIds.map((userId, index) => ({
      userId,
      offset: index * 10, // Placeholder - would be calculated from content
      length: 5, // Placeholder - would be calculated from content
    }));
  }
}
