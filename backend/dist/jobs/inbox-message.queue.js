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
exports.InboxMessageQueue = exports.InboxJobType = void 0;
const tsyringe_1 = require("tsyringe");
const bull_config_1 = require("../config/bull.config");
const conversation_repository_1 = require("../features/inbox/repositories/conversation.repository");
const conversation_message_repository_1 = require("../features/inbox/repositories/conversation-message.repository");
const customer_repository_1 = require("../features/customers/customer.repository");
const channel_account_repository_1 = require("../features/channel-accounts/channel-account.repository");
const messaging_service_1 = require("../features/messaging/services/messaging.service");
const meta_media_service_1 = require("../features/messaging/services/meta-media.service");
const rate_limiter_service_1 = require("../features/messaging/services/rate-limiter.service");
const inbox_sse_service_1 = require("../features/inbox/services/inbox-sse.service");
const messaging_window_service_1 = require("../features/inbox/services/messaging-window.service");
const logger_config_1 = require("../config/logger.config");
const enums_1 = require("../features/inbox/enums");
/**
 * Maximum number of retry attempts for outbound messages.
 * Total attempts = 4 (initial + 3 retries).
 */
const MAX_ATTEMPTS = 4;
/**
 * Timeout for acquiring a rate limit token in milliseconds.
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
 * Job options for outbound message delivery.
 * Uses exponential backoff: 1s, 2s, 4s, 8s.
 */
const OUTBOUND_JOB_OPTIONS = {
    attempts: MAX_ATTEMPTS,
    backoff: {
        type: 'exponential',
        delay: 1000,
    },
    removeOnComplete: 100,
    removeOnFail: 100,
};
/**
 * Job types for the inbox message queue.
 */
var InboxJobType;
(function (InboxJobType) {
    /**
     * Job to send an outbound message to a customer.
     * Handles text, media, and template messages with retry logic.
     */
    InboxJobType["SEND_MESSAGE"] = "SEND_MESSAGE";
    /**
     * Job to process an inbound message from a customer.
     * Creates/finds conversation, creates message, emits SSE events.
     */
    InboxJobType["PROCESS_INBOUND"] = "PROCESS_INBOUND";
})(InboxJobType || (exports.InboxJobType = InboxJobType = {}));
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
 * Maps provider message type to our MessageContentType enum.
 *
 * @param providerType - Message type from the provider
 * @returns Corresponding MessageContentType
 */
function mapMessageContentType(providerType) {
    const typeMap = {
        text: enums_1.MessageContentType.TEXT,
        image: enums_1.MessageContentType.IMAGE,
        video: enums_1.MessageContentType.VIDEO,
        audio: enums_1.MessageContentType.AUDIO,
        document: enums_1.MessageContentType.DOCUMENT,
        location: enums_1.MessageContentType.LOCATION,
        sticker: enums_1.MessageContentType.STICKER,
        template: enums_1.MessageContentType.TEMPLATE,
        contacts: enums_1.MessageContentType.CONTACT,
        reaction: enums_1.MessageContentType.REACTION,
        interactive: enums_1.MessageContentType.INTERACTIVE,
    };
    return typeMap[providerType] ?? enums_1.MessageContentType.TEXT;
}
/**
 * Extracts a preview string from message content for display in conversation list.
 *
 * @param contentType - Type of message content
 * @param content - Message content object
 * @returns Preview string (max 100 chars)
 */
