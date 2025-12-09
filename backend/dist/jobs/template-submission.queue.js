"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TemplateSubmissionQueue = exports.TEMPLATE_SUBMISSION_JOB = void 0;
const tsyringe_1 = require("tsyringe");
const bull_config_1 = require("../config/bull.config");
const template_submission_service_1 = require("../features/templates/services/template-submission.service");
const logger_config_1 = require("../config/logger.config");
/**
 * Job type for template submission to Meta.
 */
exports.TEMPLATE_SUBMISSION_JOB = 'SUBMIT_TEMPLATE';
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
let TemplateSubmissionQueue = class TemplateSubmissionQueue {
    submissionService;
    queue;
    constructor(submissionService) {
        this.submissionService = submissionService;
        this.queue = (0, bull_config_1.createQueue)('template-submission');
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
    async queueSubmission(data) {
        await this.queue.add(exports.TEMPLATE_SUBMISSION_JOB, data, {
            // Prevent duplicate submissions for the same translation
            jobId: `submit-${data.translationId}`,
        });
        logger_config_1.logger.info('Template submission queued', {
            tenantId: data.tenantId,
            templateGroupId: data.templateGroupId,
            translationId: data.translationId,
        });
    }
    /**
     * Close the queue gracefully.
     * Should be called during application shutdown.
     */
    async closeQueue() {
        await this.queue.close();
        logger_config_1.logger.info('Template submission queue closed');
    }
    /**
     * Get the underlying Bull queue.
     * Exposed for testing and monitoring purposes.
     *
     * @returns The Bull queue instance
     */
    getQueue() {
        return this.queue;
    }
    /**
     * Setup job processors for template submission.
     */
    setupProcessors() {
        this.queue.process(exports.TEMPLATE_SUBMISSION_JOB, bull_config_1.BULL_CONFIG.templateSubmission.concurrency, async (job) => {
            await this.processSubmission(job);
        });
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
    async processSubmission(job) {
        const { tenantId, templateGroupId, translationId } = job.data;
        logger_config_1.logger.info('Processing template submission job', {
            jobId: job.id,
            attempt: job.attemptsMade + 1,
            tenantId,
            templateGroupId,
            translationId,
        });
        const result = await this.submissionService.submitTemplate(tenantId, templateGroupId, translationId);
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
    setupEventListeners() {
        this.queue.on('error', (error) => {
            logger_config_1.logger.error('Template submission queue error', {
                error: error.message,
                stack: error.stack,
            });
        });
        this.queue.on('failed', (job, error) => {
            const data = job.data;
            logger_config_1.logger.error('Template submission job failed', {
                jobId: job.id,
                translationId: data.translationId,
                templateGroupId: data.templateGroupId,
                tenantId: data.tenantId,
                error: error.message,
                attemptsMade: job.attemptsMade,
            });
        });
        this.queue.on('completed', (job) => {
            const data = job.data;
            logger_config_1.logger.debug('Template submission job completed', {
                jobId: job.id,
                translationId: data.translationId,
            });
        });
        this.queue.on('stalled', (job) => {
            const data = job.data;
            logger_config_1.logger.warn('Template submission job stalled', {
                jobId: job.id,
                translationId: data.translationId,
                templateGroupId: data.templateGroupId,
                tenantId: data.tenantId,
            });
        });
    }
};
exports.TemplateSubmissionQueue = TemplateSubmissionQueue;
exports.TemplateSubmissionQueue = TemplateSubmissionQueue = __decorate([
    (0, tsyringe_1.singleton)(),
    __param(0, (0, tsyringe_1.inject)(template_submission_service_1.TemplateSubmissionService)),
    __metadata("design:paramtypes", [template_submission_service_1.TemplateSubmissionService])
], TemplateSubmissionQueue);
