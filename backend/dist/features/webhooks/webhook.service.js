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
exports.WebhookService = void 0;
const tsyringe_1 = require("tsyringe");
const provider_factory_1 = require("../messaging/provider-factory");
const message_log_repository_1 = require("../message-logs/message-log.repository");
const channel_account_repository_1 = require("../channel-accounts/channel-account.repository");
const template_repository_1 = require("../templates/template.repository");
const template_sse_service_1 = require("../templates/template-sse.service");
const inbox_message_queue_1 = require("../../jobs/inbox-message.queue");
const message_log_entity_1 = require("../message-logs/message-log.entity");
const enums_1 = require("../templates/enums");
const credential_service_1 = require("../messaging/services/credential.service");
const logger_config_1 = require("../../config/logger.config");
/**
 * WebhookService handles incoming webhooks from messaging providers.
 *
 * Responsibilities:
 * 1. Verify webhook signatures
 * 2. Parse webhook payloads into standardized events
 * 3. Update message logs based on status events
 * 4. Handle webhook verification challenges (Meta)
 */
let WebhookService = class WebhookService {
    providerFactory;
    messageLogRepo;
    channelAccountRepo;
    templateRepo;
    templateSseService;
    credentialService;
    inboxMessageQueue;
    constructor(providerFactory, messageLogRepo, channelAccountRepo, templateRepo, templateSseService, credentialService, inboxMessageQueue) {
        this.providerFactory = providerFactory;
        this.messageLogRepo = messageLogRepo;
        this.channelAccountRepo = channelAccountRepo;
        this.templateRepo = templateRepo;
        this.templateSseService = templateSseService;
        this.credentialService = credentialService;
        this.inboxMessageQueue = inboxMessageQueue;
    }
    /**
     * Verify Meta webhook subscription.
     *
     * Meta sends a verification request when setting up webhooks.
     * We must return the challenge to complete verification.
     *
     * Checks the provided token against all stored per-channel verify tokens.
     * Falls back to META_WEBHOOK_VERIFY_TOKEN env var for backward compatibility.
     *
     * @param query - Query parameters from the request
     * @returns Verification result with challenge if valid
     */
    async verifyMetaWebhook(query) {
        const mode = query['hub.mode'];
        const token = query['hub.verify_token'];
        const challenge = query['hub.challenge'];
        // Log incoming verification request for debugging
        logger_config_1.logger.info('Meta webhook verification request received', {
            mode,
            hasToken: !!token,
            tokenLength: token?.length,
            tokenPreview: token ? `${token.substring(0, 8)}...` : null,
            challenge: challenge ? `${challenge.substring(0, 10)}...` : null,
        });
        if (mode !== 'subscribe') {
            logger_config_1.logger.warn('Meta webhook verification failed: invalid mode', { mode });
            return {
                valid: false,
                error: 'Invalid mode',
            };
        }
        if (!token) {
            logger_config_1.logger.warn('Meta webhook verification failed: missing token');
            return {
                valid: false,
                error: 'Missing verify token',
            };
        }
        // Check against per-channel stored verify tokens
        const channelAccounts = await this.channelAccountRepo.findAllWithWebhookConfig();
        logger_config_1.logger.info('Checking verify token against channel accounts', {
            channelAccountCount: channelAccounts.length,
        });
        for (const account of channelAccounts) {
            if (account.webhookSecretEncrypted && account.webhookSecretIv) {
                try {
                    const decrypted = await this.credentialService.decryptCredentials(account.webhookSecretEncrypted, account.webhookSecretIv);
                    const storedToken = decrypted.verifyToken;
                    logger_config_1.logger.debug('Comparing tokens for channel account', {
                        channelAccountId: account.id,
                        storedTokenPreview: storedToken ? `${storedToken.substring(0, 8)}...` : null,
                        storedTokenLength: storedToken?.length,
                        tokensMatch: storedToken === token,
                    });
                    if (storedToken === token) {
                        logger_config_1.logger.info('Meta webhook verified successfully', {
                            channelAccountId: account.id,
                        });
                        return {
                            valid: true,
                            challenge,
                        };
                    }
                }
                catch (error) {
                    logger_config_1.logger.warn('Failed to decrypt verify token for channel account', {
                        channelAccountId: account.id,
                        error: error instanceof Error ? error.message : 'Unknown error',
                    });
                }
            }
        }
        // Fallback: Check global env var for backward compatibility
        const globalToken = process.env.META_WEBHOOK_VERIFY_TOKEN;
        logger_config_1.logger.debug('Checking global token fallback', {
            hasGlobalToken: !!globalToken,
            globalTokenPreview: globalToken ? `${globalToken.substring(0, 8)}...` : null,
        });
        if (globalToken && token === globalToken) {
            logger_config_1.logger.info('Meta webhook verified using global token');
            return {
                valid: true,
                challenge,
            };
        }
        logger_config_1.logger.warn('Meta webhook verification failed: no matching token found', {
            checkedChannelAccounts: channelAccounts.length,
            hasGlobalToken: !!globalToken,
        });
        return {
            valid: false,
            error: 'Invalid verify token',
        };
    }
    /**
     * Process a Meta webhook payload.
     *
     * @param payload - Raw webhook payload
     * @param signature - X-Hub-Signature-256 header value
     * @returns Processing result
     */
    async processMetaWebhook(payload, signature) {
        // 1. Get provider for signature validation
        const provider = this.providerFactory.createProviderForWebhook('meta_cloud_api');
        // 2. Parse payload first to extract phone_number_id for channel lookup
        const payloadString = Buffer.isBuffer(payload) ? payload.toString('utf8') : payload;
        let parsedPayload;
        try {
            parsedPayload = JSON.parse(payloadString);
        }
        catch (error) {
            logger_config_1.logger.error('Failed to parse Meta webhook payload', { error });
            return {
                success: false,
                eventsProcessed: 0,
                errors: ['Invalid JSON payload'],
            };
        }
        // 3. Extract phone_number_id from webhook payload to find channel account
        const phoneNumberId = this.extractPhoneNumberIdFromPayload(parsedPayload);
        if (!phoneNumberId) {
            logger_config_1.logger.error('Could not extract phone_number_id from webhook payload');
            return {
                success: false,
                eventsProcessed: 0,
                errors: ['Missing phone_number_id in webhook payload'],
            };
        }
        // 4. Find channel account and get appSecret from credentials
        const channelAccount = await this.channelAccountRepo.findByPhoneNumberId(phoneNumberId);
        if (!channelAccount) {
            logger_config_1.logger.error('Channel account not found for phone_number_id', { phoneNumberId });
            return {
                success: false,
                eventsProcessed: 0,
                errors: ['Channel account not found'],
            };
        }
        let appSecret;
        try {
            const credentials = await this.credentialService.decryptCredentials(channelAccount.encryptedCredentials, channelAccount.credentialsIv);
            appSecret = credentials.appSecret;
            if (!appSecret) {
                logger_config_1.logger.error('appSecret not found in channel account credentials', {
                    channelAccountId: channelAccount.id,
                });
                return {
                    success: false,
                    eventsProcessed: 0,
                    errors: ['Channel account missing appSecret in credentials'],
                };
            }
        }
        catch (error) {
            logger_config_1.logger.error('Failed to decrypt channel account credentials', {
                channelAccountId: channelAccount.id,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            return {
                success: false,
                eventsProcessed: 0,
                errors: ['Failed to decrypt channel credentials'],
            };
        }
        // 5. Validate signature using appSecret from channel account
        const isValid = provider.validateWebhookSignature(payload, signature, appSecret);
        if (!isValid) {
            logger_config_1.logger.warn('Meta webhook signature validation failed');
            return {
                success: false,
                eventsProcessed: 0,
                errors: ['Invalid webhook signature'],
            };
        }
        // 6. Parse into standardized events
        const events = provider.parseWebhookPayload(parsedPayload);
        if (events.length === 0) {
            logger_config_1.logger.debug('No events to process in Meta webhook');
            return {
                success: true,
                eventsProcessed: 0,
                errors: [],
            };
        }
        // 7. Process each event
        const errors = [];
        let eventsProcessed = 0;
        for (const event of events) {
            try {
                await this.processWebhookEvent(event);
                eventsProcessed++;
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                errors.push(`Failed to process event ${event.providerMessageId}: ${errorMessage}`);
                logger_config_1.logger.error('Failed to process webhook event', {
                    event,
                    error: errorMessage,
                });
            }
        }
        logger_config_1.logger.info('Meta webhook processed', {
            eventsProcessed,
            errors: errors.length,
        });
        return {
            success: errors.length === 0,
            eventsProcessed,
            errors,
        };
    }
    /**
     * Process a webhook event from any provider.
     *
     * @param providerCode - Provider code (e.g., 'meta_cloud_api')
     * @param payload - Raw webhook payload
     * @param signature - Signature header value
     * @param secret - Secret for signature validation
     * @returns Processing result
     */
    async processProviderWebhook(providerCode, payload, signature, secret) {
        // 1. Get provider for parsing
        const provider = this.providerFactory.createProviderForWebhook(providerCode);
        // 2. Validate signature
        const isValid = provider.validateWebhookSignature(payload, signature, secret);
        if (!isValid) {
            logger_config_1.logger.warn('Webhook signature validation failed', { providerCode });
            return {
                success: false,
                eventsProcessed: 0,
                errors: ['Invalid webhook signature'],
            };
        }
        // 3. Parse payload
        const payloadString = Buffer.isBuffer(payload) ? payload.toString('utf8') : payload;
        let parsedPayload;
        try {
            parsedPayload = JSON.parse(payloadString);
        }
        catch (error) {
            logger_config_1.logger.error('Failed to parse webhook payload', { providerCode, error });
            return {
                success: false,
                eventsProcessed: 0,
                errors: ['Invalid JSON payload'],
            };
        }
        // 4. Parse into standardized events
        const events = provider.parseWebhookPayload(parsedPayload);
        // 5. Process each event
        const errors = [];
        let eventsProcessed = 0;
        for (const event of events) {
            try {
                await this.processWebhookEvent(event);
                eventsProcessed++;
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                errors.push(`Failed to process event ${event.providerMessageId}: ${errorMessage}`);
            }
        }
        return {
            success: errors.length === 0,
            eventsProcessed,
            errors,
        };
    }
    // Private helper methods
    /**
     * Process a single webhook event.
     *
     * @param event - Standardized webhook event
     */
    async processWebhookEvent(event) {
        logger_config_1.logger.debug('Processing webhook event', {
            type: event.type,
            providerMessageId: event.providerMessageId,
            status: event.status,
        });
        switch (event.type) {
            case 'status_update':
                await this.processStatusUpdate(event);
                break;
            case 'error':
                await this.processErrorEvent(event);
                break;
            case 'message_received':
                await this.processInboundMessage(event);
                break;
            case 'template_status_update':
                await this.processTemplateStatusUpdate(event);
                break;
            default:
                logger_config_1.logger.warn('Unknown webhook event type', { event });
        }
    }
    /**
     * Process a message status update.
     *
     * @param event - Status update event
     */
    async processStatusUpdate(event) {
        if (!event.status) {
            logger_config_1.logger.warn('Status update missing status field', { event });
            return;
        }
        const messageLog = await this.messageLogRepo.findByProviderMessageId(event.providerMessageId);
        if (!messageLog) {
            logger_config_1.logger.warn('Message log not found for status update', {
                providerMessageId: event.providerMessageId,
            });
            return;
        }
        // Only update if the new status is "higher" than current
        // (prevent delivered → sent rollback due to out-of-order webhooks)
        if (!this.shouldUpdateStatus(messageLog.status, event.status)) {
            logger_config_1.logger.debug('Skipping status update - current status is same or higher', {
                messageLogId: messageLog.id,
                currentStatus: messageLog.status,
                newStatus: event.status,
            });
            return;
        }
        await this.messageLogRepo.updateStatus(messageLog.id, event.status);
        logger_config_1.logger.info('Message status updated', {
            messageLogId: messageLog.id,
            providerMessageId: event.providerMessageId,
            previousStatus: messageLog.status,
            newStatus: event.status,
        });
        // TODO: Update broadcast metrics if broadcastId is present
        // This will be added in Phase 6 integration
    }
    /**
     * Process an error event.
     *
     * @param event - Error event
     */
    async processErrorEvent(event) {
        const messageLog = await this.messageLogRepo.findByProviderMessageId(event.providerMessageId);
        if (!messageLog) {
            logger_config_1.logger.warn('Message log not found for error event', {
                providerMessageId: event.providerMessageId,
            });
            return;
        }
        await this.messageLogRepo.updateStatus(messageLog.id, message_log_entity_1.MessageStatus.FAILED, {
            errorMessage: event.error?.message,
            errorCode: event.error?.code,
        });
        logger_config_1.logger.error('Message delivery failed', {
            messageLogId: messageLog.id,
            providerMessageId: event.providerMessageId,
            errorCode: event.error?.code,
            errorMessage: event.error?.message,
        });
        // TODO: Update broadcast metrics if broadcastId is present
        // This will be added in Phase 6 integration
    }
    /**
     * Determine if status should be updated based on status hierarchy.
     *
     * Status hierarchy: pending < queued < sent < delivered < read
     * Failed is final and should not be overwritten except by read.
     *
     * @param currentStatus - Current message status
     * @param newStatus - New status from webhook
     * @returns true if status should be updated
     */
    shouldUpdateStatus(currentStatus, newStatus) {
        const statusOrder = {
            [message_log_entity_1.MessageStatus.PENDING]: 0,
            [message_log_entity_1.MessageStatus.QUEUED]: 1,
            [message_log_entity_1.MessageStatus.SENT]: 2,
            [message_log_entity_1.MessageStatus.DELIVERED]: 3,
            [message_log_entity_1.MessageStatus.READ]: 4,
            [message_log_entity_1.MessageStatus.FAILED]: 5, // Failed is typically final
        };
        // Allow update if new status is higher
        // Special case: Failed can be updated to Read (edge case where read comes after failed webhook)
        if (currentStatus === message_log_entity_1.MessageStatus.FAILED && newStatus === message_log_entity_1.MessageStatus.READ) {
            return true;
        }
        return statusOrder[newStatus] > statusOrder[currentStatus];
    }
    /**
     * Process an inbound message received event.
     *
     * Routes the message to the inbox queue for conversation creation/update.
     *
     * @param event - The message_received webhook event
     */
    async processInboundMessage(event) {
        // Extract phone_number_id from rawEvent metadata
        const rawMessage = event.rawEvent;
        const phoneNumberId = rawMessage.metadata?.phone_number_id;
        if (!phoneNumberId) {
            logger_config_1.logger.warn('Inbound message missing phone_number_id', {
                providerMessageId: event.providerMessageId,
            });
            return;
        }
        // Find channel account by phone_number_id
        const channelAccount = await this.channelAccountRepo.findByPhoneNumberId(phoneNumberId);
        if (!channelAccount) {
            logger_config_1.logger.warn('Channel account not found for phone_number_id', {
                phoneNumberId,
                providerMessageId: event.providerMessageId,
            });
            return;
        }
        // Queue for inbox processing
        await this.inboxMessageQueue.queueInboundProcessing({
            tenantId: channelAccount.tenantId,
            channelAccountId: channelAccount.id,
            providerMessageId: event.providerMessageId,
            fromNumber: rawMessage.from,
            messageType: rawMessage.type,
            content: this.extractMessageContent(rawMessage),
            timestamp: event.timestamp,
            rawEvent: event.rawEvent,
        });
        logger_config_1.logger.info('Inbound message queued for processing', {
            providerMessageId: event.providerMessageId,
            channelAccountId: channelAccount.id,
            phoneNumberId,
        });
    }
    /**
     * Extract phone_number_id from Meta webhook payload.
     *
     * Meta webhooks have the structure:
     * { entry: [{ changes: [{ value: { metadata: { phone_number_id: "..." } } }] }] }
     *
     * @param payload - Parsed webhook payload
     * @returns phone_number_id or undefined if not found
     */
    extractPhoneNumberIdFromPayload(payload) {
        try {
            const p = payload;
            return p.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id;
        }
        catch {
            return undefined;
        }
    }
    /**
     * Extract the message content based on message type.
     *
     * Returns the content object appropriate for the message type
     * (text body, image/video/audio/document object, etc.)
     *
     * @param rawMessage - The raw message from the webhook
     * @returns The extracted content object
     */
    extractMessageContent(rawMessage) {
        const msg = rawMessage;
        const type = msg.type;
        switch (type) {
            case 'text':
                return { text: msg.text?.body };
            case 'image':
                return msg.image;
            case 'document':
                return msg.document;
            case 'audio':
                return msg.audio;
            case 'video':
                return msg.video;
            default:
                return msg;
        }
    }
    /**
     * Process a template status update webhook.
     *
     * Meta sends template status webhooks when templates are approved, rejected,
     * disabled, etc. This method finds the matching template in the database
     * and updates its status, then emits an SSE event to notify the frontend.
     *
     * @param event - Template status update event
     */
    async processTemplateStatusUpdate(event) {
        const templateInfo = event.templateInfo;
        if (!templateInfo) {
            logger_config_1.logger.warn('Template status update missing templateInfo', { event });
            return;
        }
        const { templateName, language, newStatus, reason, whatsappBusinessAccountId, } = templateInfo;
        logger_config_1.logger.info('Processing template status update', {
            templateName,
            language,
            newStatus,
            whatsappBusinessAccountId,
        });
        // Map Meta status to internal TemplateStatus
        const internalStatus = this.mapMetaTemplateStatusToInternal(newStatus);
        // Find channel accounts that match this WABA ID
        // We need to check credentials to find the matching account
        const channelAccounts = await this.findChannelAccountsByWabaId(whatsappBusinessAccountId);
        if (channelAccounts.length === 0) {
            logger_config_1.logger.warn('No channel accounts found for WABA ID', {
                whatsappBusinessAccountId,
                templateName,
                language,
            });
            return;
        }
        // Process template status update for each matching channel account
        let updated = false;
        for (const { tenantId, channelAccountId } of channelAccounts) {
            const result = await this.templateRepo.updateStatusByNameAndLanguage(tenantId, channelAccountId, templateName, language, internalStatus);
            if (result.updated) {
                updated = true;
                // Emit SSE event to notify frontend
                this.templateSseService.emitTemplateStatusChange(tenantId, templateName, language, result.oldStatus || null, internalStatus, reason);
                logger_config_1.logger.info('Template status updated', {
                    tenantId,
                    channelAccountId,
                    templateName,
                    language,
                    oldStatus: result.oldStatus,
                    newStatus: internalStatus,
                    translationId: result.translationId,
                });
            }
        }
        if (!updated) {
            logger_config_1.logger.warn('Template not found for status update', {
                templateName,
                language,
                whatsappBusinessAccountId,
                checkedAccounts: channelAccounts.length,
            });
        }
    }
    /**
     * Find channel accounts by WhatsApp Business Account ID.
     *
     * Since WABA ID is stored in encrypted credentials, we need to decrypt
     * and check each active channel account's credentials.
     *
     * @param wabaId - WhatsApp Business Account ID from webhook
     * @returns Array of matching tenant ID and channel account ID pairs
     */
    async findChannelAccountsByWabaId(wabaId) {
        if (!wabaId) {
            return [];
        }
        const results = [];
        // Get all active channel accounts
        const channelAccounts = await this.channelAccountRepo.findAllActive();
        for (const account of channelAccounts) {
            try {
                // Decrypt credentials to check WABA ID
                const credentials = await this.credentialService.decryptCredentials(account.encryptedCredentials, account.credentialsIv);
                if (credentials.whatsappBusinessAccountId === wabaId) {
                    results.push({
                        tenantId: account.tenantId,
                        channelAccountId: account.id,
                    });
                }
            }
            catch (error) {
                // Skip accounts where decryption fails
                logger_config_1.logger.debug('Failed to decrypt credentials for channel account', {
                    channelAccountId: account.id,
                    error: error instanceof Error ? error.message : 'Unknown error',
                });
            }
        }
        return results;
    }
    /**
     * Map Meta template status to internal TemplateStatus enum.
     *
     * @param metaStatus - Status from Meta webhook
     * @returns Internal TemplateStatus value
     */
    mapMetaTemplateStatusToInternal(metaStatus) {
        const statusMap = {
            APPROVED: enums_1.TemplateStatus.APPROVED,
            REJECTED: enums_1.TemplateStatus.REJECTED,
            PENDING: enums_1.TemplateStatus.PENDING,
            PENDING_DELETION: enums_1.TemplateStatus.PENDING_DELETION,
            DISABLED: enums_1.TemplateStatus.DISABLED,
            PAUSED: enums_1.TemplateStatus.PAUSED,
            IN_APPEAL: enums_1.TemplateStatus.IN_APPEAL,
            FLAGGED: enums_1.TemplateStatus.FLAGGED,
            LIMIT_EXCEEDED: enums_1.TemplateStatus.LIMIT_EXCEEDED,
        };
        return statusMap[metaStatus] || enums_1.TemplateStatus.PENDING;
    }
};
exports.WebhookService = WebhookService;
exports.WebhookService = WebhookService = __decorate([
    (0, tsyringe_1.singleton)(),
    __param(0, (0, tsyringe_1.inject)(provider_factory_1.ProviderFactory)),
    __param(1, (0, tsyringe_1.inject)(message_log_repository_1.MessageLogRepository)),
    __param(2, (0, tsyringe_1.inject)(channel_account_repository_1.ChannelAccountRepository)),
    __param(3, (0, tsyringe_1.inject)(template_repository_1.TemplateRepository)),
    __param(4, (0, tsyringe_1.inject)(template_sse_service_1.TemplateSseService)),
    __param(5, (0, tsyringe_1.inject)(credential_service_1.CredentialService)),
    __param(6, (0, tsyringe_1.inject)(inbox_message_queue_1.InboxMessageQueue)),
    __metadata("design:paramtypes", [provider_factory_1.ProviderFactory,
        message_log_repository_1.MessageLogRepository,
        channel_account_repository_1.ChannelAccountRepository,
        template_repository_1.TemplateRepository,
        template_sse_service_1.TemplateSseService,
        credential_service_1.CredentialService,
        inbox_message_queue_1.InboxMessageQueue])
], WebhookService);
