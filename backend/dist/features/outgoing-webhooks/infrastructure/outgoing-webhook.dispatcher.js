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
exports.OutgoingWebhookDispatcher = void 0;
const tsyringe_1 = require("tsyringe");
const axios_1 = __importDefault(require("axios"));
const crypto = __importStar(require("crypto"));
const credential_service_1 = require("../../messaging/services/credential.service");
const logger_config_1 = require("../../../config/logger.config");
const url_validator_utils_1 = require("../../../shared/utils/url-validator.utils");
/**
 * HTTP timeout for webhook requests in milliseconds.
 */
const WEBHOOK_TIMEOUT_MS = 30000;
/**
 * Allow HTTP for development/testing environments.
 * In production, only HTTPS is allowed.
 */
const ALLOW_HTTP_WEBHOOKS = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';
/**
 * Dispatcher for outgoing webhooks.
 *
 * Handles the actual HTTP POST to external webhook URLs with HMAC signature
 * for authentication. Uses the same signature format as Meta webhook validation
 * for consistency.
 *
 * Security:
 * - SSRF protection: Validates URLs to prevent requests to internal networks
 * - HTTPS required in production (HTTP allowed in development/test)
 * - Signature format: sha256=<HMAC-SHA256(timestamp.payload, secret)>
 */
