import { MessageLog, MessageStatus } from './message-log.entity';
/**
 * Query options for message logs.
 */
export interface MessageLogQueryOptions {
    broadcastId?: string;
    customerId?: string;
    channelAccountId?: string;
    status?: MessageStatus | MessageStatus[];
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
}
/**
 * Statistics for message delivery.
 */
export interface MessageLogStats {
    total: number;
    pending: number;
    queued: number;
    sent: number;
    delivered: number;
    read: number;
    failed: number;
}
/**
 * Data for creating a new message log.
 */
export interface CreateMessageLogData {
    tenantId: string;
    broadcastId?: string | null;
    customerId?: string | null;
    channelAccountId?: string | null;
    channelId: string;
    providerId: string;
    recipient: string;
    templateData?: Record<string, unknown> | null;
}
export declare class MessageLogRepository {
    private _repository;
    /**
     * Lazy initialization of the repository to ensure AppDataSource is initialized.
     */
    private get repository();
    /**
     * Create a new message log entry.
     */
    create(data: CreateMessageLogData): Promise<MessageLog>;
    /**
     * Find a message log by ID.
     */
    findById(id: string): Promise<MessageLog | null>;
    /**
     * Find a message log by ID for a specific tenant.
     */
    findByIdAndTenant(id: string, tenantId: string): Promise<MessageLog | null>;
    /**
     * Find a message log by provider message ID.
     * Used for webhook processing to update status.
     */
    findByProviderMessageId(providerMessageId: string): Promise<MessageLog | null>;
    /**
     * Find message logs by tenant with optional filters.
     */
    findByTenant(tenantId: string, options?: MessageLogQueryOptions): Promise<MessageLog[]>;
    /**
     * Find message logs for a specific broadcast.
     */
    findByBroadcast(broadcastId: string, options?: Omit<MessageLogQueryOptions, 'broadcastId'>): Promise<MessageLog[]>;
    /**
     * Update message log status.
     */
    updateStatus(id: string, status: MessageStatus, additionalData?: {
        providerMessageId?: string;
        errorMessage?: string;
        errorCode?: string;
        providerResponse?: Record<string, unknown>;
    }): Promise<void>;
    /**
     * Update message status by provider message ID.
     * Used for webhook processing.
     */
    updateStatusByProviderMessageId(providerMessageId: string, status: MessageStatus, additionalData?: {
        errorMessage?: string;
        errorCode?: string;
    }): Promise<MessageLog | null>;
    /**
     * Increment retry count for a message log.
     */
    incrementRetryCount(id: string): Promise<void>;
    /**
     * Mark message as using fallback provider.
     */
    markAsFallback(id: string): Promise<void>;
    /**
     * Get statistics for a tenant's messages.
     */
    getStatsByTenant(tenantId: string, options?: {
        broadcastId?: string;
        startDate?: Date;
        endDate?: Date;
    }): Promise<MessageLogStats>;
    /**
     * Get statistics for a specific broadcast.
     */
    getStatsByBroadcast(broadcastId: string): Promise<MessageLogStats>;
    /**
     * Count message logs for a tenant.
     */
    countByTenant(tenantId: string, options?: MessageLogQueryOptions): Promise<number>;
    /**
     * Delete old message logs (for data retention).
     */
    deleteOldLogs(tenantId: string, olderThan: Date): Promise<number>;
}
