import { Conversation } from '../entities/conversation.entity';
import { ConversationStatus, MessageDirection } from '../enums';
/**
 * Query options for listing conversations with filtering, pagination, and sorting.
 */
export interface ConversationQueryOptions {
    statuses?: ConversationStatus[];
    search?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc' | 'ASC' | 'DESC';
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
 * Repository for Conversation entity operations.
 * Handles CRUD operations with tenant isolation and team-based access control.
 *
 * CRITICAL: All operator-facing queries must enforce channel account access
 * through the accessibleChannelAccountIds parameter. This ensures operators
 * only see conversations from channel accounts their team has access to.
 */
export declare class ConversationRepository {
    private _repository;
    /**
     * Lazy initialization of the repository to ensure AppDataSource is initialized.
     */
    private get repository();
    /**
     * Find a conversation by ID with tenant isolation.
     * Includes customer and assignedTo relations for display purposes.
     *
     * @param tenantId - The tenant ID for isolation
     * @param id - The conversation ID
     * @returns The conversation with relations or null if not found
     */
    findById(tenantId: string, id: string): Promise<Conversation | null>;
    /**
     * Find a conversation by customer and channel account combination.
     * This is the canonical lookup for finding or creating conversations
     * when processing incoming messages.
     *
     * @param tenantId - The tenant ID for isolation
     * @param customerId - The customer ID
     * @param channelAccountId - The channel account ID
     * @returns The conversation or null if not found
     */
    findByCustomerAndChannel(tenantId: string, customerId: string, channelAccountId: string): Promise<Conversation | null>;
    /**
     * Find all conversations accessible to an operator.
     *
     * CRITICAL ACCESS CONTROL LOGIC:
     * 1. Tenant isolation: conversation.tenantId = tenantId
     * 2. Channel access: conversation.channelAccountId IN accessibleChannelAccountIds
     * 3. Assignment visibility: conversation.assignedToId = userId OR assignedToId IS NULL
     *
     * This ensures operators only see:
     * - Conversations from channel accounts their team has access to
     * - Conversations assigned to them OR unassigned conversations
     *
     * @param tenantId - The tenant ID for isolation
     * @param userId - The operator's user ID for assignment filtering
     * @param accessibleChannelAccountIds - Channel account IDs the operator's team has access to
     * @param options - Query options for filtering, pagination, and sorting
     * @returns Paginated result of conversations
     */
    findAllForOperator(tenantId: string, userId: string, accessibleChannelAccountIds: string[], options?: ConversationQueryOptions): Promise<PaginatedResult<Conversation>>;
    /**
     * Create a new conversation.
     *
     * @param data - The conversation data to create
     * @returns The created conversation
     */
    create(data: Partial<Conversation>): Promise<Conversation>;
    /**
     * Update an existing conversation with tenant isolation.
     *
     * @param tenantId - The tenant ID for isolation
     * @param id - The conversation ID
     * @param data - The data to update
     * @returns The updated conversation or null if not found
     */
    update(tenantId: string, id: string, data: Partial<Conversation>): Promise<Conversation | null>;
    /**
     * Update the last message preview and timestamp.
     * Called when a new message is added to the conversation.
     *
     * @param tenantId - The tenant ID for isolation
     * @param id - The conversation ID
     * @param preview - The message preview text (truncated)
     * @param direction - The message direction (inbound/outbound)
     * @param timestamp - The message timestamp
     */
    updateLastMessage(tenantId: string, id: string, preview: string, direction: MessageDirection, timestamp: Date): Promise<void>;
    /**
     * Increment the unread message count.
     * Called when an inbound message is received.
     *
     * @param tenantId - The tenant ID for isolation
     * @param id - The conversation ID
     */
    incrementUnreadCount(tenantId: string, id: string): Promise<void>;
    /**
     * Reset the unread message count to zero.
     * Called when an operator opens/reads the conversation.
     *
     * @param tenantId - The tenant ID for isolation
     * @param id - The conversation ID
     */
    resetUnreadCount(tenantId: string, id: string): Promise<void>;
    /**
     * Atomically assign a conversation to a user using pessimistic locking.
     * This prevents race conditions when multiple operators try to claim
     * the same conversation simultaneously.
     *
     * @param tenantId - The tenant ID for isolation
     * @param id - The conversation ID
     * @param assignedToId - The user ID to assign to, or null to unassign
     * @returns Object indicating if the update was applied
     */
    assignAtomic(tenantId: string, id: string, assignedToId: string | null): Promise<{
        wasUpdated: boolean;
        previousAssignedToId: string | null;
    }>;
    /**
     * Count conversations by status for a tenant.
     * Useful for dashboard statistics.
     *
     * @param tenantId - The tenant ID
     * @returns Object with counts by status
     */
    countByStatus(tenantId: string): Promise<Record<ConversationStatus, number>>;
    /**
     * Update conversation status with tenant isolation.
     *
     * @param tenantId - The tenant ID for isolation
     * @param id - The conversation ID
     * @param status - The new status
     * @returns True if updated, false if not found
     */
    updateStatus(tenantId: string, id: string, status: ConversationStatus): Promise<boolean>;
    /**
     * Update the last customer message timestamp.
     * Called when an inbound message is received from a customer.
     *
     * This timestamp is used for WhatsApp Cloud API 24-hour messaging window
     * compliance. Freeform messages can only be sent within 24 hours of this timestamp.
     *
     * @param tenantId - The tenant ID for isolation
     * @param id - The conversation ID
     * @param timestamp - The timestamp of the customer message
     */
    updateLastCustomerMessageAt(tenantId: string, id: string, timestamp: Date): Promise<void>;
}
