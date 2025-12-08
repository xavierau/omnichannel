import { ConversationMessage } from '../entities/conversation-message.entity';
import { MessageDeliveryStatus } from '../enums';
/**
 * Pagination options for listing messages.
 */
export interface PaginationOptions {
    page?: number;
    limit?: number;
}
/**
 * Generic paginated result interface.
 */
export interface PaginatedResult<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}
/**
 * Timestamps for delivery status updates.
 */
export interface DeliveryStatusTimestamps {
    sentAt?: Date;
    deliveredAt?: Date;
    readAt?: Date;
}
/**
 * Repository for ConversationMessage entity operations.
 * Handles message CRUD and delivery status tracking.
 *
 * Messages are the core data in conversations. This repository
 * provides efficient access patterns for:
 * - Paginated message history (newest first for chat UI)
 * - Delivery status updates from provider webhooks
 * - Provider message ID lookup for status correlation
 */
export declare class ConversationMessageRepository {
    private _repository;
    /**
     * Lazy initialization of the repository to ensure AppDataSource is initialized.
     */
    private get repository();
    /**
     * Find messages for a conversation with pagination.
     * Returns messages in descending order by creation time (newest first),
     * which is the typical display order for chat interfaces.
     *
     * @param conversationId - The conversation ID
     * @param options - Pagination options
     * @returns Paginated result of messages
     */
    findByConversation(conversationId: string, options?: PaginationOptions): Promise<PaginatedResult<ConversationMessage>>;
    /**
     * Find a message by its provider-assigned message ID.
     * Used to correlate webhook status updates with our messages.
     *
     * @param providerMessageId - The provider's message ID
     * @returns The message or null if not found
     */
    findByProviderMessageId(providerMessageId: string): Promise<ConversationMessage | null>;
    /**
     * Find a message by ID.
     *
     * @param id - The message ID
     * @returns The message or null if not found
     */
    findById(id: string): Promise<ConversationMessage | null>;
    /**
     * Create a new message.
     *
     * @param data - The message data to create
     * @returns The created message
     */
    create(data: Partial<ConversationMessage>): Promise<ConversationMessage>;
    /**
     * Update the delivery status of a message.
     * Called when receiving webhook updates from the messaging provider.
     *
     * Status progression: PENDING -> SENT -> DELIVERED -> READ
     * Status FAILED can occur at any point.
     *
     * @param id - The message ID
     * @param status - The new delivery status
     * @param timestamps - Optional timestamps for sent, delivered, or read events
     */
    updateDeliveryStatus(id: string, status: MessageDeliveryStatus, timestamps?: DeliveryStatusTimestamps): Promise<void>;
    /**
     * Update error information for a failed message.
     *
     * @param id - The message ID
     * @param errorCode - The error code from the provider
     * @param errorMessage - The human-readable error message
     */
    updateError(id: string, errorCode: string, errorMessage: string): Promise<void>;
    /**
     * Increment the retry count for a message.
     * Returns the new retry count for decision making on whether to retry again.
     *
     * @param id - The message ID
     * @returns The new retry count after increment
     */
    incrementRetryCount(id: string): Promise<number>;
    /**
     * Get the count of messages in a conversation.
     *
     * @param conversationId - The conversation ID
     * @returns The message count
     */
    countByConversation(conversationId: string): Promise<number>;
    /**
     * Get the latest message in a conversation.
     *
     * @param conversationId - The conversation ID
     * @returns The latest message or null if no messages exist
     */
    findLatestByConversation(conversationId: string): Promise<ConversationMessage | null>;
    /**
     * Find messages pending delivery for retry processing.
     * Used by background jobs to retry failed message deliveries.
     *
     * @param maxRetryCount - Maximum retry count to consider
     * @param limit - Maximum number of messages to return
     * @returns Array of messages eligible for retry
     */
    findPendingForRetry(maxRetryCount: number, limit?: number): Promise<ConversationMessage[]>;
    /**
     * Bulk update delivery status for multiple messages.
     * Useful for batch processing webhook updates.
     *
     * @param providerMessageIds - Array of provider message IDs
     * @param status - The new delivery status
     * @param timestamp - Optional timestamp for the status change
     * @returns Number of messages updated
     */
    bulkUpdateDeliveryStatus(providerMessageIds: string[], status: MessageDeliveryStatus, timestamp?: Date): Promise<number>;
}
