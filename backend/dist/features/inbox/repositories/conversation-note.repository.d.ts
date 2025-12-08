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
export declare class ConversationNoteRepository {
    private _repository;
    /**
     * Lazy initialization of the repository to ensure AppDataSource is initialized.
     */
    private get repository();
    /**
     * Find all notes for a conversation.
     * Optionally filter by scope to get conversation-specific or customer-wide notes.
     *
     * @param conversationId - The conversation ID
     * @param scope - Optional scope filter
     * @returns Array of notes ordered by creation time (newest first)
     */
    findByConversation(conversationId: string, scope?: NoteScope): Promise<ConversationNote[]>;
    /**
     * Find all notes associated with a customer.
     * Returns notes with customer scope that are visible across all conversations.
     *
     * @param tenantId - The tenant ID for isolation
     * @param customerId - The customer ID
     * @returns Array of customer-scoped notes ordered by creation time
     */
    findByCustomer(tenantId: string, customerId: string): Promise<ConversationNote[]>;
    /**
     * Find a note by ID with tenant isolation.
     *
     * @param tenantId - The tenant ID for isolation
     * @param id - The note ID
     * @returns The note or null if not found
     */
    findById(tenantId: string, id: string): Promise<ConversationNote | null>;
    /**
     * Create a new note.
     *
     * @param data - The note data to create
     * @returns The created note
     */
    create(data: Partial<ConversationNote>): Promise<ConversationNote>;
    /**
     * Update an existing note with tenant isolation.
     * Only the content and mentions can be updated.
     *
     * @param tenantId - The tenant ID for isolation
     * @param id - The note ID
     * @param data - The data to update (content and/or mentions)
     * @returns The updated note or null if not found
     */
    update(tenantId: string, id: string, data: {
        content?: string;
        mentions?: NoteMention[];
    }): Promise<ConversationNote | null>;
    /**
     * Delete a note with tenant isolation.
     *
     * @param tenantId - The tenant ID for isolation
     * @param id - The note ID
     * @returns True if deleted, false if not found
     */
    delete(tenantId: string, id: string): Promise<boolean>;
    /**
     * Count notes for a conversation.
     *
     * @param conversationId - The conversation ID
     * @returns The note count
     */
    countByConversation(conversationId: string): Promise<number>;
    /**
     * Find notes that mention a specific user.
     * Useful for notifications and activity feeds.
     *
     * @param tenantId - The tenant ID for isolation
     * @param userId - The user ID to search for in mentions
     * @param limit - Maximum number of notes to return
     * @returns Array of notes mentioning the user
     */
    findByMentionedUser(tenantId: string, userId: string, limit?: number): Promise<ConversationNote[]>;
    /**
     * Bulk delete notes for a conversation.
     * Used when cleaning up after conversation deletion.
     *
     * @param conversationId - The conversation ID
     * @returns Number of notes deleted
     */
    bulkDeleteByConversation(conversationId: string): Promise<number>;
}
