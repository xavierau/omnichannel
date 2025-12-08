import { ConversationAssignment } from '../entities/conversation-assignment.entity';
/**
 * Repository for ConversationAssignment entity operations.
 * Provides an audit trail for conversation assignment changes.
 *
 * This repository follows an append-only pattern:
 * - Assignments are created but never updated or deleted
 * - The assignment history provides a complete audit trail
 * - The latest assignment reflects the current state
 *
 * Use cases:
 * - Track who handled a conversation over time
 * - Audit trail for compliance/quality assurance
 * - Workload analysis and reporting
 */
export declare class ConversationAssignmentRepository {
    private _repository;
    /**
     * Lazy initialization of the repository to ensure AppDataSource is initialized.
     */
    private get repository();
    /**
     * Find all assignments for a conversation.
     * Returns the complete assignment history in chronological order.
     *
     * @param conversationId - The conversation ID
     * @returns Array of assignments ordered by creation time (oldest first)
     */
    findByConversation(conversationId: string): Promise<ConversationAssignment[]>;
    /**
     * Create a new assignment record.
     * This is an append-only operation - assignments are never updated.
     *
     * @param data - The assignment data to create
     * @returns The created assignment record
     */
    create(data: Partial<ConversationAssignment>): Promise<ConversationAssignment>;
    /**
     * Get the most recent assignment for a conversation.
     * This reflects the current assignment state.
     *
     * @param conversationId - The conversation ID
     * @returns The latest assignment or null if never assigned
     */
    getLatestAssignment(conversationId: string): Promise<ConversationAssignment | null>;
    /**
     * Find all assignments performed by a specific user.
     * Useful for auditing and activity tracking.
     *
     * @param tenantId - The tenant ID for isolation
     * @param performedById - The user ID who performed the assignments
     * @param limit - Maximum number of assignments to return
     * @returns Array of assignments performed by the user
     */
    findByPerformedBy(tenantId: string, performedById: string, limit?: number): Promise<ConversationAssignment[]>;
    /**
     * Find all assignments where a user was assigned to (received).
     * Useful for user activity and workload analysis.
     *
     * @param tenantId - The tenant ID for isolation
     * @param toUserId - The user ID who received assignments
     * @param limit - Maximum number of assignments to return
     * @returns Array of assignments where the user was the target
     */
    findByToUser(tenantId: string, toUserId: string, limit?: number): Promise<ConversationAssignment[]>;
    /**
     * Count assignments for a conversation.
     * Indicates how many times a conversation was reassigned.
     *
     * @param conversationId - The conversation ID
     * @returns The assignment count
     */
    countByConversation(conversationId: string): Promise<number>;
    /**
     * Get assignment statistics for a user within a date range.
     * Useful for workload reports and performance metrics.
     *
     * @param tenantId - The tenant ID for isolation
     * @param userId - The user ID to get statistics for
     * @param startDate - Start of the date range
     * @param endDate - End of the date range
     * @returns Object with assignment counts
     */
    getStatsByUser(tenantId: string, userId: string, startDate: Date, endDate: Date): Promise<{
        assignedTo: number;
        assignedFrom: number;
        performed: number;
    }>;
    /**
     * Find the most recent assignments across all conversations for a tenant.
     * Useful for activity feeds and dashboards.
     *
     * @param tenantId - The tenant ID for isolation
     * @param limit - Maximum number of assignments to return
     * @returns Array of recent assignments
     */
    findRecent(tenantId: string, limit?: number): Promise<ConversationAssignment[]>;
}
