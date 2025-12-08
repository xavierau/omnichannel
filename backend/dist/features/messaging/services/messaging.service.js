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
exports.MessagingService = void 0;
const tsyringe_1 = require("tsyringe");
const provider_factory_1 = require("../provider-factory");
const message_log_repository_1 = require("../../message-logs/message-log.repository");
const channel_account_repository_1 = require("../../channel-accounts/channel-account.repository");
const message_log_entity_1 = require("../../message-logs/message-log.entity");
const logger_config_1 = require("../../../config/logger.config");
/**
 * MessagingService orchestrates message sending through providers.
 *
 * This is the main entry point for sending messages. It:
 * 1. Creates message log entries for tracking
 * 2. Resolves the appropriate provider via ProviderFactory
 * 3. Sends messages through the provider
 * 4. Updates message log with results
 */
let MessagingService = class MessagingService {
    providerFactory;
    messageLogRepo;
    channelAccountRepo;
    constructor(providerFactory, messageLogRepo, channelAccountRepo) {
        this.providerFactory = providerFactory;
        this.messageLogRepo = messageLogRepo;
        this.channelAccountRepo = channelAccountRepo;
    }
    /**
     * Send a single template message.
     *
     * @param request - Message request details
     * @returns Result with message log ID and status
     */
    async sendTemplateMessage(request) {
        // 1. Validate channel account exists and belongs to tenant
        const channelAccount = await this.channelAccountRepo.findByIdAndTenant(request.channelAccountId, request.tenantId);
        if (!channelAccount) {
            return {
                success: false,
                messageLogId: '',
                error: {
                    code: 'CHANNEL_ACCOUNT_NOT_FOUND',
                    message: `Channel account '${request.channelAccountId}' not found for tenant`,
                    retryable: false,
                },
            };
        }
        if (!channelAccount.isActive) {
            return {
                success: false,
                messageLogId: '',
                error: {
                    code: 'CHANNEL_ACCOUNT_INACTIVE',
                    message: `Channel account '${channelAccount.name}' is not active`,
                    retryable: false,
                },
            };
        }
        // 2. Create message log entry
        const messageLog = await this.createMessageLog(request, channelAccount);
        // 3. Get initialized provider
        let provider;
        try {
            provider = await this.providerFactory.createProviderForChannelAccount(request.channelAccountId);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            await this.messageLogRepo.updateStatus(messageLog.id, message_log_entity_1.MessageStatus.FAILED, {
                errorMessage,
                errorCode: 'PROVIDER_INIT_FAILED',
            });
            logger_config_1.logger.error('Failed to initialize provider', {
                channelAccountId: request.channelAccountId,
                error: errorMessage,
                messageLogId: messageLog.id,
            });
            return {
                success: false,
                messageLogId: messageLog.id,
                error: {
                    code: 'PROVIDER_INIT_FAILED',
                    message: errorMessage,
                    retryable: false,
                },
            };
        }
        // 4. Update status to queued
        await this.messageLogRepo.updateStatus(messageLog.id, message_log_entity_1.MessageStatus.QUEUED);
        // 5. Send message via provider
        const providerRequest = {
            recipient: request.recipient,
            templateName: request.templateName,
            language: request.language,
            variables: request.variables,
            mediaUrl: request.mediaUrl,
            messageLogId: messageLog.id,
        };
        const response = await provider.sendTemplateMessage(providerRequest);
        // 6. Update message log based on response
        if (response.success) {
            await this.messageLogRepo.updateStatus(messageLog.id, message_log_entity_1.MessageStatus.SENT, {
                providerMessageId: response.providerMessageId,
                providerResponse: response.rawResponse,
            });
            logger_config_1.logger.info('Template message sent successfully', {
                messageLogId: messageLog.id,
                providerMessageId: response.providerMessageId,
                recipient: request.recipient,
                templateName: request.templateName,
            });
            return {
                success: true,
                messageLogId: messageLog.id,
                providerMessageId: response.providerMessageId,
            };
        }
        else {
            await this.messageLogRepo.updateStatus(messageLog.id, message_log_entity_1.MessageStatus.FAILED, {
                errorMessage: response.error?.message,
                errorCode: response.error?.code,
                providerResponse: response.rawResponse,
            });
            logger_config_1.logger.error('Template message failed', {
                messageLogId: messageLog.id,
                errorCode: response.error?.code,
                errorMessage: response.error?.message,
                recipient: request.recipient,
                templateName: request.templateName,
            });
            return {
                success: false,
                messageLogId: messageLog.id,
                error: response.error,
            };
        }
    }
    /**
     * Send a batch of template messages.
     *
     * Note: This sends messages sequentially. For high-volume broadcasts,
     * use the BroadcastQueue which processes messages in parallel workers.
     *
     * @param request - Batch request with recipients
     * @returns Aggregated results
     */
    async sendBatch(request) {
        const results = [];
        let successful = 0;
        let failed = 0;
        for (const recipient of request.recipients) {
            const result = await this.sendTemplateMessage({
                tenantId: request.tenantId,
                channelAccountId: request.channelAccountId,
                templateName: request.templateName,
                language: request.language,
                broadcastId: request.broadcastId,
                recipient: recipient.recipient,
                customerId: recipient.customerId,
                variables: recipient.variables,
            });
            results.push(result);
            if (result.success) {
                successful++;
            }
            else {
                failed++;
            }
        }
        return {
            totalRequested: request.recipients.length,
            successful,
            failed,
            results,
        };
    }
    /**
     * Verify credentials for a channel account.
     *
     * @param channelAccountId - Channel account to verify
     * @param tenantId - Tenant ID for authorization
     * @returns Verification result
     */
    async verifyChannelAccountCredentials(channelAccountId, tenantId) {
        const channelAccount = await this.channelAccountRepo.findByIdAndTenant(channelAccountId, tenantId);
        if (!channelAccount) {
            return {
                valid: false,
                error: 'Channel account not found',
            };
        }
        try {
            const provider = await this.providerFactory.createProviderForChannelAccount(channelAccountId);
            const result = await provider.verifyCredentials();
            return {
                valid: result.valid,
                error: result.error,
                accountInfo: result.accountInfo,
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            return {
                valid: false,
                error: errorMessage,
            };
        }
    }
    /**
     * Get templates from provider for a channel account.
     *
     * @param channelAccountId - Channel account ID
     * @param tenantId - Tenant ID for authorization
     * @returns List of templates from provider
     */
    async getProviderTemplates(channelAccountId, tenantId) {
        const channelAccount = await this.channelAccountRepo.findByIdAndTenant(channelAccountId, tenantId);
        if (!channelAccount) {
            return {
                success: false,
                error: 'Channel account not found',
            };
        }
        try {
            const provider = await this.providerFactory.createProviderForChannelAccount(channelAccountId);
            if (!provider.getTemplates) {
                return {
                    success: false,
                    error: 'Provider does not support template listing',
                };
            }
            const templates = await provider.getTemplates();
            return {
                success: true,
                templates,
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            return {
                success: false,
                error: errorMessage,
            };
        }
    }
    /**
     * Get a provider instance for a channel account (for advanced use cases).
     *
     * @param channelAccountId - Channel account ID
     * @returns Initialized provider instance
     */
    async getProviderForChannelAccount(channelAccountId) {
        return this.providerFactory.createProviderForChannelAccount(channelAccountId);
    }
    /**
     * Get a provider instance for a tenant's default channel account.
     *
     * @param tenantId - Tenant ID
     * @param channelCode - Channel code (e.g., 'whatsapp')
     * @returns Initialized provider instance
     */
    async getProviderForTenantChannel(tenantId, channelCode) {
        return this.providerFactory.createProviderForTenantChannel(tenantId, channelCode);
    }
    // Private helper methods
    /**
     * Create a message log entry for tracking.
     */
    async createMessageLog(request, channelAccount) {
        const logData = {
            tenantId: request.tenantId,
            broadcastId: request.broadcastId || null,
            customerId: request.customerId || null,
            channelAccountId: request.channelAccountId,
            channelId: channelAccount.channelId,
            providerId: channelAccount.providerId,
            recipient: request.recipient,
            templateData: {
                templateName: request.templateName,
                language: request.language,
                variables: request.variables,
                mediaUrl: request.mediaUrl,
            },
        };
        return this.messageLogRepo.create(logData);
    }
};
exports.MessagingService = MessagingService;
exports.MessagingService = MessagingService = __decorate([
    (0, tsyringe_1.singleton)(),
    __param(0, (0, tsyringe_1.inject)(provider_factory_1.ProviderFactory)),
    __param(1, (0, tsyringe_1.inject)(message_log_repository_1.MessageLogRepository)),
    __param(2, (0, tsyringe_1.inject)(channel_account_repository_1.ChannelAccountRepository)),
    __metadata("design:paramtypes", [provider_factory_1.ProviderFactory,
        message_log_repository_1.MessageLogRepository,
        channel_account_repository_1.ChannelAccountRepository])
], MessagingService);
