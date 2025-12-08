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
exports.BroadcastQueue = exports.JobType = void 0;
const tsyringe_1 = require("tsyringe");
const bull_config_1 = require("../config/bull.config");
const broadcast_repository_1 = require("../features/broadcasts/broadcast.repository");
const broadcast_sse_service_1 = require("../features/broadcasts/broadcast-sse.service");
const group_repository_1 = require("../features/groups/group.repository");
const customer_repository_1 = require("../features/customers/customer.repository");
const messaging_service_1 = require("../features/messaging/services/messaging.service");
const rate_limiter_service_1 = require("../features/messaging/services/rate-limiter.service");
const channel_account_repository_1 = require("../features/channel-accounts/channel-account.repository");
const logger_config_1 = require("../config/logger.config");
const enums_1 = require("../features/broadcasts/enums");
const http_exceptions_1 = require("../shared/exceptions/http-exceptions");
/**
 * Maximum number of group members to process in a single batch.
 * This prevents memory exhaustion for very large groups.
 */
const MAX_GROUP_BATCH_SIZE = 1000;
/**
 * Timeout for acquiring a rate limit token in milliseconds.
 * If a token cannot be acquired within this time, the job will be retried.
 */
const RATE_LIMIT_TOKEN_TIMEOUT_MS = 10000;
/**
 * Custom error codes for rate limit handling.
 */
const RATE_LIMIT_ERROR_CODES = {
    BACKOFF: 'RATE_LIMIT_BACKOFF',
    TIMEOUT: 'RATE_LIMIT_TIMEOUT',
    ERROR: 'RATE_LIMIT_ERROR',
};
/**
 * Masks a phone number for logging purposes to protect PII.
 * Shows only the last 4 digits.
 *
 * @param phone - The phone number to mask
 * @returns Masked phone number (e.g., "+1****7890")
 */
function maskPhoneNumber(phone) {
    if (!phone || phone.length < 4) {
        return '****';
    }
    const visibleDigits = phone.slice(-4);
    const maskedPart = '*'.repeat(Math.max(0, phone.length - 4));
    return maskedPart + visibleDigits;
}
/**
 * Sanitizes a customer field value for safe template substitution.
 * Prevents potential injection attacks and ensures safe string conversion.
 *
 * @param value - The raw field value
 * @returns Sanitized string value
 */
function sanitizeFieldValue(value) {
    if (value === undefined || value === null) {
        return '';
    }
    // Convert to string
    const strValue = String(value);
    // Remove potentially dangerous characters for template injection
    // Strip control characters and null bytes
    const sanitized = strValue
        // eslint-disable-next-line no-control-regex
        .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
        .replace(/\{\{/g, '') // Remove template syntax that could cause injection
        .replace(/\}\}/g, '')
        .trim();
    // Limit length to prevent excessively long values
    const MAX_FIELD_LENGTH = 1000;
    return sanitized.slice(0, MAX_FIELD_LENGTH);
}
/**
 * Job types for the broadcast queue.
 */