let OutgoingWebhookDispatcher = class OutgoingWebhookDispatcher {
    credentialService;
    constructor(credentialService) {
        this.credentialService = credentialService;
    }
    /**
     * Dispatch a webhook payload to an external URL.
     *
     * Steps:
     * 1. Validate URL for SSRF vulnerabilities
     * 2. Decrypt the webhook secret
     * 3. Generate timestamp for replay attack prevention
     * 4. Create HMAC signature using timestamp + payload
     * 5. Send HTTP POST with signature headers
     *
     * Security:
     * - URL is validated to prevent SSRF attacks targeting internal networks
     * - Private IP ranges, localhost, and link-local addresses are blocked
     * - DNS resolution is performed to catch DNS rebinding attacks
     *
     * @param webhookUrl - The URL to send the webhook to
     * @param payload - The payload to send
     * @param secretEncrypted - Encrypted webhook secret
     * @param secretIv - Initialization vector for decryption
     * @returns Result containing success status, HTTP status code, and any error
     */
    async dispatch(webhookUrl, payload, secretEncrypted, secretIv) {
        try {
            logger_config_1.logger.info('Starting webhook dispatch', {
                webhookUrl: this.maskUrl(webhookUrl),
                event: payload.event,
                messageId: payload.message.id,
                conversationId: payload.conversation.id,
                tenantId: payload.tenantId,
            });
            // SSRF Protection: Validate URL before making any requests
            logger_config_1.logger.debug('Validating webhook URL for SSRF protection', {
                webhookUrl: this.maskUrl(webhookUrl),
            });
            const urlValidation = await (0, url_validator_utils_1.validateWebhookUrl)(webhookUrl, ALLOW_HTTP_WEBHOOKS);
            if (!urlValidation.isValid) {
                logger_config_1.logger.error('Webhook URL failed SSRF validation', {
                    webhookUrl: this.maskUrl(webhookUrl),
                    event: payload.event,
                    messageId: payload.message.id,
                    error: urlValidation.error,
                    resolvedIp: urlValidation.resolvedIp,
                });
                return {
                    success: false,
                    error: `URL validation failed: ${urlValidation.error}`,
                };
            }
            logger_config_1.logger.debug('Webhook URL validation passed', {
                webhookUrl: this.maskUrl(webhookUrl),
                resolvedIp: urlValidation.resolvedIp,
            });
            // Decrypt the webhook secret
            logger_config_1.logger.debug('Decrypting webhook secret');
            const secret = await this.credentialService.decryptString(secretEncrypted, secretIv);
            // Generate timestamp (Unix epoch seconds)
            const timestamp = Math.floor(Date.now() / 1000).toString();
            // Serialize payload
            const payloadString = JSON.stringify(payload);
            const payloadSize = Buffer.byteLength(payloadString, 'utf8');
            // Create signature: HMAC-SHA256(timestamp.payload, secret)
            const signatureInput = `${timestamp}.${payloadString}`;
            const signature = `sha256=${crypto
                .createHmac('sha256', secret)
                .update(signatureInput)
                .digest('hex')}`;
            logger_config_1.logger.info('Sending webhook HTTP request', {
                webhookUrl: this.maskUrl(webhookUrl),
                event: payload.event,
                messageId: payload.message.id,
                conversationId: payload.conversation.id,
                timestamp,
                payloadSize,
                timeout: WEBHOOK_TIMEOUT_MS,
            });
            // Send the webhook
            const startTime = Date.now();
            const response = await axios_1.default.post(webhookUrl, payload, {
                timeout: WEBHOOK_TIMEOUT_MS,
                headers: {
                    'Content-Type': 'application/json',
                    'X-Webhook-Signature': signature,
                    'X-Webhook-Timestamp': timestamp,
                },
                // Accept 2xx responses as success
                validateStatus: (status) => status >= 200 && status < 300,
            });
            const duration = Date.now() - startTime;
            logger_config_1.logger.info('Outgoing webhook dispatched successfully', {
                webhookUrl: this.maskUrl(webhookUrl),
                event: payload.event,
                messageId: payload.message.id,
                conversationId: payload.conversation.id,
                statusCode: response.status,
                duration,
                payloadSize,
            });
            return {
                success: true,
                statusCode: response.status,
            };
        }
        catch (error) {
            return this.handleError(error, webhookUrl, payload);
        }
    }
    /**
     * Handle dispatch errors and categorize them.
     */
    handleError(error, webhookUrl, payload) {
        if (axios_1.default.isAxiosError(error)) {
            const axiosError = error;
            // Network or timeout error
            if (!axiosError.response) {
                const errorMessage = axiosError.code === 'ECONNABORTED'
                    ? 'Request timeout'
                    : axiosError.message;
                logger_config_1.logger.error('Outgoing webhook network error', {
                    webhookUrl: this.maskUrl(webhookUrl),
                    event: payload.event,
                    messageId: payload.message.id,
                    conversationId: payload.conversation.id,
                    tenantId: payload.tenantId,
                    errorCode: axiosError.code,
                    errorMessage,
                    errorType: 'network',
                    isTimeout: axiosError.code === 'ECONNABORTED',
                    stack: axiosError.stack,
                });
                return {
                    success: false,
                    error: `Network error: ${errorMessage}`,
                };
            }
            // HTTP error response
            const statusCode = axiosError.response.status;
            const errorMessage = this.extractErrorMessage(axiosError.response.data);
            const responseHeaders = axiosError.response.headers;
            logger_config_1.logger.error('Outgoing webhook HTTP error', {
                webhookUrl: this.maskUrl(webhookUrl),
                event: payload.event,
                messageId: payload.message.id,
                conversationId: payload.conversation.id,
                tenantId: payload.tenantId,
                statusCode,
                errorMessage,
                errorType: 'http',
                responseContentType: responseHeaders?.['content-type'],
                isClientError: statusCode >= 400 && statusCode < 500,
                isServerError: statusCode >= 500,
                isRateLimited: statusCode === 429,
            });
            return {
                success: false,
                statusCode,
                error: `HTTP ${statusCode}: ${errorMessage}`,
            };
        }
        // Unknown error (e.g., decryption failure)
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const stack = error instanceof Error ? error.stack : undefined;
        logger_config_1.logger.error('Outgoing webhook unexpected error', {
            webhookUrl: this.maskUrl(webhookUrl),
            event: payload.event,
            messageId: payload.message.id,
            conversationId: payload.conversation.id,
            tenantId: payload.tenantId,
            errorMessage,
            errorType: 'unexpected',
            errorName: error instanceof Error ? error.constructor.name : typeof error,
            stack,
        });
        return {
            success: false,
            error: errorMessage,
        };
    }
    /**
     * Extract a human-readable error message from response data.
     */
    extractErrorMessage(data) {
        if (!data) {
            return 'No response body';
        }
        if (typeof data === 'string') {
            return data.substring(0, 200);
        }
        if (typeof data === 'object') {
            const obj = data;
            // Common error message field names
            const message = obj.message || obj.error || obj.error_description;
            if (typeof message === 'string') {
                return message.substring(0, 200);
            }
        }
        return 'Unable to parse error response';
    }
    /**
     * Mask webhook URL for logging to avoid leaking sensitive paths.
     */
    maskUrl(url) {
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
exports.OutgoingWebhookDispatcher = OutgoingWebhookDispatcher;
exports.OutgoingWebhookDispatcher = OutgoingWebhookDispatcher = __decorate([
    (0, tsyringe_1.singleton)(),
    __param(0, (0, tsyringe_1.inject)(credential_service_1.CredentialService)),
    __metadata("design:paramtypes", [credential_service_1.CredentialService])
], OutgoingWebhookDispatcher);
