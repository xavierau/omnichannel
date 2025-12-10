import { singleton, inject } from 'tsyringe';
import Bull from 'bull';
import { createQueue } from '../config/bull.config';
import { OutgoingWebhookDispatcher } from '../features/outgoing-webhooks/infrastructure/outgoing-webhook.dispatcher';
import { logger, auditLogger } from '../config/logger.config';
import { WebhookDispatchJobData } from '../features/outgoing-webhooks/interfaces/webhook-payload.interface';

/**
 * Queue name for outgoing webhooks.
 */
export const OUTGOING_WEBHOOK_QUEUE_NAME = 'outgoing-webhooks';

/**
 * Job types for the outgoing webhook queue.
 */
export enum OutgoingWebhookJobType {
  /**
   * Job to dispatch a webhook to an external URL.
   */
  DISPATCH_WEBHOOK = 'DISPATCH_WEBHOOK',
}

/**
 * Job options for webhook dispatch.
 *
 * Configuration:
 * - 5 attempts total (initial + 4 retries)
 * - Exponential backoff starting at 5 seconds
 *   (5s, 10s, 20s, 40s between retries)
 */
const WEBHOOK_JOB_OPTIONS: Bull.JobOptions = {
  attempts: 5,
  backoff: {
    type: 'exponential',
    delay: 5000,
  },
  removeOnComplete: 100,
  removeOnFail: 100,
};

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
@singleton()
export class OutgoingWebhookQueue {
  private readonly queue: Bull.Queue<WebhookDispatchJobData>;

  constructor(
    @inject(OutgoingWebhookDispatcher)
    private readonly dispatcher: OutgoingWebhookDispatcher
  ) {
    this.queue = createQueue(OUTGOING_WEBHOOK_QUEUE_NAME);
    this.setupProcessor();
    this.setupEventListeners();
  }

  /**
   * Queue a webhook dispatch job.
   *
   * @param data - Webhook dispatch job data
   * @returns The job ID
   */
  async queueDispatch(data: WebhookDispatchJobData): Promise<string> {
    const job = await this.queue.add(OutgoingWebhookJobType.DISPATCH_WEBHOOK, data, {
      ...WEBHOOK_JOB_OPTIONS,
      // Use message ID + channel account for idempotency
      jobId: `webhook:${data.channelAccountId}:${data.payload.message.id}`,
    });

    logger.debug('Outgoing webhook queued', {
      jobId: job.id,
      event: data.payload.event,
      messageId: data.payload.message.id,
      channelAccountId: data.channelAccountId,
    });

    return String(job.id);
  }

  /**
   * Get queue statistics.
   *
   * @returns Queue job counts by status
   */
  async getQueueStats(): Promise<OutgoingWebhookQueueStats> {
    const counts = (await this.queue.getJobCounts()) as unknown as Record<string, number>;
    return {
      waiting: counts.waiting ?? 0,
      active: counts.active ?? 0,
      completed: counts.completed ?? 0,
      failed: counts.failed ?? 0,
      delayed: counts.delayed ?? 0,
      paused: counts.paused ?? 0,
    };
  }

  /**
   * Pause the queue - stops processing new jobs.
   */
  async pauseQueue(): Promise<void> {
    await this.queue.pause();
    logger.info('Outgoing webhook queue paused');
  }

  /**
   * Resume the queue - continues processing jobs.
   */
  async resumeQueue(): Promise<void> {
    await this.queue.resume();
    logger.info('Outgoing webhook queue resumed');
  }

  /**
   * Close the queue gracefully.
   */
  async closeQueue(): Promise<void> {
    await this.queue.close();
    logger.info('Outgoing webhook queue closed');
  }

  /**
   * Get the underlying Bull queue (for testing/monitoring).
   */
  getQueue(): Bull.Queue<WebhookDispatchJobData> {
    return this.queue;
  }

  /**
   * Setup the job processor.
   */
  private setupProcessor(): void {
    this.queue.process(
      OutgoingWebhookJobType.DISPATCH_WEBHOOK,
      async (job: Bull.Job<WebhookDispatchJobData>) => {
        await this.processDispatchJob(job);
      }
    );
  }

