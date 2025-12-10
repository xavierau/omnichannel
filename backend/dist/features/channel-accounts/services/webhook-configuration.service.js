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
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
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
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhookConfigurationService = void 0;
const tsyringe_1 = require("tsyringe");
const crypto = __importStar(require("crypto"));
const axios_1 = __importDefault(require("axios"));
const channel_account_repository_1 = require("../channel-account.repository");
const credential_service_1 = require("../../messaging/services/credential.service");
const logger_config_1 = require("../../../config/logger.config");
const http_exceptions_1 = require("../../../shared/exceptions/http-exceptions");
const url_validator_utils_1 = require("../../../shared/utils/url-validator.utils");
/**
 * Service responsible for webhook configuration management.
 *
 * Handles webhook settings, secret management, and webhook testing
 * for channel accounts. Extracted from ChannelAccountService to maintain
 * single responsibility principle.
 */
let WebhookConfigurationService = class WebhookConfigurationService {
    channelAccountRepo;
    credentialService;
    constructor(channelAccountRepo, credentialService) {
        this.channelAccountRepo = channelAccountRepo;
        this.credentialService = credentialService;
    }
    /**
     * Get webhook settings for a channel account.
     *
     * @param id - Channel account ID
     * @param tenantId - Tenant ID for authorization
     * @returns Webhook settings response
     * @throws NotFoundException if account not found
     */
    async getWebhookSettings(id, tenantId) {
        const account = await this.channelAccountRepo.findByIdAndTenant(id, tenantId);
        if (!account) {
            throw new http_exceptions_1.NotFoundException('Channel account not found');
        }
        const hasWebhookSecret = !!(account.webhookSecretEncrypted && account.webhookSecretIv);
        const webhookEventsEnabled = !!account.webhookUrl;
        return {
            webhookUrl: account.webhookUrl,
            hasWebhookSecret,
            webhookEventsEnabled,
        };
    }
    /**
     * Update webhook settings for a channel account.
     *
     * @param id - Channel account ID
     * @param tenantId - Tenant ID for authorization
     * @param dto - Update data containing webhookUrl or webhookEventsEnabled
     * @returns Updated webhook settings
     * @throws NotFoundException if account not found
     * @throws BadRequestException if webhookUrl is not HTTPS
     */
    async updateWebhookSettings(id, tenantId, dto) {
        const account = await this.channelAccountRepo.findByIdAndTenant(id, tenantId);
        if (!account) {
            throw new http_exceptions_1.NotFoundException('Channel account not found');
        }
        const updateData = {};
        // Handle webhookUrl update
        if (dto.webhookUrl !== undefined) {
            if (dto.webhookUrl === null) {
                // Clear webhook URL
                updateData.webhookUrl = null;
            }
            else {
                // Validate HTTPS
                if (!dto.webhookUrl.startsWith('https://')) {
                    throw new http_exceptions_1.BadRequestException('Webhook URL must use HTTPS');
                }
                updateData.webhookUrl = dto.webhookUrl;
                // Auto-generate secret if setting webhookUrl for the first time and no secret exists
                const needsSecret = !account.webhookSecretEncrypted && !account.webhookSecretIv;
                if (needsSecret) {
                    const secret = crypto.randomBytes(32).toString('hex');
                    const { encrypted, iv } = await this.credentialService.encryptString(secret);
                    updateData.webhookSecretEncrypted = encrypted;
                    updateData.webhookSecretIv = iv;
                    logger_config_1.logger.info('Auto-generated webhook secret for channel account', {
                        channelAccountId: id,
                        tenantId,
                    });
                }
            }
        }
        // Handle webhookEventsEnabled update (sets or clears webhookUrl indirectly)
        if (dto.webhookEventsEnabled !== undefined) {
            if (!dto.webhookEventsEnabled && dto.webhookUrl === undefined) {
                // Disable events by clearing webhook URL
                updateData.webhookUrl = null;
            }
        }
        await this.channelAccountRepo.update(id, tenantId, updateData);
        // Fetch fresh data
        const updated = await this.channelAccountRepo.findByIdAndTenant(id, tenantId);
        logger_config_1.logger.info('Webhook settings updated', {
            channelAccountId: id,
            tenantId,
            webhookUrl: updated?.webhookUrl ? '***' : null,
        });
        return {
            webhookUrl: updated?.webhookUrl || null,
            hasWebhookSecret: !!(updated?.webhookSecretEncrypted && updated?.webhookSecretIv),
            webhookEventsEnabled: !!updated?.webhookUrl,
        };
    }
    /**
     * Regenerate webhook secret for a channel account.
     *
     * @param id - Channel account ID
     * @param tenantId - Tenant ID for authorization
     * @returns New webhook secret (only time it's shown)
     * @throws NotFoundException if account not found
     * @throws BadRequestException if webhook URL is not configured
     */
    async regenerateWebhookSecret(id, tenantId) {
        const account = await this.channelAccountRepo.findByIdAndTenant(id, tenantId);
        if (!account) {
            throw new http_exceptions_1.NotFoundException('Channel account not found');
        }
        if (!account.webhookUrl) {
            throw new http_exceptions_1.BadRequestException('Webhook URL must be configured before generating a secret');
        }
        // Generate new secret: 32 bytes = 64 hex characters
        const secret = crypto.randomBytes(32).toString('hex');
        // Encrypt and store
        const { encrypted, iv } = await this.credentialService.encryptString(secret);
        await this.channelAccountRepo.update(id, tenantId, {
            webhookSecretEncrypted: encrypted,
            webhookSecretIv: iv,
        });
        logger_config_1.logger.info('Webhook secret regenerated', {
            channelAccountId: id,
            tenantId,
        });
        // Return the raw secret - this is the only time it's visible
        return { secret };
    }
    /**
     * Test webhook by dispatching a test payload.
     *
     * @param id - Channel account ID
     * @param tenantId - Tenant ID for authorization
     * @returns Test result
     * @throws NotFoundException if account not found
     */
    async testWebhook(id, tenantId) {
        const account = await this.channelAccountRepo.findByIdAndTenant(id, tenantId);
        if (!account) {
            throw new http_exceptions_1.NotFoundException('Channel account not found');
        }
        if (!account.webhookUrl) {
            return {
                success: false,
                error: 'Webhook URL is not configured',
            };
        }
        if (!account.webhookSecretEncrypted || !account.webhookSecretIv) {
            return {
                success: false,
                error: 'Webhook secret is not configured',
            };
        }
        // Validate URL for SSRF
        const allowHttp = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';
        const urlValidation = await (0, url_validator_utils_1.validateWebhookUrl)(account.webhookUrl, allowHttp);
        if (!urlValidation.isValid) {
            return {
                success: false,
                error: `URL validation failed: ${urlValidation.error}`,
            };
        }
        try {
            // Decrypt the webhook secret
            const secret = await this.credentialService.decryptString(account.webhookSecretEncrypted, account.webhookSecretIv);
            // Build test payload
            const timestamp = Math.floor(Date.now() / 1000).toString();
            const testPayload = {
                event: 'test',
                timestamp: new Date().toISOString(),
                channelAccountId: id,
                message: 'This is a test webhook from your omnichannel platform',
            };
            const payloadString = JSON.stringify(testPayload);
            // Create signature
            const signatureInput = `${timestamp}.${payloadString}`;
            const signature = `sha256=${crypto
                .createHmac('sha256', secret)
                .update(signatureInput)
                .digest('hex')}`;
            // Send the webhook
            await axios_1.default.post(account.webhookUrl, testPayload, {
                timeout: 30000,
                headers: {
                    'Content-Type': 'application/json',
                    'X-Webhook-Signature': signature,
                    'X-Webhook-Timestamp': timestamp,
                },
                validateStatus: (status) => status >= 200 && status < 300,
            });
            logger_config_1.logger.info('Webhook test successful', {
                channelAccountId: id,
                tenantId,
            });
            return { success: true };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger_config_1.logger.warn('Webhook test failed', {
                channelAccountId: id,
                tenantId,
                error: errorMessage,
            });
            return {
                success: false,
                error: errorMessage,
            };
        }
    }
};
exports.WebhookConfigurationService = WebhookConfigurationService;
exports.WebhookConfigurationService = WebhookConfigurationService = __decorate([
    (0, tsyringe_1.singleton)(),
    __param(0, (0, tsyringe_1.inject)(channel_account_repository_1.ChannelAccountRepository)),
    __param(1, (0, tsyringe_1.inject)(credential_service_1.CredentialService)),
    __metadata("design:paramtypes", [channel_account_repository_1.ChannelAccountRepository,
        credential_service_1.CredentialService])
], WebhookConfigurationService);
