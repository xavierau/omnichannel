import Bull from 'bull';
import { BroadcastRepository } from '../features/broadcasts/broadcast.repository';
import { BroadcastSseService } from '../features/broadcasts/broadcast-sse.service';
import { GroupRepository } from '../features/groups/group.repository';
import { CustomerRepository } from '../features/customers/customer.repository';
import { MessagingService } from '../features/messaging/services/messaging.service';
import { MessagingRateLimiterService } from '../features/messaging/services/rate-limiter.service';
import { ChannelAccountRepository } from '../features/channel-accounts/channel-account.repository';
import { TemplateVariablesConfig } from '../features/broadcasts/broadcast.entity';
/**
 * Job types for the broadcast queue.
 */
export declare enum JobType {
    /**
     * Main job to orchestrate broadcast sending.
     * Resolves recipients and creates individual PROCESS_RECIPIENT jobs.
     */
    SEND_BROADCAST = "SEND_BROADCAST",
    /**
     * Job to process a single recipient.
     * Simulates sending a WhatsApp message and updates metrics.
     */
    PROCESS_RECIPIENT = "PROCESS_RECIPIENT"
}
/**
 * Data for the SEND_BROADCAST job.
 */
export interface SendBroadcastJobData {
    broadcastId: string;
    tenantId: string;
}
/**
 * Data for the PROCESS_RECIPIENT job.
 */
export interface ProcessRecipientJobData {
    broadcastId: string;
    tenantId: string;
    channelAccountId: string;
    templateName: string;
    templateLanguage: string;
    templateVariables: TemplateVariablesConfig;
    customerId: string;
    customerPhone: string;
    customerName: string;
    customerFields: Record<string, unknown>;
}
/**
 * Queue statistics.
 */
export interface QueueStats {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
    paused: number;
}
/**
 * Service for managing Bull queue operations for broadcasts.
 *
 * Handles:
 * - Scheduling broadcasts for future delivery
 * - Immediate broadcast processing
 * - Recipient resolution from groups or customer IDs
 * - Progress tracking and SSE updates
 * - Queue lifecycle management
 */
export declare class BroadcastQueue {
    private broadcastRepository;
    private sseService;
    private groupRepository;
    private customerRepository;
    private messagingService;
    private channelAccountRepository;
    private rateLimiterService;
    private queue;
    constructor(broadcastRepository: BroadcastRepository, sseService: BroadcastSseService, groupRepository: GroupRepository, customerRepository: CustomerRepository, messagingService: MessagingService, channelAccountRepository: ChannelAccountRepository, rateLimiterService: MessagingRateLimiterService);
    /**
     * Schedule a broadcast to be sent at a specific time.
     *
     * @param broadcastId - The broadcast ID
     * @param tenantId - The tenant ID
     * @param scheduledAt - When to send the broadcast
     * @throws Error if scheduledAt is in the past
     */
    scheduleBroadcast(broadcastId: string, tenantId: string, scheduledAt: Date): Promise<void>;
    /**
     * Add a broadcast to the queue for immediate processing.
     *
     * @param broadcastId - The broadcast ID
     * @param tenantId - The tenant ID
     */
    sendBroadcastNow(broadcastId: string, tenantId: string): Promise<void>;
    /**
     * Cancel a scheduled broadcast job.
     *
     * @param broadcastId - The broadcast ID
     * @returns True if the job was removed
     */
    cancelScheduledBroadcast(broadcastId: string): Promise<boolean>;
    /**
     * Pause the queue - stops processing new jobs.
     */
    pauseQueue(): Promise<void>;
    /**
     * Resume the queue - continues processing jobs.
     */
    resumeQueue(): Promise<void>;
    /**
     * Get queue statistics.
     *
     * @returns Queue job counts by status
     */
    getQueueStats(): Promise<QueueStats>;
    /**
     * Close the queue gracefully.
     */
    closeQueue(): Promise<void>;
    /**
     * Check for scheduled broadcasts that should start processing.
     * Called periodically by the scheduler.
     */
    checkScheduledBroadcasts(): Promise<void>;
    /**
     * Get the underlying Bull queue (for testing/monitoring).
     */
    getQueue(): Bull.Queue;
    /**
     * Setup job processors for different job types.
     */
    private setupProcessors;
    /**
     * Process the main SEND_BROADCAST job.
     * Resolves recipients and creates individual processing jobs.
     */
    private processSendBroadcast;
    /**
     * Process a single recipient.
     * Sends template message via the configured provider.
     *
     * Implements rate limiting to prevent hitting Meta's API limits:
     * 1. Check if channel account is in backoff period
     * 2. Acquire rate limit token before sending
     * 3. Handle rate limit errors from provider with backoff
     */
    private processRecipient;
    /**
     * Check if an error code indicates a rate limit error from Meta.
     */
    private isRateLimitErrorCode;
    /**
     * Resolve recipients based on recipient type.
     * Uses batch operations to prevent N+1 queries.
     * Implements pagination for large groups to prevent memory exhaustion.
     */
    private resolveRecipients;
    /**
     * Resolve template variables by substituting customer fields.
     *
     * @param config - Template variables configuration from broadcast
     * @param customerFields - Customer's custom fields
     * @returns Resolved template variables for the messaging provider
     */
    private resolveTemplateVariables;
    /**
     * Resolve a single variable configuration.
     * Applies sanitization to customer field values to prevent injection attacks.
     *
     * @param config - Variable configuration
     * @param customerFields - Customer's custom fields
     * @returns Resolved variable value
     */
    private resolveVariable;
    /**
     * Emit progress update via SSE.
     */
    private emitProgress;
    /**
     * Setup event listeners for queue events.
     */
    private setupEventListeners;
}