var JobType;
(function (JobType) {
    /**
     * Main job to orchestrate broadcast sending.
     * Resolves recipients and creates individual PROCESS_RECIPIENT jobs.
     */
    JobType["SEND_BROADCAST"] = "SEND_BROADCAST";
    /**
     * Job to process a single recipient.
     * Simulates sending a WhatsApp message and updates metrics.
     */
    JobType["PROCESS_RECIPIENT"] = "PROCESS_RECIPIENT";
})(JobType || (exports.JobType = JobType = {}));
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
let BroadcastQueue = class BroadcastQueue {
    broadcastRepository;
    sseService;
    groupRepository;
    customerRepository;
    messagingService;
    channelAccountRepository;
    rateLimiterService;
    queue;
    constructor(broadcastRepository, sseService, groupRepository, customerRepository, messagingService, channelAccountRepository, rateLimiterService) {
        this.broadcastRepository = broadcastRepository;
        this.sseService = sseService;
        this.groupRepository = groupRepository;
        this.customerRepository = customerRepository;
        this.messagingService = messagingService;
        this.channelAccountRepository = channelAccountRepository;
        this.rateLimiterService = rateLimiterService;
        this.queue = (0, bull_config_1.createQueue)('broadcasts');
        this.setupProcessors();
        this.setupEventListeners();
    }
    /**
     * Schedule a broadcast to be sent at a specific time.
     *
     * @param broadcastId - The broadcast ID
     * @param tenantId - The tenant ID
     * @param scheduledAt - When to send the broadcast
     * @throws Error if scheduledAt is in the past
     */
    async scheduleBroadcast(broadcastId, tenantId, scheduledAt) {
        const delay = scheduledAt.getTime() - Date.now();
        if (delay <= 0) {
            throw new Error('Scheduled time must be in the future');
        }
        await this.queue.add(JobType.SEND_BROADCAST, { broadcastId, tenantId }, {
            delay,
            jobId: `broadcast:${broadcastId}`,
        });
        logger_config_1.logger.info('Broadcast scheduled', {
            broadcastId,
            tenantId,
            scheduledAt: scheduledAt.toISOString(),
            delayMs: delay,
        });
    }
    /**
     * Add a broadcast to the queue for immediate processing.
     *
     * @param broadcastId - The broadcast ID
     * @param tenantId - The tenant ID
     */
    async sendBroadcastNow(broadcastId, tenantId) {
        await this.queue.add(JobType.SEND_BROADCAST, { broadcastId, tenantId }, {
            jobId: `broadcast:${broadcastId}`,
        });
        logger_config_1.logger.info('Broadcast queued for immediate sending', {
            broadcastId,
            tenantId,
        });
    }
    /**
     * Cancel a scheduled broadcast job.
     *
     * @param broadcastId - The broadcast ID
     * @returns True if the job was removed
     */
    async cancelScheduledBroadcast(broadcastId) {
        await this.queue.removeJobs(`broadcast:${broadcastId}`);
        logger_config_1.logger.info('Scheduled broadcast cancelled', { broadcastId });
        return true;
    }
    /**
     * Pause the queue - stops processing new jobs.
     */
    async pauseQueue() {
        await this.queue.pause();
        logger_config_1.logger.info('Broadcast queue paused');
    }
    /**
     * Resume the queue - continues processing jobs.
     */
    async resumeQueue() {
        await this.queue.resume();
        logger_config_1.logger.info('Broadcast queue resumed');
    }
    /**
     * Get queue statistics.
     *
     * @returns Queue job counts by status
     */
    async getQueueStats() {
        const counts = await this.queue.getJobCounts();
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
     * Close the queue gracefully.
     */
    async closeQueue() {
        await this.queue.close();
        logger_config_1.logger.info('Broadcast queue closed');
    }
    /**
     * Check for scheduled broadcasts that should start processing.
     * Called periodically by the scheduler.
     */
    async checkScheduledBroadcasts() {
        const now = new Date();
        const broadcasts = await this.broadcastRepository.findScheduledBroadcasts(now);
        for (const broadcast of broadcasts) {
            await this.sendBroadcastNow(broadcast.id, broadcast.tenantId);
            logger_config_1.logger.info('Scheduled broadcast enqueued', {
                broadcastId: broadcast.id,
                tenantId: broadcast.tenantId,
                scheduledAt: broadcast.scheduledAt?.toISOString(),
            });
        }
    }
    /**
     * Get the underlying Bull queue (for testing/monitoring).
     */
    getQueue() {
        return this.queue;
    }
    /**
     * Setup job processors for different job types.
     */
    setupProcessors() {
        // Process SEND_BROADCAST jobs - orchestrates the broadcast
        this.queue.process(JobType.SEND_BROADCAST, bull_config_1.BULL_CONFIG.concurrency, async (job) => {
            await this.processSendBroadcast(job);
        });
        // Process individual recipients
        this.queue.process(JobType.PROCESS_RECIPIENT, bull_config_1.BULL_CONFIG.concurrency, async (job) => {
            await this.processRecipient(job);
        });
    }
    /**
     * Process the main SEND_BROADCAST job.
     * Resolves recipients and creates individual processing jobs.
     */
    async processSendBroadcast(job) {
        const { broadcastId, tenantId } = job.data;
        logger_config_1.logger.info('Processing SEND_BROADCAST job', {
            jobId: job.id,
            broadcastId,
            tenantId,
        });
        // Load broadcast
        const broadcast = await this.broadcastRepository.findById(tenantId, broadcastId);
        if (!broadcast) {
            throw new Error(`Broadcast not found: ${broadcastId}`);
        }
        // Check if broadcast is in a valid state to process
        if (broadcast.status === enums_1.BroadcastStatus.PAUSED ||
            broadcast.status === enums_1.BroadcastStatus.CANCELLED) {
            logger_config_1.logger.info('Broadcast processing skipped - invalid status', {
                broadcastId,
                status: broadcast.status,
            });
            return;
        }
        // Validate channel account with tenant authorization
        let channelAccountId = broadcast.channelAccountId;
        if (!channelAccountId) {
            // If no channel account specified, get the primary WhatsApp channel account
            const primaryAccount = await this.channelAccountRepository.findPrimaryByTenantAndChannel(tenantId, 'whatsapp');
            if (!primaryAccount) {
                throw new Error('No channel account configured for broadcast. Please set a primary WhatsApp channel account.');
            }
            // Update broadcast with the primary channel account
            await this.broadcastRepository.update(broadcastId, tenantId, {
                channelAccountId: primaryAccount.id,
            });
            broadcast.channelAccountId = primaryAccount.id;
            channelAccountId = primaryAccount.id;
        }
        else {
            // CRITICAL: Validate that the explicit channel account belongs to this tenant
            const channelAccount = await this.channelAccountRepository.findByIdAndTenant(channelAccountId, tenantId);
            if (!channelAccount) {
                logger_config_1.logger.error('Channel account authorization failed', {
                    broadcastId,
                    tenantId,
                    channelAccountId,
                });
                throw new http_exceptions_1.ForbiddenException('Channel account does not exist or does not belong to this tenant');
            }
            if (!channelAccount.isActive) {
                throw new Error('Channel account is not active. Please configure an active channel account.');
            }
        }
        // Update status to SENDING if not already
        if (broadcast.status !== enums_1.BroadcastStatus.SENDING) {
            await this.broadcastRepository.update(broadcastId, tenantId, {
                status: enums_1.BroadcastStatus.SENDING,
                startedAt: new Date(),
            });
        }
        // Resolve recipients
        const customers = await this.resolveRecipients(tenantId, broadcast.recipientType, broadcast.groupId, broadcast.customerIds);
        if (customers.length === 0) {
            logger_config_1.logger.warn('No recipients found for broadcast', { broadcastId });
            await this.broadcastRepository.markCompleted(broadcastId, tenantId);
            return;
        }
        // Create individual recipient jobs with template info
        for (const customer of customers) {
            await this.queue.add(JobType.PROCESS_RECIPIENT, {
                broadcastId,
                tenantId,
                channelAccountId: broadcast.channelAccountId,
                templateName: broadcast.templateName,
                templateLanguage: broadcast.templateLanguage,
                templateVariables: broadcast.templateVariables,
                customerId: customer.id,
                customerPhone: customer.whatsappNumber,
                customerName: customer.name,
                customerFields: customer.customFields || {},
            }, {
                // Use unique job ID to prevent duplicates
                jobId: `recipient:${broadcastId}:${customer.id}`,
            });
        }
        // Emit initial progress
        this.emitProgress(broadcast);
        logger_config_1.auditLogger.info('Broadcast sending started', {
            action: 'broadcast.send_started',
            broadcastId,
            tenantId,
            totalRecipients: customers.length,
        });
    }
    /**
     * Process a single recipient.
     * Sends template message via the configured provider.
     *
     * Implements rate limiting to prevent hitting Meta's API limits:
     * 1. Check if channel account is in backoff period
     * 2. Acquire rate limit token before sending
     * 3. Handle rate limit errors from provider with backoff
     */
    async processRecipient(job) {
        const { broadcastId, tenantId, channelAccountId, templateName, templateLanguage, templateVariables, customerId, customerPhone, customerFields, } = job.data;
        // FIXED: Mask phone number in logs to protect PII
        logger_config_1.logger.debug('Processing recipient', {
            jobId: job.id,
            broadcastId,
            customerId,
            customerPhone: maskPhoneNumber(customerPhone),
            channelAccountId,
        });
        // Step 1: Check if channel account is in backoff period from previous rate limit errors
        const isInBackoff = await this.rateLimiterService.isInBackoff(channelAccountId);
        if (isInBackoff) {
            logger_config_1.logger.debug('Channel account in rate limit backoff, retrying later', {
                broadcastId,
                channelAccountId,
                customerId,
            });
            // Throw to trigger Bull retry with exponential backoff
            throw new Error(RATE_LIMIT_ERROR_CODES.BACKOFF);
        }
        // Step 2: Acquire rate limit token before sending
        // This implements sliding window rate limiting to stay under Meta's 80 msg/sec limit
        const tokenAcquired = await this.rateLimiterService.acquireToken(channelAccountId, RATE_LIMIT_TOKEN_TIMEOUT_MS);
        if (!tokenAcquired) {
            logger_config_1.logger.warn('Failed to acquire rate limit token', {
                broadcastId,
                channelAccountId,
                customerId,
                timeoutMs: RATE_LIMIT_TOKEN_TIMEOUT_MS,
            });
            // Throw to trigger Bull retry
            throw new Error(RATE_LIMIT_ERROR_CODES.TIMEOUT);
        }
        // Build template variables with customer field substitution
        const resolvedVariables = this.resolveTemplateVariables(templateVariables, customerFields);
        // Send message via MessagingService
        let result;
        try {
            result = await this.messagingService.sendTemplateMessage({
                tenantId,
                channelAccountId,
                recipient: customerPhone,
                templateName,
                language: templateLanguage,
                variables: resolvedVariables,
                broadcastId,
                customerId,
            });
        }
        catch (error) {
            // Step 3: Check if this is a rate limit error from the provider
            if (this.rateLimiterService.isRateLimitError(error)) {
                const retryAfter = this.rateLimiterService.extractRetryAfter(error);
                await this.rateLimiterService.handleRateLimitError(channelAccountId, retryAfter);
                logger_config_1.logger.warn('Provider rate limit error, applying backoff', {
                    broadcastId,
                    channelAccountId,
                    customerId,
                    retryAfterSeconds: retryAfter,
                });
                // Throw to trigger Bull retry
                throw new Error(RATE_LIMIT_ERROR_CODES.ERROR);
            }
            // Re-throw non-rate-limit errors
            throw error;
        }
        if (result.success) {
            // Increment sent count
            await this.broadcastRepository.incrementMetric(broadcastId, 'sentCount', 1);
            logger_config_1.logger.debug('Message sent successfully', {
                broadcastId,
                customerId,
                messageLogId: result.messageLogId,
                providerMessageId: result.providerMessageId,
            });
        }
        else {
            // Check if the error response indicates a rate limit
            if (result.error && this.isRateLimitErrorCode(result.error.code)) {
                await this.rateLimiterService.handleRateLimitError(channelAccountId);
                throw new Error(RATE_LIMIT_ERROR_CODES.ERROR);
            }
            // Increment failed count for non-rate-limit errors
            await this.broadcastRepository.incrementMetric(broadcastId, 'failedCount', 1);
            logger_config_1.logger.warn('Message send failed', {
                broadcastId,
                customerId,
                messageLogId: result.messageLogId,
                error: result.error,
            });
        }
        // Check if all recipients have been processed using atomic operation
        // This prevents race conditions from concurrent workers
        const completionResult = await this.broadcastRepository.markCompletedAtomic(broadcastId, tenantId);
        // Always fetch the latest broadcast state for progress emission
        const broadcast = await this.broadcastRepository.findById(tenantId, broadcastId);
        if (broadcast) {
            // Emit progress update
            this.emitProgress(broadcast);
            // If this worker successfully marked the broadcast as completed, log it
            if (completionResult.wasUpdated) {
                logger_config_1.auditLogger.info('Broadcast completed', {
                    action: 'broadcast.completed',
                    broadcastId,
                    tenantId,
                    sentCount: broadcast.sentCount,
                    failedCount: broadcast.failedCount,
                });
            }
        }
    }
    /**
     * Check if an error code indicates a rate limit error from Meta.
     */
    isRateLimitErrorCode(code) {
        const rateLimitCodes = ['4', '17', '341', '368'];
        return rateLimitCodes.includes(code);
    }
    /**
     * Resolve recipients based on recipient type.
     * Uses batch operations to prevent N+1 queries.
     * Implements pagination for large groups to prevent memory exhaustion.
     */
    async resolveRecipients(tenantId, recipientType, groupId, customerIds) {
        if (recipientType === enums_1.RecipientType.GROUP && groupId) {
            // Get all members from the group with pagination to handle large groups
            const allCustomers = [];
            let page = 1;
            let hasMore = true;
            while (hasMore) {
                const result = await this.groupRepository.getMembers(tenantId, groupId, page, MAX_GROUP_BATCH_SIZE);
                allCustomers.push(...result.data);
                // Check if there are more pages
                hasMore = page < result.totalPages;
                page++;
                // Safety limit to prevent infinite loops
                if (page > 1000) {
                    logger_config_1.logger.warn('Group pagination limit reached', {
                        groupId,
                        tenantId,
                        pagesProcessed: page - 1,
                        totalCustomers: allCustomers.length,
                    });
                    break;
                }
            }
            return allCustomers;
        }
        if (recipientType === enums_1.RecipientType.CUSTOMERS && customerIds) {
            // FIXED: Batch lookup to prevent N+1 queries
            // Previously this was doing individual lookups in a loop
            if (customerIds.length === 0) {
                return [];
            }
            return this.customerRepository.findByIds(customerIds, tenantId);
        }
        return [];
    }
    /**
     * Resolve template variables by substituting customer fields.
     *
     * @param config - Template variables configuration from broadcast
     * @param customerFields - Customer's custom fields
     * @returns Resolved template variables for the messaging provider
     */
    resolveTemplateVariables(config, customerFields) {
        const result = {
            body: [],
        };
        // Resolve header variables
        if (config.header) {
            if (config.header.type === 'text' && config.header.textVariable) {
                result.header = [this.resolveVariable(config.header.textVariable, customerFields)];
            }
            else if (config.header.mediaUrl) {
                // For media headers, pass the URL
                result.header = [{ type: config.header.type, value: config.header.mediaUrl }];
            }
        }
        // Resolve body variables
        if (config.bodyVariables && config.bodyVariables.length > 0) {
            result.body = config.bodyVariables
                .sort((a, b) => a.index - b.index)
                .map((v) => this.resolveVariable(v, customerFields));
        }
        // Resolve button variables
        if (config.buttonVariables && config.buttonVariables.length > 0) {
            result.buttons = config.buttonVariables.map((btn) => ({
                index: btn.buttonIndex,
                subType: 'url',
                parameters: [this.resolveVariable(btn.variable, customerFields)],
            }));
        }
        return result;
    }
    /**
     * Resolve a single variable configuration.
     * Applies sanitization to customer field values to prevent injection attacks.
     *
     * @param config - Variable configuration
     * @param customerFields - Customer's custom fields
     * @returns Resolved variable value
     */
    resolveVariable(config, customerFields) {
        if (config.sourceType === 'static') {
            // Static values are presumed safe as they come from admin configuration
            return { type: 'text', value: config.staticValue || '' };
        }
        if (config.sourceType === 'customer_field' && config.customerField) {
            const fieldValue = customerFields[config.customerField];
            // FIXED: Sanitize customer field values before template substitution
            // This prevents potential injection attacks from user-controlled data
            const value = sanitizeFieldValue(fieldValue);
            return { type: 'text', value };
        }
        return { type: 'text', value: '' };
    }
    /**
     * Emit progress update via SSE.
     */
    emitProgress(broadcast) {
        const event = {
            broadcastId: broadcast.id,
            status: broadcast.status,
            sentCount: broadcast.sentCount,
            deliveredCount: broadcast.deliveredCount,
            readCount: broadcast.readCount,
            failedCount: broadcast.failedCount,
            totalRecipients: broadcast.totalRecipients,
            completedAt: broadcast.completedAt || undefined,
        };
        this.sseService.emitProgress(event);
    }
    /**
     * Setup event listeners for queue events.
     */
    setupEventListeners() {
        this.queue.on('error', (error) => {
            logger_config_1.logger.error('Queue error', { error: error.message, stack: error.stack });
        });
        this.queue.on('failed', (job, error) => {
            logger_config_1.logger.error('Job failed', {
                jobId: job.id,
                jobType: job.name,
                error: error.message,
                attemptsMade: job.attemptsMade,
                data: job.data,
            });
            // If this was a recipient processing job, increment failed count
            if (job.name === JobType.PROCESS_RECIPIENT) {
                const { broadcastId } = job.data;
                this.broadcastRepository.incrementMetric(broadcastId, 'failedCount', 1)
                    .catch((err) => logger_config_1.logger.error('Failed to increment failedCount', { error: err }));
            }
        });
        this.queue.on('completed', (job) => {
            logger_config_1.logger.debug('Job completed', {
                jobId: job.id,
                jobType: job.name,
            });
        });
        this.queue.on('stalled', (job) => {
            logger_config_1.logger.warn('Job stalled', {
                jobId: job.id,
                jobType: job.name,
                data: job.data,
            });
        });
    }
};
exports.BroadcastQueue = BroadcastQueue;
exports.BroadcastQueue = BroadcastQueue = __decorate([
    (0, tsyringe_1.singleton)(),
    __param(0, (0, tsyringe_1.inject)(broadcast_repository_1.BroadcastRepository)),
    __param(1, (0, tsyringe_1.inject)(broadcast_sse_service_1.BroadcastSseService)),
    __param(2, (0, tsyringe_1.inject)(group_repository_1.GroupRepository)),
    __param(3, (0, tsyringe_1.inject)(customer_repository_1.CustomerRepository)),
    __param(4, (0, tsyringe_1.inject)(messaging_service_1.MessagingService)),
    __param(5, (0, tsyringe_1.inject)(channel_account_repository_1.ChannelAccountRepository)),
    __param(6, (0, tsyringe_1.inject)(rate_limiter_service_1.MessagingRateLimiterService)),
    __metadata("design:paramtypes", [broadcast_repository_1.BroadcastRepository,
        broadcast_sse_service_1.BroadcastSseService,
        group_repository_1.GroupRepository,
        customer_repository_1.CustomerRepository,
        messaging_service_1.MessagingService,
        channel_account_repository_1.ChannelAccountRepository,
        rate_limiter_service_1.MessagingRateLimiterService])
], BroadcastQueue);
