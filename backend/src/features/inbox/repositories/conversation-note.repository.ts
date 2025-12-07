import { Repository } from 'typeorm';
import { singleton } from 'tsyringe';
import { AppDataSource } from '@config/database.config';
import { ConversationNote, NoteMention } from '../entities/conversation-note.entity';
import { NoteScope } from '../enums';

/**
 * Repository for ConversationNote entity operations.
 * Handles internal notes attached to conversations or customers.
 *
 * Notes are internal-only content visible to operators but not customers.
 * They support:
 * - Scoped visibility (conversation-specific vs customer-wide)
 * - @mentions for team collaboration
 * - Edit history (via updated_at tracking)
 */
@singleton()
export class ConversationNoteRepository {
  private _repository: Repository<ConversationNote> | null = null;

  /**
   * Lazy initialization of the repository to ensure AppDataSource is initialized.
   */
  private get repository(): Repository<ConversationNote> {
    if (!this._repository) {
      this._repository = AppDataSource.getRepository(ConversationNote);
    }
    return this._repository;
  }

  /**
   * Find all notes for a conversation.
   * Optionally filter by scope to get conversation-specific or customer-wide notes.
   *
   * @param conversationId - The conversation ID
   * @param scope - Optional scope filter
   * @returns Array of notes ordered by creation time (newest first)
   */
  async findByConversation(
    conversationId: string,
    scope?: NoteScope
  ): Promise<ConversationNote[]> {
    const query = this.repository
      .createQueryBuilder('note')
      .leftJoinAndSelect('note.createdBy', 'createdBy')
      .where('note.conversation_id = :conversationId', { conversationId })
      .orderBy('note.created_at', 'DESC');

    if (scope) {
      query.andWhere('note.scope = :scope', { scope });
    }

    return query.getMany();
  }

  /**
   * Find all notes associated with a customer.
   * Returns notes with customer scope that are visible across all conversations.
   *
   * @param tenantId - The tenant ID for isolation
   * @param customerId - The customer ID
   * @returns Array of customer-scoped notes ordered by creation time
   */
  async findByCustomer(
    tenantId: string,
    customerId: string
  ): Promise<ConversationNote[]> {
    return this.repository.find({
      where: {
        tenantId,
        customerId,
        scope: NoteScope.CUSTOMER,
      },
      relations: ['createdBy', 'conversation'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Find a note by ID with tenant isolation.
   *
   * @param tenantId - The tenant ID for isolation
   * @param id - The note ID
   * @returns The note or null if not found
   */
  async findById(
    tenantId: string,
    id: string
  ): Promise<ConversationNote | null> {
    return this.repository.findOne({
      where: { id, tenantId },
      relations: ['createdBy', 'conversation', 'customer'],
    });
  }

  /**
   * Create a new note.
   *
   * @param data - The note data to create
   * @returns The created note
   */
  async create(data: Partial<ConversationNote>): Promise<ConversationNote> {
    const note = this.repository.create(data);
    return this.repository.save(note);
  }

  /**
   * Update an existing note with tenant isolation.
   * Only the content and mentions can be updated.
   *
   * @param tenantId - The tenant ID for isolation
   * @param id - The note ID
   * @param data - The data to update (content and/or mentions)
   * @returns The updated note or null if not found
   */
  async update(
    tenantId: string,
    id: string,
    data: { content?: string; mentions?: NoteMention[] }
  ): Promise<ConversationNote | null> {
    const note = await this.findById(tenantId, id);
    if (!note) {
      return null;
    }

    if (data.content !== undefined) {
      note.content = data.content;
    }
    if (data.mentions !== undefined) {
      note.mentions = data.mentions;
    }

    return this.repository.save(note);
  }

  /**
   * Delete a note with tenant isolation.
   *
   * @param tenantId - The tenant ID for isolation
   * @param id - The note ID
   * @returns True if deleted, false if not found
   */
  async delete(tenantId: string, id: string): Promise<boolean> {
    const result = await this.repository.delete({ id, tenantId });
    return (result.affected ?? 0) > 0;
  }

  /**
   * Count notes for a conversation.
   *
   * @param conversationId - The conversation ID
   * @returns The note count
   */
  async countByConversation(conversationId: string): Promise<number> {
    return this.repository.count({ where: { conversationId } });
  }

  /**
   * Find notes that mention a specific user.
   * Useful for notifications and activity feeds.
   *
   * @param tenantId - The tenant ID for isolation
   * @param userId - The user ID to search for in mentions
   * @param limit - Maximum number of notes to return
   * @returns Array of notes mentioning the user
   */
  async findByMentionedUser(
    tenantId: string,
    userId: string,
    limit: number = 50
  ): Promise<ConversationNote[]> {
    // PostgreSQL JSONB query for mentions array containing user
    return this.repository
      .createQueryBuilder('note')
      .leftJoinAndSelect('note.createdBy', 'createdBy')
      .leftJoinAndSelect('note.conversation', 'conversation')
      .where('note.tenant_id = :tenantId', { tenantId })
      .andWhere(`note.mentions @> :mention::jsonb`, {
        mention: JSON.stringify([{ userId }]),
      })
      .orderBy('note.created_at', 'DESC')
      .take(limit)
      .getMany();
  }

  /**
   * Bulk delete notes for a conversation.
   * Used when cleaning up after conversation deletion.
   *
   * @param conversationId - The conversation ID
   * @returns Number of notes deleted
   */
  async bulkDeleteByConversation(conversationId: string): Promise<number> {
    const result = await this.repository.delete({ conversationId });
    return result.affected ?? 0;
  }
}