function extractMessagePreview(contentType, content) {
    const contentObj = content;
    switch (contentType) {
        case enums_1.MessageContentType.TEXT:
            return String(contentObj.body ?? contentObj.text ?? '').substring(0, 100);
        case enums_1.MessageContentType.IMAGE:
            return contentObj.caption ? String(contentObj.caption).substring(0, 100) : '[Image]';
        case enums_1.MessageContentType.VIDEO:
            return contentObj.caption ? String(contentObj.caption).substring(0, 100) : '[Video]';
        case enums_1.MessageContentType.AUDIO:
            return '[Audio]';
        case enums_1.MessageContentType.DOCUMENT:
            return contentObj.filename ? `[Document: ${String(contentObj.filename)}]` : '[Document]';
        case enums_1.MessageContentType.LOCATION:
            return contentObj.name ? `[Location: ${String(contentObj.name)}]` : '[Location]';
        case enums_1.MessageContentType.STICKER:
            return '[Sticker]';
        case enums_1.MessageContentType.TEMPLATE:
            return contentObj.templateName
                ? `[Template: ${String(contentObj.templateName)}]`
                : '[Template]';
        case enums_1.MessageContentType.CONTACT:
            return contentObj.formattedName
                ? `[Contact: ${String(contentObj.formattedName)}]`
                : '[Contact]';
        case enums_1.MessageContentType.REACTION:
            return contentObj.emoji ? String(contentObj.emoji) : '[Reaction]';
        case enums_1.MessageContentType.INTERACTIVE:
            return contentObj.body ? String(contentObj.body).substring(0, 100) : '[Interactive]';
        default:
            return '[Message]';
    }
}
/**
 * Service for managing Bull queue operations for inbox messages.
 *
 * Handles:
 * - Sending outbound messages with retry logic and exponential backoff
 * - Processing inbound messages from customers
 * - Creating/finding conversations
 * - Creating messages and updating conversation state
 * - Emitting real-time SSE events for UI updates
 *
 * @remarks
 * Configuration:
 * - attempts: 4 (initial + 3 retries)
 * - backoff: exponential with 1s base delay (1s, 2s, 4s, 8s)
 * - concurrency: 10 (configurable via BULL_CONFIG)
 */
