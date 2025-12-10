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
exports.OutgoingWebhookQueue = exports.OutgoingWebhookJobType = exports.OUTGOING_WEBHOOK_QUEUE_NAME = void 0;
const tsyringe_1 = require("tsyringe");
const bull_config_1 = require("../config/bull.config");
const outgoing_webhook_dispatcher_1 = require("../features/outgoing-webhooks/infrastructure/outgoing-webhook.dispatcher");
const logger_config_1 = require("../config/logger.config");
/**
 * Queue name for outgoing webhooks.
 */
exports.OUTGOING_WEBHOOK_QUEUE_NAME = 'outgoing-webhooks';
/**
 * Job types for the outgoing webhook queue.
 */
var OutgoingWebhookJobType;
(function (OutgoingWebhookJobType) {
    /**
     * Job to dispatch a webhook to an external URL.
     */
    OutgoingWebhookJobType["DISPATCH_WEBHOOK"] = "DISPATCH_WEBHOOK";
})(OutgoingWebhookJobType || (exports.OutgoingWebhookJobType = OutgoingWebhookJobType = {}));
/**
 * Job options for webhook dispatch.
 *
 * Configuration:
 * - 5 attempts total (initial + 4 retries)
 * - Exponential backoff starting at 5 seconds
 *   (5s, 10s, 20s, 40s between retries)
 */
const WEBHOOK_JOB_OPTIONS = {
    attempts: 5,
    backoff: {
        type: 'exponential',
        delay: 5000,
    },
    removeOnComplete: 100,
    removeOnFail: 100,
};
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
let OutgoingWebhookQueue = class OutgoingWebhookQueue {
    dispatcher;
    queue;
    constructor(dispatcher) {
        this.dispatcher = dispatcher;
        this.queue = (0, bull_config_1.createQueue)(exports.OUTGOING_WEBHOOK_QUEUE_NAME);
        this.setupProcessor();
        this.setupEventListeners();
    }
    /**
     * Queue a webhook dispatch job.
     *
     * @param data - Webhook dispatch job data
     * @returns The job ID
     */
    async queueDispatch(data) {
        const job = await this.queue.add(OutgoingWebhookJobType.DISPATCH_WEBHOOK, data, {
            ...WEBHOOK_JOB_OPTIONS,
            // Use message ID + channel account for idempotency
            jobId: `webhook:${data.channelAccountId}:${data.payload.message.id}`,
        });
        logger_config_1.logger.debug('Outgoing webhook queued', {
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
    async getQueueStats() {
        const counts = (await this.queue.getJobCounts());
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
    async pauseQueue() {
        await this.queue.pause();
        logger_config_1.logger.info('Outgoing webhook queue paused');
    }
    /**
     * Resume the queue - continues processing jobs.
     */
    async resumeQueue() {
        await this.queue.resume();
        logger_config_1.logger.info('Outgoing webhook queue resumed');
    }
    /**
     * Close the queue gracefully.
     */
    async closeQueue() {
        await this.queue.close();
        logger_config_1.logger.info('Outgoing webhook queue closed');
    }
    /**
     * Get the underlying Bull queue (for testing/monitoring).
     */
    getQueue() {
        return this.queue;
    }
    /**
     * Setup the job processor.
     */
    setupProcessor() {
        this.queue.process(OutgoingWebhookJobType.DISPATCH_WEBHOOK, async (job) => {
            await this.processDispatchJob(job);
        });
    }
    /**
     * Process a webhook dispatch job.
     *
     * @throws Error to trigger Bull retry on failure
     */
    async processDispatchJob(job) {
        const { webhookUrl, payload, secretEncrypted, secretIv, channelAccountId, tenantId } = job.data;
        logger_config_1.logger.debug('Processing webhook dispatch job', {
            jobId: job.id,
            event: payload.event,
            messageId: payload.message.id,
            channelAccountId,
            attemptsMade: job.attemptsMade,
        });
        const result = await this.dispatcher.dispatch(webhookUrl, payload, secretEncrypted, secretIv);
        if (!result.success) {
            // Determine if we should retry
            const shouldRetry = this.isRetryableError(result);
            if (shouldRetry) {
                logger_config_1.logger.warn('Webhook dispatch failed, will retry', {
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
            logger_config_1.logger.error('Webhook dispatch failed permanently (non-retryable)', {
                jobId: job.id,
                event: payload.event,
                messageId: payload.message.id,
                channelAccountId,
                statusCode: result.statusCode,
                error: result.error,
            });
            logger_config_1.auditLogger.info('Outgoing webhook failed', {
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
        logger_config_1.auditLogger.info('Outgoing webhook dispatched', {
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
    isRetryableError(result) {
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
    setupEventListeners() {
        this.queue.on('error', (error) => {
            logger_config_1.logger.error('Outgoing webhook queue error', {
                error: error.message,
                stack: error.stack,
            });
        });
        this.queue.on('failed', (job, error) => {
            const data = job.data;
            const isMaxRetries = job.attemptsMade >= (WEBHOOK_JOB_OPTIONS.attempts || 5);
            if (isMaxRetries) {
                logger_config_1.logger.error('Outgoing webhook failed after max retries', {
                    jobId: job.id,
                    event: data.payload.event,
                    messageId: data.payload.message.id,
                    channelAccountId: data.channelAccountId,
                    attemptsMade: job.attemptsMade,
                    error: error.message,
                });
                logger_config_1.auditLogger.info('Outgoing webhook exhausted retries', {
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
            logger_config_1.logger.debug('Outgoing webhook job completed', {
                jobId: job.id,
                event: job.data.payload.event,
                messageId: job.data.payload.message.id,
            });
        });
        this.queue.on('stalled', (job) => {
            logger_config_1.logger.warn('Outgoing webhook job stalled', {
                jobId: job.id,
                event: job.data.payload.event,
                messageId: job.data.payload.message.id,
                channelAccountId: job.data.channelAccountId,
            });
        });
    }
};
exports.OutgoingWebhookQueue = OutgoingWebhookQueue;
exports.OutgoingWebhookQueue = OutgoingWebhookQueue = __decorate([
    (0, tsyringe_1.singleton)(),
    __param(0, (0, tsyringe_1.inject)(outgoing_webhook_dispatcher_1.OutgoingWebhookDispatcher)),
    __metadata("design:paramtypes", [outgoing_webhook_dispatcher_1.OutgoingWebhookDispatcher])
], OutgoingWebhookQueue);
