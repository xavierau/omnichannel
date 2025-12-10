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
exports.OutgoingWebhookService = void 0;
const tsyringe_1 = require("tsyringe");
const channel_account_repository_1 = require("../../channel-accounts/channel-account.repository");
const outgoing_webhook_queue_1 = require("../../../jobs/outgoing-webhook.queue");
const logger_config_1 = require("../../../config/logger.config");
/**
 * Service for managing outgoing webhook notifications.
 *
 * Handles the business logic for determining when to dispatch webhooks
 * and building the payload from domain entities.
 *
 * @remarks
 * Webhooks are only dispatched when:
 * 1. The channel account has a configured webhookUrl
 * 2. The channel account has encrypted webhook secret configured
 * 3. The conversation is unassigned (status = 'unassigned')
 */
let OutgoingWebhookService = class OutgoingWebhookService {
    channelAccountRepository;
    webhookQueue;
    constructor(channelAccountRepository, webhookQueue) {
        this.channelAccountRepository = channelAccountRepository;
        this.webhookQueue = webhookQueue;
    }
    /**
     * Maybe dispatch a webhook for an unassigned message event.
     *
     * Checks if the channel account has webhook configuration and queues
     * a dispatch job if so. Does nothing if webhook is not configured.
     *
     * @param params - Message, conversation, customer, and channel account
     * @returns The job ID if queued, undefined if skipped
     */
    async maybeDispatchWebhook(params) {
        const { message, conversation, customer, channelAccount } = params;
        logger_config_1.logger.debug('Evaluating webhook dispatch conditions', {
            channelAccountId: channelAccount.id,
            messageId: message.id,
            conversationId: conversation.id,
            hasWebhookUrl: !!channelAccount.webhookUrl,
            hasWebhookSecret: !!(channelAccount.webhookSecretEncrypted && channelAccount.webhookSecretIv),
        });
        // Check if webhook URL is configured
        if (!channelAccount.webhookUrl) {
            logger_config_1.logger.info('Skipping webhook dispatch: no webhook URL configured', {
                channelAccountId: channelAccount.id,
                channelAccountName: channelAccount.name,
                messageId: message.id,
                conversationId: conversation.id,
            });
            return undefined;
        }
        // Check if webhook secret is configured
        if (!channelAccount.webhookSecretEncrypted || !channelAccount.webhookSecretIv) {
            logger_config_1.logger.warn('Skipping webhook dispatch: webhook URL configured but no secret', {
                channelAccountId: channelAccount.id,
                channelAccountName: channelAccount.name,
                webhookUrl: this.maskWebhookUrl(channelAccount.webhookUrl),
                messageId: message.id,
                conversationId: conversation.id,
            });
            return undefined;
        }
        // Build payload
        logger_config_1.logger.debug('Building webhook payload', {
            channelAccountId: channelAccount.id,
            messageId: message.id,
            conversationId: conversation.id,
            customerId: customer.id,
        });
        const payload = this.buildPayload(message, conversation, customer, channelAccount);
        // Build job data
        const jobData = {
            webhookUrl: channelAccount.webhookUrl,
            payload,
            secretEncrypted: channelAccount.webhookSecretEncrypted,
            secretIv: channelAccount.webhookSecretIv,
            channelAccountId: channelAccount.id,
            tenantId: channelAccount.tenantId,
        };
        logger_config_1.logger.info('Queueing webhook dispatch job', {
            event: payload.event,
            webhookUrl: this.maskWebhookUrl(channelAccount.webhookUrl),
            channelAccountId: channelAccount.id,
            messageId: message.id,
            conversationId: conversation.id,
        });
        // Queue the dispatch
        const jobId = await this.webhookQueue.queueDispatch(jobData);
        logger_config_1.logger.info('Queued outgoing webhook dispatch', {
            jobId,
            event: payload.event,
            messageId: message.id,
            conversationId: conversation.id,
            channelAccountId: channelAccount.id,
            webhookUrl: this.maskWebhookUrl(channelAccount.webhookUrl),
        });
        return jobId;
    }
    /**
     * Dispatch webhook for a message received on an unassigned conversation.
     *
     * This is the main entry point for inbound message webhook dispatch.
     * Fetches the full channel account and delegates to maybeDispatchWebhook.
     *
     * @param message - The inbound message
     * @param conversation - The conversation
     * @param customer - The customer
     * @param channelAccountId - ID of the channel account
     * @returns The job ID if queued, undefined if skipped
     */
    async dispatchUnassignedMessageWebhook(message, conversation, customer, channelAccountId) {
        logger_config_1.logger.info('Starting unassigned message webhook dispatch', {
            channelAccountId,
            messageId: message.id,
            conversationId: conversation.id,
            customerId: customer.id,
        });
        // Fetch channel account with all fields
        const channelAccount = await this.channelAccountRepository.findById(channelAccountId);
        if (!channelAccount) {
            logger_config_1.logger.error('Channel account not found for webhook dispatch', {
                channelAccountId,
                messageId: message.id,
                conversationId: conversation.id,
            });
            return undefined;
        }
        logger_config_1.logger.info('Channel account retrieved for webhook dispatch', {
            channelAccountId: channelAccount.id,
            channelAccountName: channelAccount.name,
            hasWebhookUrl: !!channelAccount.webhookUrl,
            hasWebhookSecret: !!(channelAccount.webhookSecretEncrypted && channelAccount.webhookSecretIv),
            webhookUrl: channelAccount.webhookUrl ? this.maskWebhookUrl(channelAccount.webhookUrl) : 'not configured',
            messageId: message.id,
        });
        return this.maybeDispatchWebhook({
            message,
            conversation,
            customer,
            channelAccount,
        });
    }
    /**
     * Build the webhook payload from domain entities.
     */
    buildPayload(message, conversation, customer, channelAccount) {
        return {
            event: 'message.received.unassigned',
            timestamp: new Date().toISOString(),
            message: {
                id: message.id,
                providerMessageId: message.providerMessageId || '',
                contentType: message.contentType,
                content: message.content,
                receivedAt: message.sentAt?.toISOString() || message.createdAt.toISOString(),
            },
            conversation: {
                id: conversation.id,
                status: conversation.status,
                createdAt: conversation.createdAt.toISOString(),
                lastMessageAt: conversation.lastMessageAt?.toISOString() || null,
            },
            customer: {
                id: customer.id,
                name: customer.name,
                whatsappNumber: customer.whatsappNumber,
                customFields: customer.customFields || {},
            },
            channelAccount: {
                id: channelAccount.id,
                name: channelAccount.name,
                phoneNumber: channelAccount.phoneNumber,
            },
            tenantId: channelAccount.tenantId,
        };
    }
    /**
     * Mask webhook URL for logging to avoid leaking sensitive paths.
     */
    maskWebhookUrl(url) {
        try {
            const parsed = new URL(url);
            // Keep host, mask path beyond first segment
            const pathParts = parsed.pathname.split('/').filter(Boolean);
            if (pathParts.length > 1) {
                parsed.pathname = '/' + pathParts[0] + '/***';
            }
            // Remove query string
            parsed.search = '';
            return parsed.toString();
        }
        catch {
            return '***';
        }
    }
};
exports.OutgoingWebhookService = OutgoingWebhookService;
exports.OutgoingWebhookService = OutgoingWebhookService = __decorate([
    (0, tsyringe_1.singleton)(),
    __param(0, (0, tsyringe_1.inject)(channel_account_repository_1.ChannelAccountRepository)),
    __param(1, (0, tsyringe_1.inject)(outgoing_webhook_queue_1.OutgoingWebhookQueue)),
    __metadata("design:paramtypes", [channel_account_repository_1.ChannelAccountRepository,
        outgoing_webhook_queue_1.OutgoingWebhookQueue])
], OutgoingWebhookService);
