import { singleton, inject } from 'tsyringe';
import Bull from 'bull';
import { createQueue, BULL_CONFIG } from '../config/bull.config';
import { TemplateSubmissionService } from '../features/templates/services/template-submission.service';
import { logger } from '../config/logger.config';
import { ITemplateSubmissionQueue } from './interfaces/template-submission-queue.interface';

/**
 * Job type for template submission to Meta.
 */
export const TEMPLATE_SUBMISSION_JOB = 'SUBMIT_TEMPLATE';

/**
 * Job data for template submission.
 * Contains all information needed to submit a template translation to Meta.
 */
export interface TemplateSubmissionJobData {
  /** Tenant ID for multi-tenancy isolation */
  tenantId: string;
  /** Template group ID containing the translation */
  templateGroupId: string;
  /** Translation ID to submit */
  translationId: string;
}

/**
 * Service for managing Bull queue operations for template submissions to Meta.
 *
 * Handles:
 * - Queuing template submissions for async processing
 * - Preventing duplicate submissions via job ID deduplication
 * - Automatic retries with exponential backoff for retryable errors
 * - Error handling with proper logging
 *
 * @remarks
 * Configuration:
 * - attempts: 3 (from BULL_CONFIG.defaultJobOptions)
 * - backoff: exponential with 1s base delay (1s, 2s, 4s)
 * - concurrency: configurable via BULL_CONFIG.concurrency
 * - Job ID format: submit-{translationId} for idempotency
 */
@singleton()
export class TemplateSubmissionQueue implements ITemplateSubmissionQueue {
  private queue: Bull.Queue;

  constructor(
    @inject(TemplateSubmissionService) private submissionService: TemplateSubmissionService
  ) {
    this.queue = createQueue('template-submission');
    this.setupProcessors();
    this.setupEventListeners();
  }

  /**
   * Queue a template translation for submission to Meta.
   *
   * Uses the translation ID as part of the job ID to prevent duplicate
   * submissions for the same translation. If a job for this translation
   * already exists and is pending, the new job will be rejected.
   *
   * @param data - Template submission job data
   */
  async queueSubmission(data: TemplateSubmissionJobData): Promise<void> {
    await this.queue.add(TEMPLATE_SUBMISSION_JOB, data, {
      // Prevent duplicate submissions for the same translation
      jobId: `submit-${data.translationId}`,
    });

    logger.info('Template submission queued', {
      tenantId: data.tenantId,
      templateGroupId: data.templateGroupId,
      translationId: data.translationId,
    });
  }

  /**
   * Close the queue gracefully.
   * Should be called during application shutdown.
   */
  async closeQueue(): Promise<void> {
    await this.queue.close();
    logger.info('Template submission queue closed');
  }

  /**
   * Get the underlying Bull queue.
   * Exposed for testing and monitoring purposes.
   *
   * @returns The Bull queue instance
   */
  getQueue(): Bull.Queue {
    return this.queue;
  }

  /**
   * Setup job processors for template submission.
   */
  private setupProcessors(): void {
    this.queue.process(
      TEMPLATE_SUBMISSION_JOB,
      BULL_CONFIG.templateSubmission.concurrency,
      async (job: Bull.Job<TemplateSubmissionJobData>) => {
        await this.processSubmission(job);
      }
    );
  }

  /**
   * Process a single template submission job.
   *
   * Delegates to TemplateSubmissionService for actual submission logic.
   * Handles retryable errors by throwing to trigger Bull's retry mechanism.
   * Non-retryable errors are handled by the service (status set to REJECTED).
   *
   * @param job - Bull job containing submission data
   * @throws Error for retryable failures to trigger Bull retry
   */
  private async processSubmission(
    job: Bull.Job<TemplateSubmissionJobData>
  ): Promise<void> {
    const { tenantId, templateGroupId, translationId } = job.data;

    logger.info('Processing template submission job', {
      jobId: job.id,
      attempt: job.attemptsMade + 1,
      tenantId,
      templateGroupId,
      translationId,
    });

    const result = await this.submissionService.submitTemplate(
      tenantId,
      templateGroupId,
      translationId
    );

    if (!result.success && result.error?.retryable) {
      // Throw to trigger Bull retry with exponential backoff
      throw new Error(result.error.message);
    }

    // Non-retryable errors are already handled by TemplateSubmissionService
    // (status set to REJECTED, SSE emitted)
  }

  /**
   * Setup event listeners for queue monitoring and logging.
   */
  private setupEventListeners(): void {
    this.queue.on('error', (error) => {
      logger.error('Template submission queue error', {
        error: error.message,
        stack: error.stack,
      });
    });

    this.queue.on('failed', (job, error) => {
      const data = job.data as TemplateSubmissionJobData;
      logger.error('Template submission job failed', {
        jobId: job.id,
        translationId: data.translationId,
        templateGroupId: data.templateGroupId,
        tenantId: data.tenantId,
        error: error.message,
        attemptsMade: job.attemptsMade,
      });
    });

    this.queue.on('completed', (job) => {
      const data = job.data as TemplateSubmissionJobData;
      logger.debug('Template submission job completed', {
        jobId: job.id,
        translationId: data.translationId,
      });
    });

    this.queue.on('stalled', (job) => {
      const data = job.data as TemplateSubmissionJobData;
      logger.warn('Template submission job stalled', {
        jobId: job.id,
        translationId: data.translationId,
        templateGroupId: data.templateGroupId,
        tenantId: data.tenantId,
      });
    });
  }
}
