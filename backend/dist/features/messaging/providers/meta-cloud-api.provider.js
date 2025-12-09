"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetaCloudApiProvider = void 0;
const axios_1 = __importDefault(require("axios"));
const crypto = __importStar(require("crypto"));
const message_log_entity_1 = require("../../message-logs/message-log.entity");
const logger_config_1 = require("../../../config/logger.config");
/**
 * Custom error for unsupported content types.
 */
class UnsupportedContentTypeError extends Error {
    constructor(contentType) {
        super(`Unsupported content type: ${contentType}`);
        this.name = 'UnsupportedContentTypeError';
    }
}
/**
 * Custom error for validation failures.
 */
class ValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ValidationError';
    }
}
/**
 * Meta Cloud API Provider Implementation.
 * Integrates with Meta's WhatsApp Business Cloud API.
 *
 * @see https://developers.facebook.com/docs/whatsapp/cloud-api
 */
class MetaCloudApiProvider {
    providerCode = 'meta_cloud_api';
    channelCode = 'whatsapp';
    credentials = null;
    client = null;
    apiVersion = 'v18.0';
    baseUrl = 'https://graph.facebook.com';
    /**
     * Initialize provider with decrypted credentials.
     */
    async initialize(credentials) {
        this.credentials = {
            phoneNumberId: credentials.phoneNumberId,
            whatsappBusinessAccountId: credentials.whatsappBusinessAccountId,
            accessToken: credentials.accessToken,
            appId: credentials.appId,
            appSecret: credentials.appSecret,
        };
        this.client = axios_1.default.create({
            baseURL: `${this.baseUrl}/${this.apiVersion}`,
            headers: {
                'Authorization': `Bearer ${this.credentials.accessToken}`,
                'Content-Type': 'application/json',
            },
            timeout: parseInt(process.env.PROVIDER_TIMEOUT_MS || '30000', 10),
        });
        logger_config_1.logger.debug('MetaCloudApiProvider initialized', {
            phoneNumberId: this.credentials.phoneNumberId,
            wabaId: this.credentials.whatsappBusinessAccountId,
        });
    }
    /**
     * Send a template message via Meta Cloud API.
     *
     * @see https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages
     */
    async sendTemplateMessage(request) {
        if (!this.client || !this.credentials) {
            return {
                success: false,
                error: {
                    code: 'NOT_INITIALIZED',
                    message: 'Provider not initialized. Call initialize() first.',
                    retryable: false,
                },
            };
        }
        try {
            const payload = this.buildTemplatePayload(request);
            logger_config_1.logger.debug('Sending template message', {
                phoneNumberId: this.credentials.phoneNumberId,
                recipient: request.recipient,
                templateName: request.templateName,
                messageLogId: request.messageLogId,
            });
            const response = await this.client.post(`/${this.credentials.phoneNumberId}/messages`, payload);
            const providerMessageId = response.data.messages[0]?.id;
            logger_config_1.logger.info('Template message sent successfully', {
                providerMessageId,
                recipient: request.recipient,
                templateName: request.templateName,
                messageLogId: request.messageLogId,
            });
            return {
                success: true,
                providerMessageId,
                timestamp: new Date(),
                rawResponse: response.data,
            };
        }
        catch (error) {
            return this.handleSendError(error, request);
        }
    }
    /**
     * Send a freeform message (text or media) via Meta Cloud API.
     * Used for inbox/chat functionality within 24-hour messaging window.
     *
     * @see https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages
     */
    async sendFreeformMessage(request) {
        if (!this.client || !this.credentials) {
            return {
                success: false,
                error: {
                    code: 'NOT_INITIALIZED',
                    message: 'Provider not initialized. Call initialize() first.',
                    retryable: false,
                },
            };
        }
        try {
            const payload = this.buildFreeformPayload(request);
            logger_config_1.logger.debug('Sending freeform message', {
                phoneNumberId: this.credentials.phoneNumberId,
                recipient: request.recipient,
                contentType: request.contentType,
                messageId: request.messageId,
            });
            const response = await this.client.post(`/${this.credentials.phoneNumberId}/messages`, payload);
            const providerMessageId = response.data.messages[0]?.id;
            logger_config_1.logger.info('Freeform message sent successfully', {
                providerMessageId,
                recipient: request.recipient,
                contentType: request.contentType,
                messageId: request.messageId,
            });
            return {
                success: true,
                providerMessageId,
                timestamp: new Date(),
                rawResponse: response.data,
            };
        }
        catch (error) {
            return this.handleFreeformSendError(error, request);
        }
    }
    /**
     * Validate Meta webhook signature using SHA-256 HMAC.
     *
     * @see https://developers.facebook.com/docs/whatsapp/cloud-api/guides/set-up-webhooks
     */
    validateWebhookSignature(payload, signature, secret) {
        if (!signature) {
            logger_config_1.logger.warn('Missing webhook signature');
            return false;
        }
        const payloadString = Buffer.isBuffer(payload) ? payload.toString('utf8') : payload;
        // Meta signature format: "sha256=<hash>"
        const expectedSignature = `sha256=${crypto
            .createHmac('sha256', secret)
            .update(payloadString)
            .digest('hex')}`;
        const isValid = crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
        if (!isValid) {
            logger_config_1.logger.warn('Invalid webhook signature', {
                receivedSignature: signature.substring(0, 20) + '...',
            });
        }
        return isValid;
    }
    /**
     * Parse Meta webhook payload into standardized events.
     *
     * Handles both message-related webhooks and template status update webhooks.
     *
     * @see https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/components
     * @see https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/components#message_template_status_update
     */
    parseWebhookPayload(payload) {
        const events = [];
        if (!this.isMetaWebhookPayload(payload)) {
            logger_config_1.logger.warn('Invalid Meta webhook payload structure');
            return events;
        }
        for (const entry of payload.entry) {
            for (const change of entry.changes) {
                // Handle template status updates
                if (change.field === 'message_template_status_update') {
                    const templateStatusEvent = this.parseTemplateStatusChange(entry.id, change.value);
                    if (templateStatusEvent) {
                        events.push(templateStatusEvent);
                    }
                    continue;
                }
                // Handle message-related webhooks
                if (change.field !== 'messages')
                    continue;
                const value = change.value;
                // Process status updates
                if (value.statuses) {
                    for (const status of value.statuses) {
                        events.push({
                            type: status.errors ? 'error' : 'status_update',
                            providerMessageId: status.id,
                            status: this.mapMetaStatus(status.status),
                            timestamp: new Date(parseInt(status.timestamp, 10) * 1000),
                            error: status.errors?.[0]
                                ? {
                                    code: String(status.errors[0].code),
                                    message: status.errors[0].title || status.errors[0].message || 'Unknown error',
                                }
                                : undefined,
                            rawEvent: status,
                        });
                    }
                }
                // Process incoming messages
                if (value.messages) {
                    for (const message of value.messages) {
                        // Find matching contact for this message to get profile name
                        const contact = value.contacts?.find((c) => c.wa_id === message.from);
                        events.push({
                            type: 'message_received',
                            providerMessageId: message.id,
                            timestamp: new Date(parseInt(message.timestamp, 10) * 1000),
                            rawEvent: {
                                ...message,
                                metadata: value.metadata,
                                senderName: contact?.profile?.name,
                            },
                        });
                    }
                }
            }
        }
        return events;
    }
    /**
     * Parse a template status change webhook into a WebhookEvent.
     *
     * Meta sends template status updates when templates are approved, rejected,
     * disabled, etc.
     *
     * @param whatsappBusinessAccountId - The WABA ID from the webhook entry
     * @param value - The template status webhook value
     * @returns A WebhookEvent with template status information, or null if parsing fails
     */
    parseTemplateStatusChange(whatsappBusinessAccountId, value) {
        if (!value.event || !value.message_template_name || !value.message_template_language) {
            logger_config_1.logger.warn('Template status webhook missing required fields', {
                hasEvent: !!value.event,
                hasName: !!value.message_template_name,
                hasLanguage: !!value.message_template_language,
            });
            return null;
        }
        // Map the event to our MetaTemplateStatus type
        const newStatus = this.mapMetaTemplateStatusEvent(value.event);
        logger_config_1.logger.info('Parsed template status webhook', {
            templateName: value.message_template_name,
            language: value.message_template_language,
            newStatus,
            reason: value.reason,
            whatsappBusinessAccountId,
        });
        return {
            type: 'template_status_update',
            providerMessageId: String(value.message_template_id),
            timestamp: new Date(),
            rawEvent: value,
            templateInfo: {
                templateName: value.message_template_name,
                language: value.message_template_language,
                newStatus,
                reason: value.reason || value.other_info?.description,
                messageTemplateId: String(value.message_template_id),
                whatsappBusinessAccountId,
            },
        };
    }
    /**
     * Map Meta template status event string to MetaTemplateStatus type.
     *
     * Meta sends various event types for template status changes.
     */
    mapMetaTemplateStatusEvent(event) {
        const eventMap = {
            APPROVED: 'APPROVED',
            REJECTED: 'REJECTED',
            PENDING_DELETION: 'PENDING_DELETION',
            DISABLED: 'DISABLED',
            PENDING: 'PENDING',
            PAUSED: 'PAUSED',
            IN_APPEAL: 'IN_APPEAL',
            FLAGGED: 'FLAGGED',
            LIMIT_EXCEEDED: 'LIMIT_EXCEEDED',
            // Handle lowercase variants
            approved: 'APPROVED',
            rejected: 'REJECTED',
            pending_deletion: 'PENDING_DELETION',
            disabled: 'DISABLED',
            pending: 'PENDING',
            paused: 'PAUSED',
            in_appeal: 'IN_APPEAL',
            flagged: 'FLAGGED',
            limit_exceeded: 'LIMIT_EXCEEDED',
        };
        return eventMap[event] || 'PENDING';
    }
    /**
     * Verify credentials are valid by making a test API call.
     * Returns extended account information for display purposes.
     */
    async verifyCredentials() {
        if (!this.client || !this.credentials) {
            return {
                valid: false,
                error: 'Provider not initialized',
            };
        }
        try {
            // Get phone number details to verify credentials
            const response = await this.client.get(`/${this.credentials.phoneNumberId}`, {
                params: {
                    fields: 'verified_name,display_phone_number,quality_rating,messaging_limit_tier',
                },
            });
            return {
                valid: true,
                accountInfo: {
                    businessName: response.data.verified_name,
                    displayPhoneNumber: response.data.display_phone_number,
                    qualityRating: response.data.quality_rating,
                    messagingLimitTier: response.data.messaging_limit_tier,
                },
            };
        }
        catch (error) {
            const axiosError = error;
            const errorMessage = axiosError.response?.data?.error?.message || axiosError.message || 'Unknown error';
            logger_config_1.logger.error('Credential verification failed', {
                error: errorMessage,
                code: axiosError.response?.data?.error?.code,
            });
            return {
                valid: false,
                error: errorMessage,
            };
        }
    }
    /**
     * Get all templates from the WhatsApp Business Account.
     */
    async getTemplates() {
        if (!this.client || !this.credentials) {
            throw new Error('Provider not initialized');
        }
        const templates = [];
        let hasMore = true;
        let cursor;
        while (hasMore) {
            const response = await this.client.get(`/${this.credentials.whatsappBusinessAccountId}/message_templates`, {
                params: {
                    fields: 'id,name,language,status,category,components',
                    limit: 100,
                    ...(cursor ? { after: cursor } : {}),
                },
            });
            for (const template of response.data.data) {
                templates.push({
                    id: template.id,
                    name: template.name,
                    language: template.language,
                    status: this.mapTemplateStatus(template.status),
                    category: template.category,
                    components: template.components,
                });
            }
            cursor = response.data.paging?.cursors?.after;
            hasMore = !!response.data.paging?.next;
        }
        logger_config_1.logger.debug('Fetched templates from Meta', {
            count: templates.length,
            wabaId: this.credentials.whatsappBusinessAccountId,
        });
        return templates;
    }
    /**
     * Get status of a specific template.
     */
    async getTemplateStatus(templateName) {
        if (!this.client || !this.credentials) {
            throw new Error('Provider not initialized');
        }
        const response = await this.client.get(`/${this.credentials.whatsappBusinessAccountId}/message_templates`, {
            params: {
                name: templateName,
                fields: 'status,rejected_reason',
            },
        });
        const template = response.data.data[0];
        if (!template) {
            return {
                status: 'rejected',
                rejectionReason: 'Template not found',
            };
        }
        return {
            status: this.mapTemplateStatus(template.status),
            rejectionReason: template.rejected_reason,
        };
    }
    /**
     * Get rate limit info (Meta doesn't expose this directly via API).
     */
    async getRateLimitInfo() {
        // Meta rate limits are based on tier and not directly queryable
        // Return static info based on common tiers
        return {
            messagesPerSecond: 80, // Standard tier
        };
    }
    /**
     * Create a message template on Meta's WhatsApp Business Platform.
     *
     * @see https://developers.facebook.com/docs/whatsapp/business-management-api/message-templates
     */
    async createTemplate(request) {
        if (!this.client || !this.credentials) {
            return {
                success: false,
                error: {
                    code: 'NOT_INITIALIZED',
                    message: 'Provider not initialized. Call initialize() first.',
                    retryable: false,
                },
            };
        }
        try {
            logger_config_1.logger.debug('Creating template on Meta', {
                name: request.name,
                language: request.language,
                category: request.category,
                wabaId: this.credentials.whatsappBusinessAccountId,
            });
            const response = await this.client.post(`/${this.credentials.whatsappBusinessAccountId}/message_templates`, {
                name: request.name,
                language: request.language,
                category: request.category,
                components: request.components,
            });
            logger_config_1.logger.info('Template created successfully on Meta', {
                templateId: response.data.id,
                templateName: request.name,
                language: request.language,
                status: response.data.status,
            });
            return {
                success: true,
                id: response.data.id,
                status: response.data.status,
            };
        }
        catch (error) {
            return this.handleCreateTemplateError(error, request);
        }
    }
    /**
     * Check if an error indicates a rate limit condition from Meta.
     *
     * Meta rate limit error codes:
     * - 4: API Too Many Calls
     * - 17: User request limit reached
     * - 341: Application request limit reached
     * - 368: Temporarily blocked for violating WhatsApp policies
     *
     * @param error - The error object to check
     * @returns True if the error indicates a rate limit condition
     *
     * @see https://developers.facebook.com/docs/whatsapp/cloud-api/support/error-codes
     */
    isRateLimitError(error) {
        if (!error || typeof error !== 'object') {
            return false;
        }
        const axiosError = error;
        const errorCode = axiosError.response?.data?.error?.code;
        if (typeof errorCode !== 'number') {
            return false;
        }
        const rateLimitCodes = [4, 17, 341, 368];
        return rateLimitCodes.includes(errorCode);
    }
    /**
     * Extract the Retry-After value from an error response.
     *
     * Meta may include a Retry-After header indicating how long to wait
     * before retrying.
     *
     * @param error - The error object to extract from
     * @returns Number of seconds to wait, or undefined if not present
     */
    extractRetryAfter(error) {
        if (!error || typeof error !== 'object') {
            return undefined;
        }
        const axiosError = error;
        const retryAfterHeader = axiosError.response?.headers?.['retry-after'];
        if (!retryAfterHeader || typeof retryAfterHeader !== 'string') {
            return undefined;
        }
        const parsed = parseInt(retryAfterHeader, 10);
        return isNaN(parsed) ? undefined : parsed;
    }
    /**
     * Get the download URL for a media file from Meta's CDN.
     *
     * Meta's media URLs are temporary and expire after ~24 hours.
     * This method retrieves the CDN URL for a media file by its ID.
     *
     * @see https://developers.facebook.com/docs/whatsapp/cloud-api/reference/media#get-media-url
     *
     * @param mediaId - The media ID from the webhook payload
     * @returns The temporary CDN URL for the media file
     * @throws Error if the request fails or provider is not initialized
     */
    async getMediaUrl(mediaId) {
        if (!this.client || !this.credentials) {
            throw new Error('Provider not initialized. Call initialize() first.');
        }
        try {
            const response = await this.client.get(`/${mediaId}`);
            logger_config_1.logger.debug('Retrieved media URL from Meta', {
                mediaId,
                mimeType: response.data.mime_type,
                fileSize: response.data.file_size,
            });
            return response.data.url;
        }
        catch (error) {
            const axiosError = error;
            const errorMessage = axiosError.response?.data?.error?.message || axiosError.message || 'Unknown error';
            logger_config_1.logger.error('Failed to get media URL from Meta', {
                mediaId,
                error: errorMessage,
                code: axiosError.response?.data?.error?.code,
            });
            throw new Error(`Failed to get media URL: ${errorMessage}`);
        }
    }
    /**
     * Download media content from Meta's CDN.
     *
     * The URL returned by getMediaUrl requires the access token as a Bearer header.
     * This method downloads the actual binary content of the media file.
     *
     * @see https://developers.facebook.com/docs/whatsapp/cloud-api/reference/media#download-media
     *
     * @param url - The CDN URL from getMediaUrl
     * @returns The media content as a Buffer with its content type
     * @throws Error if the download fails or provider is not initialized
     */
    async downloadMedia(url) {
        if (!this.credentials) {
            throw new Error('Provider not initialized. Call initialize() first.');
        }
        try {
            const response = await axios_1.default.get(url, {
                headers: {
                    Authorization: `Bearer ${this.credentials.accessToken}`,
                },
                responseType: 'arraybuffer',
                timeout: parseInt(process.env.MEDIA_DOWNLOAD_TIMEOUT_MS || '60000', 10),
            });
            const contentType = response.headers['content-type'] || 'application/octet-stream';
            logger_config_1.logger.debug('Downloaded media from Meta CDN', {
                contentType,
                size: response.data.length,
            });
            return {
                data: Buffer.from(response.data),
                contentType,
            };
        }
        catch (error) {
            const axiosError = error;
            logger_config_1.logger.error('Failed to download media from Meta CDN', {
                url: url.substring(0, 50) + '...', // Truncate URL for security
                error: axiosError.message,
                status: axiosError.response?.status,
            });
            throw new Error(`Failed to download media: ${axiosError.message}`);
        }
    }
    // Private helper methods
    /**
     * Build the freeform message payload for Meta API.
     */
    buildFreeformPayload(request) {
        const base = {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: this.normalizePhoneNumber(request.recipient),
        };
        switch (request.contentType) {
            case 'text':
                return {
                    ...base,
                    type: 'text',
                    text: {
                        preview_url: true,
                        body: request.content.text,
                    },
                };
            case 'image':
                return {
                    ...base,
                    type: 'image',
                    image: {
                        link: request.content.mediaUrl,
                        caption: request.content.caption,
                    },
                };
            case 'video':
                return {
                    ...base,
                    type: 'video',
                    video: {
                        link: request.content.mediaUrl,
                        caption: request.content.caption,
                    },
                };
            case 'audio':
                return {
                    ...base,
                    type: 'audio',
                    audio: {
                        link: request.content.mediaUrl,
                    },
                };
            case 'document':
                return {
                    ...base,
                    type: 'document',
                    document: {
                        link: request.content.mediaUrl,
                        filename: request.content.filename || 'document',
                        caption: request.content.caption,
                    },
                };
            case 'location':
                return this.buildLocationPayload(base.to, request.content.location);
            case 'contact':
                return this.buildContactPayload(base.to, request.content.contact);
            case 'reaction':
                return this.buildReactionPayload(base.to, request.content.reaction);
            case 'sticker':
                return this.buildStickerPayload(base.to, request.content.sticker);
            case 'interactive_list':
                return this.buildInteractiveListPayload(base.to, request.content.interactiveList);
            case 'interactive_buttons':
                return this.buildInteractiveButtonPayload(base.to, request.content.interactiveButtons);
            default:
                throw new UnsupportedContentTypeError(request.contentType);
        }
    }
    /**
     * Build location message payload for Meta API.
     * @see https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages#location-object
     */
    buildLocationPayload(to, content) {
        return {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to,
            type: 'location',
            location: {
                latitude: content.latitude.toString(),
                longitude: content.longitude.toString(),
                name: content.name,
                address: content.address,
            },
        };
    }
    /**
     * Build contact message payload for Meta API.
     * @see https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages#contacts-object
     */
    buildContactPayload(to, content) {
        return {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to,
            type: 'contacts',
            contacts: [
                {
                    name: content.name,
                    phones: content.phones,
                    emails: content.emails,
                },
            ],
        };
    }
    /**
     * Build reaction message payload for Meta API.
     * @see https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages#reaction-object
     */
    buildReactionPayload(to, content) {
        return {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to,
            type: 'reaction',
            reaction: {
                message_id: content.messageId,
                emoji: content.emoji,
            },
        };
    }
    /**
     * Build sticker message payload for Meta API.
     * @see https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages#sticker-object
     */
    buildStickerPayload(to, content) {
        return {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to,
            type: 'sticker',
            sticker: content.mediaId ? { id: content.mediaId } : { link: content.mediaUrl },
        };
    }
    /**
     * Build interactive list message payload for Meta API.
     * @see https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages#interactive-object
     */
    buildInteractiveListPayload(to, content) {
        // Validate max 10 sections
        if (content.sections.length > 10) {
            throw new ValidationError('Interactive list messages support a maximum of 10 sections');
        }
        return {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to,
            type: 'interactive',
            interactive: {
                type: 'list',
                header: content.header ? { type: 'text', text: content.header } : undefined,
                body: { text: content.body },
                footer: content.footer ? { text: content.footer } : undefined,
                action: {
                    button: content.buttonText,
                    sections: content.sections.map((section) => ({
                        title: section.title,
                        rows: section.rows,
                    })),
                },
            },
        };
    }
    /**
     * Build interactive button message payload for Meta API.
     * @see https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages#interactive-object
     */
    buildInteractiveButtonPayload(to, content) {
        // Validate max 3 buttons
        if (content.buttons.length > 3) {
            throw new ValidationError('Interactive button messages support a maximum of 3 buttons');
        }
        // Validate button title max 20 characters
        for (const button of content.buttons) {
            if (button.title.length > 20) {
                throw new ValidationError(`Button title must not exceed 20 characters: "${button.title}"`);
            }
        }
        return {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to,
            type: 'interactive',
            interactive: {
                type: 'button',
                header: content.header ? { type: 'text', text: content.header } : undefined,
                body: { text: content.body },
                footer: content.footer ? { text: content.footer } : undefined,
                action: {
                    buttons: content.buttons.map((btn) => ({
                        type: 'reply',
                        reply: {
                            id: btn.id,
                            title: btn.title,
                        },
                    })),
                },
            },
        };
    }
    /**
     * Build the template message payload for Meta API.
     */
    buildTemplatePayload(request) {
        const components = [];
        // Header component
        if (request.variables.header && request.variables.header.length > 0) {
            const headerParams = request.variables.header.map((v) => this.buildParameterObject(v));
            components.push({
                type: 'header',
                parameters: headerParams,
            });
        }
        // Body component
        if (request.variables.body && request.variables.body.length > 0) {
            const bodyParams = request.variables.body.map((v) => this.buildParameterObject(v));
            components.push({
                type: 'body',
                parameters: bodyParams,
            });
        }
        // Button components
        if (request.variables.buttons && request.variables.buttons.length > 0) {
            for (const button of request.variables.buttons) {
                const buttonParams = button.parameters.map((v) => this.buildParameterObject(v));
                components.push({
                    type: 'button',
                    sub_type: button.subType,
                    index: button.index,
                    parameters: buttonParams,
                });
            }
        }
        return {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: this.normalizePhoneNumber(request.recipient),
            type: 'template',
            template: {
                name: request.templateName,
                language: {
                    code: request.language,
                },
                components: components.length > 0 ? components : undefined,
            },
        };
    }
    /**
     * Build a parameter object for the Meta API based on variable type.
     */
    buildParameterObject(variable) {
        switch (variable.type) {
            case 'text':
                return { type: 'text', text: variable.value };
            case 'currency': {
                // Value should be in format: "code|amount|fallback_value"
                const [currencyCode, amount, fallback] = variable.value.split('|');
                return {
                    type: 'currency',
                    currency: {
                        code: currencyCode,
                        amount_1000: parseInt(amount, 10),
                        fallback_value: fallback,
                    },
                };
            }
            case 'datetime':
                return {
                    type: 'date_time',
                    date_time: {
                        fallback_value: variable.value,
                    },
                };
            case 'image':
                return { type: 'image', image: { link: variable.value } };
            case 'video':
                return { type: 'video', video: { link: variable.value } };
            case 'document':
                return { type: 'document', document: { link: variable.value } };
            default:
                return { type: 'text', text: variable.value };
        }
    }
    /**
     * Normalize phone number to E.164 format without leading +.
     */
    normalizePhoneNumber(phoneNumber) {
        // Remove any non-digit characters except leading +
        let normalized = phoneNumber.replace(/[^\d+]/g, '');
        // Remove leading + if present
        if (normalized.startsWith('+')) {
            normalized = normalized.substring(1);
        }
        return normalized;
    }
    /**
     * Map Meta status string to internal MessageStatus enum.
     */
    mapMetaStatus(status) {
        const statusMap = {
            sent: message_log_entity_1.MessageStatus.SENT,
            delivered: message_log_entity_1.MessageStatus.DELIVERED,
            read: message_log_entity_1.MessageStatus.READ,
            failed: message_log_entity_1.MessageStatus.FAILED,
        };
        return statusMap[status.toLowerCase()] || message_log_entity_1.MessageStatus.PENDING;
    }
    /**
     * Map Meta template status to internal format.
     */
    mapTemplateStatus(status) {
        const statusMap = {
            APPROVED: 'approved',
            PENDING: 'pending',
            REJECTED: 'rejected',
            DELETED: 'rejected',
            DISABLED: 'rejected',
            PAUSED: 'pending',
            IN_APPEAL: 'pending',
        };
        return statusMap[status.toUpperCase()] || 'pending';
    }
    /**
     * Type guard for Meta webhook payload.
     */
    isMetaWebhookPayload(payload) {
        if (typeof payload !== 'object' || payload === null)
            return false;
        const p = payload;
        return p.object === 'whatsapp_business_account' && Array.isArray(p.entry);
    }
    /**
     * Handle errors from send operations.
     */
    handleSendError(error, request) {
        const axiosError = error;
        const metaError = axiosError.response?.data?.error;
        const errorCode = metaError?.code?.toString() || 'UNKNOWN';
        const errorMessage = metaError?.message || axiosError.message || 'Unknown error';
        // Determine if error is retryable
        const retryableCodes = [
            1, // Unknown error (temporary)
            2, // Service temporarily unavailable
            4, // Rate limit
            17, // Rate limit
            341, // Rate limit
            368, // Temporarily blocked
            190, // Access token expired (might be refreshable)
        ];
        const retryable = metaError ? retryableCodes.includes(metaError.code) : false;
        logger_config_1.logger.error('Failed to send template message', {
            errorCode,
            errorMessage,
            retryable,
            recipient: request.recipient,
            templateName: request.templateName,
            messageLogId: request.messageLogId,
            httpStatus: axiosError.response?.status,
        });
        return {
            success: false,
            error: {
                code: errorCode,
                message: errorMessage,
                retryable,
            },
            rawResponse: axiosError.response?.data,
        };
    }
    /**
     * Handle errors from freeform send operations.
     */
    handleFreeformSendError(error, request) {
        // Handle unsupported content type error
        if (error instanceof UnsupportedContentTypeError) {
            logger_config_1.logger.error('Unsupported content type for freeform message', {
                contentType: request.contentType,
                recipient: request.recipient,
                messageId: request.messageId,
            });
            return {
                success: false,
                error: {
                    code: 'UNSUPPORTED_CONTENT_TYPE',
                    message: error.message,
                    retryable: false,
                },
            };
        }
        // Handle validation errors
        if (error instanceof ValidationError) {
            logger_config_1.logger.error('Validation error for freeform message', {
                contentType: request.contentType,
                recipient: request.recipient,
                messageId: request.messageId,
                validationError: error.message,
            });
            return {
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: error.message,
                    retryable: false,
                },
            };
        }
        const axiosError = error;
        const metaError = axiosError.response?.data?.error;
        const errorCode = metaError?.code?.toString() || 'UNKNOWN';
        const errorMessage = metaError?.message || axiosError.message || 'Unknown error';
        // Determine if error is retryable
        // Same logic as handleSendError for consistency
        const retryableCodes = [
            1, // Unknown error (temporary)
            2, // Service temporarily unavailable
            4, // Rate limit
            17, // Rate limit
            341, // Rate limit
            368, // Temporarily blocked
            190, // Access token expired (might be refreshable)
        ];
        const retryable = metaError ? retryableCodes.includes(metaError.code) : false;
        logger_config_1.logger.error('Failed to send freeform message', {
            errorCode,
            errorMessage,
            retryable,
            recipient: request.recipient,
            contentType: request.contentType,
            messageId: request.messageId,
            httpStatus: axiosError.response?.status,
        });
        return {
            success: false,
            error: {
                code: errorCode,
                message: errorMessage,
                retryable,
            },
            rawResponse: axiosError.response?.data,
        };
    }
    /**
     * Handle errors from template creation operations.
     *
     * @param error - The error thrown during template creation
     * @param request - The original template creation request
     * @returns Structured error response
     */
    handleCreateTemplateError(error, request) {
        const axiosError = error;
        const metaError = axiosError.response?.data?.error;
        const errorCode = metaError?.code?.toString() || 'UNKNOWN';
        const errorMessage = metaError?.message || axiosError.message || 'Unknown error';
        // Retryable error codes for template creation
        const retryableCodes = [
            1, // Unknown error (temporary)
            2, // Service temporarily unavailable
            4, // Rate limit
            17, // Rate limit
            341, // Rate limit
            368, // Temporarily blocked
            190, // Access token expired (might be refreshable)
        ];
        // Non-retryable template-specific error codes
        const nonRetryableCodes = [
            100, // Invalid parameter
            2388026, // Duplicate template name
            2388027, // Invalid template name format
        ];
        let retryable = false;
        if (metaError) {
            if (nonRetryableCodes.includes(metaError.code)) {
                retryable = false;
            }
            else if (retryableCodes.includes(metaError.code)) {
                retryable = true;
            }
        }
        logger_config_1.logger.error('Failed to create template on Meta', {
            errorCode,
            errorMessage,
            retryable,
            templateName: request.name,
            language: request.language,
            category: request.category,
            httpStatus: axiosError.response?.status,
        });
        return {
            success: false,
            error: {
                code: errorCode,
                message: errorMessage,
                retryable,
            },
        };
    }
}
exports.MetaCloudApiProvider = MetaCloudApiProvider;
