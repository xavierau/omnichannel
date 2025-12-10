import Bull from 'bull';
import { OutgoingWebhookDispatcher } from '../features/outgoing-webhooks/infrastructure/outgoing-webhook.dispatcher';
import { WebhookDispatchJobData } from '../features/outgoing-webhooks/interfaces/webhook-payload.interface';
/**
 * Queue name for outgoing webhooks.
 */
export declare const OUTGOING_WEBHOOK_QUEUE_NAME = "outgoing-webhooks";
/**
 * Job types for the outgoing webhook queue.
 */
export declare enum OutgoingWebhookJobType {
    /**
     * Job to dispatch a webhook to an external URL.
     */
    DISPATCH_WEBHOOK = "DISPATCH_WEBHOOK"
}
/**
 * Queue statistics for monitoring.
 */
export interface OutgoingWebhookQueueStats {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
    paused: number;
}
/**
 * Bull queue for processing outgoing webhook dispatches.
 *
 * Handles async dispatch of webhooks to external services with retry logic.
 * Uses exponential backoff for transient failures.
 *
 * @remarks
 * Configuration:
 * - Queue: 'outgoing-webhooks'
 * - Attempts: 5 (initial + 4 retries)
 * - Backoff: exponential starting at 5s
 * - Concurrency: Uses default from BULL_CONFIG
 */
export declare class OutgoingWebhookQueue {
    private readonly dispatcher;
    private readonly queue;
    constructor(dispatcher: OutgoingWebhookDispatcher);
    /**
     * Queue a webhook dispatch job.
     *
     * @param data - Webhook dispatch job data
     * @returns The job ID
     */
    queueDispatch(data: WebhookDispatchJobData): Promise<string>;
    /**
     * Get queue statistics.
     *
     * @returns Queue job counts by status
     */
    getQueueStats(): Promise<OutgoingWebhookQueueStats>;
    /**
     * Pause the queue - stops processing new jobs.
     */
    pauseQueue(): Promise<void>;
    /**
     * Resume the queue - continues processing jobs.
     */
    resumeQueue(): Promise<void>;
    /**
     * Close the queue gracefully.
     */
    closeQueue(): Promise<void>;
    /**
     * Get the underlying Bull queue (for testing/monitoring).
     */
    getQueue(): Bull.Queue<WebhookDispatchJobData>;
    /**
     * Setup the job processor.
     */
    private setupProcessor;
    /**
     * Process a webhook dispatch job.
     *
     * @throws Error to trigger Bull retry on failure
     */
    private processDispatchJob;
    /**
     * Determine if an error is retryable.
     *
     * Retryable errors:
     * - 5xx server errors
     * - Network timeouts
     * - Connection refused
     *
     * Non-retryable errors:
     * - 4xx client errors (except 429)
     * - Invalid URL
     * - Certificate errors
     */
    private isRetryableError;
    /**
     * Setup event listeners for queue events.
     */
    private setupEventListeners;
}
