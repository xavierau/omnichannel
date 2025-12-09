import Bull from 'bull';
import { TemplateSubmissionService } from '../features/templates/services/template-submission.service';
import { ITemplateSubmissionQueue } from './interfaces/template-submission-queue.interface';
/**
 * Job type for template submission to Meta.
 */
export declare const TEMPLATE_SUBMISSION_JOB = "SUBMIT_TEMPLATE";
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
export declare class TemplateSubmissionQueue implements ITemplateSubmissionQueue {
    private submissionService;
    private queue;
    constructor(submissionService: TemplateSubmissionService);
    /**
     * Queue a template translation for submission to Meta.
     *
     * Uses the translation ID as part of the job ID to prevent duplicate
     * submissions for the same translation. If a job for this translation
     * already exists and is pending, the new job will be rejected.
     *
     * @param data - Template submission job data
     */
    queueSubmission(data: TemplateSubmissionJobData): Promise<void>;
    /**
     * Close the queue gracefully.
     * Should be called during application shutdown.
     */
    closeQueue(): Promise<void>;
    /**
     * Get the underlying Bull queue.
     * Exposed for testing and monitoring purposes.
     *
     * @returns The Bull queue instance
     */
    getQueue(): Bull.Queue;
    /**
     * Setup job processors for template submission.
     */
    private setupProcessors;
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
    private processSubmission;
    /**
     * Setup event listeners for queue monitoring and logging.
     */
    private setupEventListeners;
}
