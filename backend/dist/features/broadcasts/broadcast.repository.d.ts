import { Broadcast } from './broadcast.entity';
import { BroadcastStatus } from './enums';
import { TemplateCategory } from '../templates/enums';
/**
 * Query options for listing broadcasts with filtering, pagination, and sorting.
 */
export interface BroadcastQueryOptions {
    search?: string;
    statuses?: BroadcastStatus[];
    templateCategories?: TemplateCategory[];
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc' | 'ASC' | 'DESC';
    createdBy?: string;
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
 * Metrics update data for broadcast statistics.
 */
export interface BroadcastMetrics {
    sentCount?: number;
    deliveredCount?: number;
    readCount?: number;
    failedCount?: number;
}
/**
 * Repository for broadcast database operations.
 * All queries enforce tenant isolation via tenantId parameter.
 */
export declare class BroadcastRepository {
    private _repository;
    /**
     * Lazy initialization of the repository to ensure AppDataSource is initialized.
     */
    private get repository();
    /**
     * Find all broadcasts for a tenant with optional filtering, pagination, and sorting.
     *
     * @param tenantId - The tenant ID for isolation
     * @param options - Query options for filtering, pagination, and sorting
     * @returns Paginated result of broadcasts
     */
    findAll(tenantId: string, options?: BroadcastQueryOptions): Promise<PaginatedResult<Broadcast>>;
    /**
     * Find a single broadcast by ID with tenant isolation.
     *
     * @param tenantId - The tenant ID for isolation
     * @param id - The broadcast ID
     * @returns The broadcast or null if not found
     */
    findById(tenantId: string, id: string): Promise<Broadcast | null>;
    /**
     * Find multiple broadcasts by IDs with tenant isolation.
     *
     * @param tenantId - The tenant ID for isolation
     * @param ids - Array of broadcast IDs
     * @returns Array of broadcasts found
     */
    findByIds(tenantId: string, ids: string[]): Promise<Broadcast[]>;
    /**
     * Create a new broadcast.
     *
     * @param data - Partial broadcast data
     * @returns The created broadcast
     */
    create(data: Partial<Broadcast>): Promise<Broadcast>;
    /**
     * Update an existing broadcast with tenant isolation.
     *
     * @param id - The broadcast ID
     * @param tenantId - The tenant ID for isolation
     * @param data - Partial broadcast data to update
     * @returns The updated broadcast or null if not found
     */
    update(id: string, tenantId: string, data: Partial<Broadcast>): Promise<Broadcast | null>;
    /**
     * Delete a broadcast with tenant isolation.
     *
     * @param id - The broadcast ID
     * @param tenantId - The tenant ID for isolation
     * @returns True if deleted, false if not found
     */
    delete(id: string, tenantId: string): Promise<boolean>;
    /**
     * Bulk delete broadcasts with tenant isolation.
     *
     * @param ids - Array of broadcast IDs to delete
     * @param tenantId - The tenant ID for isolation
     * @returns Number of broadcasts deleted
     */
    bulkDelete(ids: string[], tenantId: string): Promise<number>;
    /**
     * Bulk update status for broadcasts with tenant isolation.
     *
     * @param ids - Array of broadcast IDs
     * @param tenantId - The tenant ID for isolation
     * @param status - New status to set
     * @returns Number of broadcasts updated
     */
    bulkUpdateStatus(ids: string[], tenantId: string, status: BroadcastStatus): Promise<number>;
    /**
     * Find scheduled broadcasts that are ready to be sent.
     * Used by the job queue to process broadcasts.
     *
     * @param beforeTime - Find broadcasts scheduled before this time
     * @returns Array of broadcasts ready to send
     */
    findScheduledBroadcasts(beforeTime: Date): Promise<Broadcast[]>;
    /**
     * Update broadcast metrics (sent, delivered, read, failed counts).
     *
     * @param id - The broadcast ID
     * @param metrics - Metrics to update
     * @returns True if updated, false if not found
     */
    updateMetrics(id: string, metrics: BroadcastMetrics): Promise<boolean>;
    /**
     * Increment a specific metric by a delta value.
     * Useful for updating counts during broadcast processing.
     *
     * @param id - The broadcast ID
     * @param metric - The metric to increment
     * @param delta - The amount to increment by (default 1)
     */
    incrementMetric(id: string, metric: 'sentCount' | 'deliveredCount' | 'readCount' | 'failedCount', delta?: number): Promise<void>;
    /**
     * Check if a broadcast exists with the given name for the tenant.
     *
     * @param name - The broadcast name to check
     * @param tenantId - The tenant ID for isolation
     * @param excludeId - Optional ID to exclude from the check (for updates)
     * @returns True if a broadcast with the name exists
     */
    existsByName(name: string, tenantId: string, excludeId?: string): Promise<boolean>;
    /**
     * Mark a broadcast as completed and set completion timestamp.
     *
     * @param id - The broadcast ID
     * @param tenantId - The tenant ID for isolation
     * @returns True if updated, false if not found
     */
    markCompleted(id: string, tenantId: string): Promise<boolean>;
    /**
     * Atomically mark a broadcast as completed if all recipients have been processed.
     * Uses database-level atomic operation to prevent race conditions from concurrent
     * worker processes trying to mark the same broadcast as completed.
     *
     * This method checks that:
     * 1. The broadcast exists and belongs to the tenant
     * 2. The broadcast is currently in SENDING status
     * 3. The total processed count (sentCount + failedCount) >= totalRecipients
     * 4. The broadcast has not already been marked as completed
     *
     * @param id - The broadcast ID
     * @param tenantId - The tenant ID for isolation
     * @returns Object with success flag and whether the broadcast was updated
     */
    markCompletedAtomic(id: string, tenantId: string): Promise<{
        success: boolean;
        wasUpdated: boolean;
    }>;
    /**
     * Atomically updates broadcast status with pessimistic locking.
     * Prevents race conditions in concurrent status transitions.
     *
     * @param id - The broadcast ID
     * @param tenantId - The tenant ID for isolation
     * @param expectedStatuses - Array of valid current statuses for this transition
     * @param newStatus - The target status
     * @param additionalData - Optional additional fields to update
     * @returns The updated broadcast
     * @throws ConflictException if broadcast not found or status transition invalid
     */
    updateStatusWithLock(id: string, tenantId: string, expectedStatuses: BroadcastStatus[], newStatus: BroadcastStatus, additionalData?: Partial<Broadcast>): Promise<Broadcast>;
    /**
     * Bulk pause broadcasts with transaction and pessimistic locking.
     * Ensures atomic operation across all broadcasts.
     *
     * @param ids - Array of broadcast IDs
     * @param tenantId - The tenant ID for isolation
     * @param pausableStatuses - Array of valid statuses that can be paused
     * @returns Object with paused count and details of each broadcast
     */
    bulkPauseWithTransaction(ids: string[], tenantId: string, pausableStatuses: BroadcastStatus[]): Promise<{
        paused: number;
        results: Array<{
            id: string;
            previousStatus: BroadcastStatus;
        }>;
    }>;
    /**
     * Bulk cancel broadcasts with transaction and pessimistic locking.
     *
     * @param ids - Array of broadcast IDs
     * @param tenantId - The tenant ID for isolation
     * @param cancellableStatuses - Array of valid statuses that can be cancelled
     * @returns Number of broadcasts cancelled
     */
    bulkCancelWithTransaction(ids: string[], tenantId: string, cancellableStatuses: BroadcastStatus[]): Promise<number>;
    /**
     * Bulk delete broadcasts with transaction.
     *
     * @param ids - Array of broadcast IDs
     * @param tenantId - The tenant ID for isolation
     * @param deletableStatuses - Array of valid statuses that can be deleted
     * @returns Number of broadcasts deleted
     */
    bulkDeleteWithTransaction(ids: string[], tenantId: string, deletableStatuses: BroadcastStatus[]): Promise<number>;
}