  /**
   * Process a webhook dispatch job.
   *
   * @throws Error to trigger Bull retry on failure
   */
  private async processDispatchJob(job: Bull.Job<WebhookDispatchJobData>): Promise<void> {
    const { webhookUrl, payload, secretEncrypted, secretIv, channelAccountId, tenantId } =
      job.data;

    logger.debug('Processing webhook dispatch job', {
      jobId: job.id,
      event: payload.event,
      messageId: payload.message.id,
      channelAccountId,
      attemptsMade: job.attemptsMade,
    });

    const result = await this.dispatcher.dispatch(
      webhookUrl,
      payload,
      secretEncrypted,
      secretIv
    );

    if (!result.success) {
      // Determine if we should retry
      const shouldRetry = this.isRetryableError(result);

      if (shouldRetry) {
        logger.warn('Webhook dispatch failed, will retry', {
          jobId: job.id,
          event: payload.event,
          messageId: payload.message.id,
          channelAccountId,
          attemptsMade: job.attemptsMade,
          statusCode: result.statusCode,
          error: result.error,
        });

        // Throw to trigger Bull retry
        throw new Error(result.error || 'Webhook dispatch failed');
      }

      // Non-retryable error - log and complete (don't retry)
      logger.error('Webhook dispatch failed permanently (non-retryable)', {
        jobId: job.id,
        event: payload.event,
        messageId: payload.message.id,
        channelAccountId,
        statusCode: result.statusCode,
        error: result.error,
      });

      auditLogger.info('Outgoing webhook failed', {
        action: 'outgoing_webhook.dispatch.failed',
        tenantId,
        channelAccountId,
        messageId: payload.message.id,
        conversationId: payload.conversation.id,
        statusCode: result.statusCode,
        error: result.error,
        retryable: false,
      });

      return;
    }

    // Success
    auditLogger.info('Outgoing webhook dispatched', {
      action: 'outgoing_webhook.dispatch.success',
      tenantId,
      channelAccountId,
      messageId: payload.message.id,
      conversationId: payload.conversation.id,
      statusCode: result.statusCode,
    });
  }

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
  private isRetryableError(result: { success: boolean; statusCode?: number; error?: string }): boolean {
    // Network errors are retryable
    if (!result.statusCode) {
      const error = result.error?.toLowerCase() || '';
      // Connection issues are retryable
      if (error.includes('timeout') || error.includes('network') || error.includes('econnrefused')) {
        return true;
      }
      // Decryption or other internal errors are not retryable
      return false;
    }

    // 5xx server errors are retryable
    if (result.statusCode >= 500) {
      return true;
    }

    // 429 Too Many Requests is retryable
    if (result.statusCode === 429) {
      return true;
    }

    // 4xx client errors are not retryable
    return false;
  }

  /**
   * Setup event listeners for queue events.
   */
  private setupEventListeners(): void {
    this.queue.on('error', (error) => {
      logger.error('Outgoing webhook queue error', {
        error: error.message,
        stack: error.stack,
      });
    });

    this.queue.on('failed', (job, error) => {
      const data = job.data;
      const isMaxRetries = job.attemptsMade >= (WEBHOOK_JOB_OPTIONS.attempts || 5);

      if (isMaxRetries) {
        logger.error('Outgoing webhook failed after max retries', {
          jobId: job.id,
          event: data.payload.event,
          messageId: data.payload.message.id,
          channelAccountId: data.channelAccountId,
          attemptsMade: job.attemptsMade,
          error: error.message,
        });

        auditLogger.info('Outgoing webhook exhausted retries', {
          action: 'outgoing_webhook.dispatch.exhausted',
          tenantId: data.tenantId,
          channelAccountId: data.channelAccountId,
          messageId: data.payload.message.id,
          conversationId: data.payload.conversation.id,
          attemptsMade: job.attemptsMade,
          error: error.message,
        });
      }
    });

    this.queue.on('completed', (job) => {
      logger.debug('Outgoing webhook job completed', {
        jobId: job.id,
        event: job.data.payload.event,
        messageId: job.data.payload.message.id,
      });
    });

    this.queue.on('stalled', (job) => {
      logger.warn('Outgoing webhook job stalled', {
        jobId: job.id,
        event: job.data.payload.event,
        messageId: job.data.payload.message.id,
        channelAccountId: job.data.channelAccountId,
      });
    });
  }
}