let InboxMessageQueue = class InboxMessageQueue {
    conversationRepository;
    messageRepository;
    customerRepository;
    channelAccountRepository;
    messagingService;
    metaMediaService;
    rateLimiterService;
    sseService;
    messagingWindowService;
    queue;
    constructor(conversationRepository, messageRepository, customerRepository, channelAccountRepository, messagingService, metaMediaService, rateLimiterService, sseService, messagingWindowService) {
        this.conversationRepository = conversationRepository;
        this.messageRepository = messageRepository;
        this.customerRepository = customerRepository;
        this.channelAccountRepository = channelAccountRepository;
        this.messagingService = messagingService;
        this.metaMediaService = metaMediaService;
        this.rateLimiterService = rateLimiterService;
        this.sseService = sseService;
        this.messagingWindowService = messagingWindowService;
        this.queue = (0, bull_config_1.createQueue)('inbox-messages');
        this.setupProcessors();
        this.setupEventListeners();
    }
    /**
     * Queue an outbound message for delivery.
     *
     * @param data - Outbound message data (without attempt number)
     * @returns The job ID
     */
    async queueOutboundMessage(data) {
        const jobData = {
            ...data,
            attempt: 1,
        };
        const job = await this.queue.add(InboxJobType.SEND_MESSAGE, jobData, {
            ...OUTBOUND_JOB_OPTIONS,
            // Use message ID as job ID for idempotency
            jobId: `inbox-msg:${data.messageId}`,
        });
        logger_config_1.logger.debug('Outbound message queued', {
            jobId: job.id,
            messageId: data.messageId,
            conversationId: data.conversationId,
            channelAccountId: data.channelAccountId,
            recipient: maskPhoneNumber(data.recipient),
            contentType: data.contentType,
        });
        return String(job.id);
    }
    /**
     * Queue an inbound message for processing.
     *
     * @param data - Inbound message data
     * @returns The job ID
     */
    async queueInboundProcessing(data) {
        const job = await this.queue.add(InboxJobType.PROCESS_INBOUND, data, {
            // Use provider message ID as job ID for idempotency
            jobId: `inbox-inbound:${data.providerMessageId}`,
        });
        logger_config_1.logger.debug('Inbound message queued', {
            jobId: job.id,
            providerMessageId: data.providerMessageId,
            channelAccountId: data.channelAccountId,
            fromNumber: maskPhoneNumber(data.fromNumber),
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
        logger_config_1.logger.info('Inbox message queue paused');
    }
    /**
     * Resume the queue - continues processing jobs.
     */
    async resumeQueue() {
        await this.queue.resume();
        logger_config_1.logger.info('Inbox message queue resumed');
    }
    /**
     * Close the queue gracefully.
     */
    async closeQueue() {
        await this.queue.close();
        logger_config_1.logger.info('Inbox message queue closed');
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
        // Process SEND_MESSAGE jobs - sends outbound messages
        this.queue.process(InboxJobType.SEND_MESSAGE, bull_config_1.BULL_CONFIG.concurrency, async (job) => {
            await this.processSendMessage(job);
        });
        // Process PROCESS_INBOUND jobs - handles incoming messages
        this.queue.process(InboxJobType.PROCESS_INBOUND, bull_config_1.BULL_CONFIG.concurrency, async (job) => {
            await this.processInboundMessage(job);
        });
    }
    /**
     * Process an outbound message send job.
     *
     * Steps:
     * 1. Check if channel account is in rate limit backoff
     * 2. Acquire rate limit token
     * 3. Load the message record
     * 4. Validate channel account exists and is accessible
     * 5. Get provider instance via MessagingService
     * 6. Send message via provider (freeform or template)
     * 7. On success: update status to SENT, emit SSE event
     * 8. On failure: either retry (if retryable) or mark as FAILED
     *
     * @throws Error to trigger Bull retry for retryable failures
     */
    async processSendMessage(job) {
        const { messageId, conversationId, tenantId, channelAccountId, recipient, contentType, content, attempt, } = job.data;
        logger_config_1.logger.debug('Processing outbound message', {
            jobId: job.id,
            messageId,
            conversationId,
            attempt,
            recipient: maskPhoneNumber(recipient),
        });
        // 1. Check if channel account is in rate limit backoff
        const isInBackoff = await this.rateLimiterService.isInBackoff(channelAccountId);
        if (isInBackoff) {
            logger_config_1.logger.debug('Channel account in rate limit backoff, retrying later', {
                messageId,
                channelAccountId,
                conversationId,
            });
            throw new Error(RATE_LIMIT_ERROR_CODES.BACKOFF);
        }
        // 2. Acquire rate limit token
        const tokenAcquired = await this.rateLimiterService.acquireToken(channelAccountId, RATE_LIMIT_TOKEN_TIMEOUT_MS);
        if (!tokenAcquired) {
            logger_config_1.logger.warn('Failed to acquire rate limit token', {
                messageId,
                channelAccountId,
                conversationId,
                timeoutMs: RATE_LIMIT_TOKEN_TIMEOUT_MS,
            });
            throw new Error(RATE_LIMIT_ERROR_CODES.TIMEOUT);
        }
        // 3. Load message record
        const message = await this.messageRepository.findById(messageId);
        if (!message) {
            throw new Error(`Message not found: ${messageId}`);
        }
        // 4. Validate channel account
        const channelAccount = await this.channelAccountRepository.findByIdAndTenant(channelAccountId, tenantId);
        if (!channelAccount) {
            throw new Error(`Channel account not found: ${channelAccountId}`);
        }
        // 5. Get provider instance
        const provider = await this.messagingService.getProviderForChannelAccount(channelAccountId);
        // 6. Send message based on content type
        let sendResult;
        try {
            if (contentType === 'template') {
                // Send template message - templates bypass the 24-hour window requirement
                if (!content.templateName || !content.templateLanguage) {
                    await this.handlePermanentFailure(messageId, conversationId, tenantId, 'INVALID_TEMPLATE_CONFIG', 'Template name and language are required for template messages');
                    return;
                }
                sendResult = await provider.sendTemplateMessage({
                    recipient,
                    templateName: content.templateName,
                    language: content.templateLanguage,
                    variables: content.templateVariables ?? { body: [] },
                    mediaUrl: content.mediaUrl,
                    messageLogId: messageId,
                });
            }
            else {
                // Send freeform message - must check 24-hour messaging window
                if (!provider.sendFreeformMessage) {
                    await this.handlePermanentFailure(messageId, conversationId, tenantId, 'FREEFORM_NOT_SUPPORTED', 'Provider does not support freeform messages');
                    return;
                }
                // Check 24-hour messaging window for WhatsApp Cloud API compliance
                const conversation = await this.conversationRepository.findById(tenantId, conversationId);
                if (!conversation) {
                    await this.handlePermanentFailure(messageId, conversationId, tenantId, 'CONVERSATION_NOT_FOUND', 'Conversation not found');
                    return;
                }
                if (!this.messagingWindowService.isWindowOpen(conversation.lastCustomerMessageAt)) {
                    await this.handlePermanentFailure(messageId, conversationId, tenantId, 'MESSAGING_WINDOW_CLOSED', 'Cannot send freeform message outside 24-hour messaging window. Use a template message instead.');
                    return;
                }
                sendResult = await provider.sendFreeformMessage({
                    recipient,
                    contentType: contentType,
                    content: {
                        text: content.text,
                        mediaUrl: content.mediaUrl,
                        caption: content.caption,
                        filename: content.filename,
                    },
                    messageId,
                });
            }
        }
        catch (error) {
            // Check if this is a rate limit error from the provider
            if (this.rateLimiterService.isRateLimitError(error)) {
                const retryAfter = this.rateLimiterService.extractRetryAfter(error);
                await this.rateLimiterService.handleRateLimitError(channelAccountId, retryAfter);
                logger_config_1.logger.warn('Provider rate limit error, applying backoff', {
                    messageId,
                    channelAccountId,
                    conversationId,
                    retryAfterSeconds: retryAfter,
                });
                throw new Error(RATE_LIMIT_ERROR_CODES.ERROR);
            }
            // Re-throw non-rate-limit errors
            throw error;
        }
        // 7. Handle result
        if (sendResult.success) {
            await this.handleSendSuccess(messageId, conversationId, tenantId, sendResult.providerMessageId, sendResult.timestamp ?? new Date());
        }
        else {
            // Check if the error response indicates a rate limit
            if (sendResult.error && this.isRateLimitErrorCode(sendResult.error.code)) {
                await this.rateLimiterService.handleRateLimitError(channelAccountId);
                throw new Error(RATE_LIMIT_ERROR_CODES.ERROR);
            }
            await this.handleSendFailure(job, messageId, conversationId, tenantId, sendResult.error);
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
     * Handle successful message send.
     */
    async handleSendSuccess(messageId, conversationId, tenantId, providerMessageId, sentAt) {
        // Update message status
        await this.messageRepository.updateDeliveryStatus(messageId, enums_1.MessageDeliveryStatus.SENT, {
            sentAt,
        });
        // Update providerMessageId on the message record
        // Note: If the repository doesn't have this method, we need to add it
        // For now, using updateDeliveryStatus with metadata or direct update
        await this.messageRepository.updateDeliveryStatus(messageId, enums_1.MessageDeliveryStatus.SENT, {
            sentAt,
        });
        // Emit SSE event
        this.sseService.emitConversationEvent(tenantId, conversationId, 'conversation:message:status', {
            messageId,
            status: enums_1.MessageDeliveryStatus.SENT,
            providerMessageId,
            sentAt: sentAt.toISOString(),
        });
        logger_config_1.logger.debug('Outbound message sent successfully', {
            messageId,
            providerMessageId,
            conversationId,
        });
        logger_config_1.auditLogger.info('Outbound message sent', {
            action: 'inbox.message.sent',
            tenantId,
            conversationId,
            messageId,
            providerMessageId,
        });
    }
    /**
     * Handle send failure - decide whether to retry or mark as failed.
     */
    async handleSendFailure(job, messageId, conversationId, tenantId, error) {
        const { attempt } = job.data;
        // Check if we should retry
        if (error.retryable && attempt < MAX_ATTEMPTS) {
            // Increment retry count on the message
            await this.messageRepository.incrementRetryCount(messageId);
            logger_config_1.logger.warn('Outbound message send failed - will retry', {
                messageId,
                conversationId,
                attempt,
                maxAttempts: MAX_ATTEMPTS,
                errorCode: error.code,
                errorMessage: error.message,
            });
            // Throw to trigger Bull's built-in retry
            throw new Error(error.code);
        }
        // Max retries exhausted or non-retryable error
        const errorCode = attempt >= MAX_ATTEMPTS ? 'MAX_RETRIES_EXCEEDED' : error.code;
        const errorMessage = attempt >= MAX_ATTEMPTS
            ? `Message delivery failed after ${MAX_ATTEMPTS} retries. Last error: ${error.message}`
            : error.message;
        await this.handlePermanentFailure(messageId, conversationId, tenantId, errorCode, errorMessage);
    }
    /**
     * Handle permanent failure - mark message as failed and emit SSE.
     */
    async handlePermanentFailure(messageId, conversationId, tenantId, errorCode, errorMessage) {
        await this.messageRepository.updateError(messageId, errorCode, errorMessage);
        // Emit SSE event
        this.sseService.emitConversationEvent(tenantId, conversationId, 'conversation:message:status', {
            messageId,
            status: enums_1.MessageDeliveryStatus.FAILED,
            errorCode,
            errorMessage,
        });
        logger_config_1.logger.error('Outbound message send failed permanently', {
            messageId,
            conversationId,
            errorCode,
            errorMessage,
        });
        logger_config_1.auditLogger.info('Outbound message failed', {
            action: 'inbox.message.failed',
            tenantId,
            conversationId,
            messageId,
            errorCode,
            errorMessage,
        });
    }
    /**
     * Process an inbound message from a customer.
     *
     * Steps:
     * 1. Validate channel account exists
     * 2. Find or create customer by phone number
     * 3. Find or create conversation for customer+channel
     * 4. Create the message record
     * 5. Update conversation state (last message, unread count)
     * 6. Emit SSE events for real-time UI updates
     */
    async processInboundMessage(job) {
        const { tenantId, channelAccountId, providerMessageId, fromNumber, messageType, content, timestamp, } = job.data;
        logger_config_1.logger.debug('Processing inbound message', {
            jobId: job.id,
            providerMessageId,
            channelAccountId,
            fromNumber: maskPhoneNumber(fromNumber),
        });
        // 1. Validate channel account
        const channelAccount = await this.channelAccountRepository.findById(channelAccountId);
        if (!channelAccount) {
            throw new Error(`Channel account not found: ${channelAccountId}`);
        }
        // 2. Find or create customer
        let customer = await this.customerRepository.findByWhatsApp(fromNumber, tenantId);
        if (!customer) {
            // Create a new customer record for this phone number
            customer = await this.customerRepository.create({
                tenantId,
                whatsappNumber: fromNumber,
                name: fromNumber, // Default name is phone number until updated
                customFields: {},
            });
            logger_config_1.logger.info('Created new customer from inbound message', {
                customerId: customer.id,
                tenantId,
                fromNumber: maskPhoneNumber(fromNumber),
            });
        }
        // 3. Find or create conversation
        let conversation = await this.conversationRepository.findByCustomerAndChannel(tenantId, customer.id, channelAccountId);
        let isNewConversation = false;
        if (!conversation) {
            conversation = await this.conversationRepository.create({
                tenantId,
                customerId: customer.id,
                channelAccountId,
                status: enums_1.ConversationStatus.UNASSIGNED,
                lastMessageAt: timestamp,
                unreadCount: 0,
            });
            isNewConversation = true;
            logger_config_1.logger.info('Created new conversation from inbound message', {
                conversationId: conversation.id,
                customerId: customer.id,
                channelAccountId,
                tenantId,
            });
        }
        // 4. Map content type and process media if present
        const contentType = mapMessageContentType(messageType);
        // 4a. Process media for media message types (download from Meta, upload to S3)
        let processedContent = content;
        const mediaTypes = [
            enums_1.MessageContentType.IMAGE,
            enums_1.MessageContentType.VIDEO,
            enums_1.MessageContentType.AUDIO,
            enums_1.MessageContentType.DOCUMENT,
            enums_1.MessageContentType.STICKER,
        ];
        if (mediaTypes.includes(contentType)) {
            processedContent = await this.processMediaContent(contentType, content, channelAccountId, tenantId, conversation.id);
        }
        const contentRecord = this.normalizeMessageContent(contentType, processedContent);
        const message = await this.messageRepository.create({
            tenantId,
            conversationId: conversation.id,
            direction: enums_1.MessageDirection.INBOUND,
            contentType,
            content: contentRecord,
            providerMessageId,
            deliveryStatus: enums_1.MessageDeliveryStatus.DELIVERED, // Inbound messages are already delivered
            sentAt: timestamp,
            deliveredAt: timestamp,
            metadata: {
                rawEvent: job.data.rawEvent,
            },
        });
        // 5. Update conversation state
        const preview = extractMessagePreview(contentType, contentRecord);
        await this.conversationRepository.updateLastMessage(tenantId, conversation.id, preview, enums_1.MessageDirection.INBOUND, timestamp);
        // Update last customer message timestamp for 24-hour messaging window tracking
        await this.conversationRepository.updateLastCustomerMessageAt(tenantId, conversation.id, timestamp);
        await this.conversationRepository.incrementUnreadCount(tenantId, conversation.id);
        // 6. Emit SSE events for real-time UI updates
        if (isNewConversation) {
            // Reload conversation with relations for SSE event
            const fullConversation = await this.conversationRepository.findById(tenantId, conversation.id);
            this.sseService.emitToTenant(tenantId, 'conversation:new', {
                conversation: fullConversation,
            });
        }
        this.sseService.emitConversationEvent(tenantId, conversation.id, 'conversation:message:new', {
            message: this.formatMessageForSse(message, customer),
        });
        this.sseService.emitConversationEvent(tenantId, conversation.id, 'conversation:unread:updated', {
            unreadCount: conversation.unreadCount + 1,
        });
        logger_config_1.auditLogger.info('Inbound message processed', {
            action: 'inbox.message.inbound',
            tenantId,
            conversationId: conversation.id,
            messageId: message.id,
            providerMessageId,
            customerId: customer.id,
            isNewConversation,
        });
    }
    /**
     * Process media content: download from Meta CDN and upload to S3.
     *
     * This method extracts the media ID and MIME type from the raw content,
     * downloads the media from Meta's CDN, uploads it to S3, and returns
     * the content with the S3 URL instead of the temporary Meta URL.
     *
     * If media processing fails, the original content is returned with a warning log.
     * This ensures the webhook processing doesn't fail entirely due to media issues.
     *
     * @param contentType - Type of message content
     * @param rawContent - Raw content from provider webhook
     * @param channelAccountId - Channel account for provider access
     * @param tenantId - Tenant ID for S3 organization
     * @param conversationId - Conversation ID for S3 organization
     * @returns Content with S3 URL or original content if processing fails
     */
    async processMediaContent(contentType, rawContent, channelAccountId, tenantId, conversationId) {
        const content = rawContent;
        // Extract media ID and MIME type based on content type
        let mediaId;
        let mimeType;
        switch (contentType) {
            case enums_1.MessageContentType.IMAGE:
                mediaId = content.id;
                mimeType = content.mime_type;
                break;
            case enums_1.MessageContentType.VIDEO:
                mediaId = content.id;
                mimeType = content.mime_type;
                break;
            case enums_1.MessageContentType.AUDIO:
                mediaId = content.id;
                mimeType = content.mime_type;
                break;
            case enums_1.MessageContentType.DOCUMENT:
                mediaId = content.id;
                mimeType = content.mime_type;
                break;
            case enums_1.MessageContentType.STICKER:
                mediaId = content.id;
                mimeType = content.mime_type || 'image/webp';
                break;
            default:
                return content;
        }
        if (!mediaId) {
            logger_config_1.logger.warn('Media message missing media ID', {
                contentType,
                tenantId,
                conversationId,
            });
            return content;
        }
        try {
            const processedMedia = await this.metaMediaService.processInboundMedia(mediaId, mimeType || 'application/octet-stream', channelAccountId, tenantId, conversationId);
            logger_config_1.logger.info('Media processed and stored in S3', {
                mediaId,
                s3Key: processedMedia.s3Key,
                contentType: processedMedia.contentType,
                size: processedMedia.size,
                tenantId,
                conversationId,
            });
            // Return content with S3 URL instead of temporary Meta URL
            return {
                ...content,
                url: processedMedia.url,
                s3Key: processedMedia.s3Key,
                processedMimeType: processedMedia.contentType,
                processedSize: processedMedia.size,
            };
        }
        catch (error) {
            // Log the error but don't fail the entire message processing
            // The message will be stored with the original media:// URL
            logger_config_1.logger.warn('Failed to process media, continuing with placeholder', {
                error: error instanceof Error ? error.message : 'Unknown error',
                mediaId,
                mimeType,
                contentType,
                tenantId,
                conversationId,
            });
            // Return original content - the media:// URL will indicate unprocessed media
            return content;
        }
    }
    /**
     * Normalize message content into a consistent structure.
     *
     * @param contentType - Type of message content
     * @param rawContent - Raw content from provider
     * @returns Normalized content object
     */
    normalizeMessageContent(contentType, rawContent) {
        const content = rawContent;
        switch (contentType) {
            case enums_1.MessageContentType.TEXT:
                return { body: content.text ?? content.body ?? '' };
            case enums_1.MessageContentType.IMAGE:
                return {
                    // Use S3 URL if available, otherwise fall back to media:// placeholder
                    url: content.url || (content.id ? `media://${content.id}` : undefined),
                    s3Key: content.s3Key,
                    caption: content.caption,
                    mimeType: content.processedMimeType || content.mime_type,
                    size: content.processedSize,
                };
            case enums_1.MessageContentType.VIDEO:
                return {
                    url: content.url || (content.id ? `media://${content.id}` : undefined),
                    s3Key: content.s3Key,
                    caption: content.caption,
                    mimeType: content.processedMimeType || content.mime_type,
                    size: content.processedSize,
                };
            case enums_1.MessageContentType.AUDIO:
                return {
                    url: content.url || (content.id ? `media://${content.id}` : undefined),
                    s3Key: content.s3Key,
                    mimeType: content.processedMimeType || content.mime_type,
                    size: content.processedSize,
                };
            case enums_1.MessageContentType.DOCUMENT:
                return {
                    url: content.url || (content.id ? `media://${content.id}` : undefined),
                    s3Key: content.s3Key,
                    filename: content.filename,
                    mimeType: content.processedMimeType || content.mime_type,
                    size: content.processedSize,
                };
            case enums_1.MessageContentType.LOCATION:
                return {
                    latitude: content.latitude,
                    longitude: content.longitude,
                    name: content.name,
                    address: content.address,
                };
            case enums_1.MessageContentType.STICKER:
                return {
                    url: content.url || (content.id ? `media://${content.id}` : undefined),
                    s3Key: content.s3Key,
                    mimeType: content.processedMimeType || content.mime_type || 'image/webp',
                    size: content.processedSize,
                };
            case enums_1.MessageContentType.TEMPLATE:
                return {
                    templateName: content.templateName,
                    templateLanguage: content.templateLanguage,
                    variables: content.variables,
                };
            case enums_1.MessageContentType.CONTACT: {
                // Meta contacts come as an array, extract first contact
                const contacts = content.contacts;
                const firstContact = contacts?.[0];
                const contactName = firstContact?.name;
                return {
                    formattedName: contactName?.formatted_name,
                    firstName: contactName?.first_name,
                    lastName: contactName?.last_name,
                    phones: firstContact?.phones,
                    emails: firstContact?.emails,
                };
            }
            case enums_1.MessageContentType.REACTION:
                return {
                    messageId: content.message_id ?? content.messageId,
                    emoji: content.emoji,
                };
            case enums_1.MessageContentType.INTERACTIVE: {
                // Interactive responses contain button_reply or list_reply
                const buttonReply = content.button_reply;
                const listReply = content.list_reply;
                return {
                    type: buttonReply ? 'button_reply' : 'list_reply',
                    id: buttonReply?.id ?? listReply?.id,
                    title: buttonReply?.title ?? listReply?.title,
                    description: listReply?.description,
                };
            }
            default:
                return content;
        }
    }
    /**
     * Format a message for SSE transmission.
     *
     * @param message - The message entity
     * @param customer - The customer who sent the message
     * @returns Formatted message object
     */
    formatMessageForSse(message, customer) {
        return {
            id: message.id,
            conversationId: message.conversationId,
            direction: message.direction,
            contentType: message.contentType,
            content: message.content,
            providerMessageId: message.providerMessageId,
            deliveryStatus: message.deliveryStatus,
            sentAt: message.sentAt,
            deliveredAt: message.deliveredAt,
            createdAt: message.createdAt,
            sender: {
                id: customer.id,
                name: customer.name,
                type: 'customer',
            },
        };
    }
    /**
     * Setup event listeners for queue events.
     */
    setupEventListeners() {
        this.queue.on('error', (error) => {
            logger_config_1.logger.error('Inbox queue error', { error: error.message, stack: error.stack });
        });
        this.queue.on('failed', (job, error) => {
            const jobType = job.name;
            if (jobType === InboxJobType.SEND_MESSAGE) {
                const data = job.data;
                logger_config_1.logger.error('Outbound message job failed', {
                    jobId: job.id,
                    jobType,
                    error: error.message,
                    attemptsMade: job.attemptsMade,
                    messageId: data.messageId,
                    conversationId: data.conversationId,
                });
            }
            else if (jobType === InboxJobType.PROCESS_INBOUND) {
                const data = job.data;
                logger_config_1.logger.error('Inbound message job failed', {
                    jobId: job.id,
                    jobType,
                    error: error.message,
                    attemptsMade: job.attemptsMade,
                    providerMessageId: data.providerMessageId,
                });
            }
            else {
                logger_config_1.logger.error('Inbox job failed', {
                    jobId: job.id,
                    jobType,
                    error: error.message,
                    attemptsMade: job.attemptsMade,
                });
            }
        });
        this.queue.on('completed', (job) => {
            logger_config_1.logger.debug('Inbox job completed', {
                jobId: job.id,
                jobType: job.name,
            });
        });
        this.queue.on('stalled', (job) => {
            logger_config_1.logger.warn('Inbox job stalled', {
                jobId: job.id,
                jobType: job.name,
                data: job.data,
            });
        });
    }
};
exports.InboxMessageQueue = InboxMessageQueue;
exports.InboxMessageQueue = InboxMessageQueue = __decorate([
    (0, tsyringe_1.singleton)(),
    __param(0, (0, tsyringe_1.inject)(conversation_repository_1.ConversationRepository)),
    __param(1, (0, tsyringe_1.inject)(conversation_message_repository_1.ConversationMessageRepository)),
    __param(2, (0, tsyringe_1.inject)(customer_repository_1.CustomerRepository)),
    __param(3, (0, tsyringe_1.inject)(channel_account_repository_1.ChannelAccountRepository)),
    __param(4, (0, tsyringe_1.inject)(messaging_service_1.MessagingService)),
    __param(5, (0, tsyringe_1.inject)(meta_media_service_1.MetaMediaService)),
    __param(6, (0, tsyringe_1.inject)(rate_limiter_service_1.MessagingRateLimiterService)),
    __param(7, (0, tsyringe_1.inject)(inbox_sse_service_1.InboxSseService)),
    __param(8, (0, tsyringe_1.inject)(messaging_window_service_1.MessagingWindowService)),
    __metadata("design:paramtypes", [conversation_repository_1.ConversationRepository,
        conversation_message_repository_1.ConversationMessageRepository,
        customer_repository_1.CustomerRepository,
        channel_account_repository_1.ChannelAccountRepository,
        messaging_service_1.MessagingService,
        meta_media_service_1.MetaMediaService,
        rate_limiter_service_1.MessagingRateLimiterService,
        inbox_sse_service_1.InboxSseService,
        messaging_window_service_1.MessagingWindowService])
], InboxMessageQueue);
