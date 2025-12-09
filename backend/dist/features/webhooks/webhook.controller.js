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
exports.WebhookController = void 0;
const tsyringe_1 = require("tsyringe");
const webhook_service_1 = require("./webhook.service");
const logger_config_1 = require("../../config/logger.config");
/**
 * Controller for handling provider webhooks.
 *
 * Webhooks are public endpoints (no authentication) but are verified
 * using provider-specific signatures.
 */
let WebhookController = class WebhookController {
    webhookService;
    constructor(webhookService) {
        this.webhookService = webhookService;
    }
    /**
     * GET /webhooks/meta
     * Handle Meta webhook verification challenge.
     *
     * Meta sends a GET request to verify webhook ownership.
     * We must respond with the challenge parameter.
     */
    async verifyMeta(req, res, _next) {
        try {
            const query = req.query;
            const result = await this.webhookService.verifyMetaWebhook(query);
            if (result.valid && result.challenge) {
                // Must respond with the challenge for verification
                res.status(200).send(result.challenge);
            }
            else {
                res.status(403).json({ error: result.error || 'Verification failed' });
            }
        }
        catch (error) {
            logger_config_1.logger.error('Error in Meta webhook verification', { error });
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    /**
     * POST /webhooks/meta
     * Handle Meta webhook events.
     *
     * Meta sends POST requests with status updates and incoming messages.
     * We verify the signature and process the events.
     */
    async handleMeta(req, res, _next) {
        // Meta requires 200 response within 20 seconds
        // Send 200 immediately, process async
        res.status(200).send('EVENT_RECEIVED');
        try {
            const signature = req.headers['x-hub-signature-256'];
            if (!signature) {
                logger_config_1.logger.warn('Meta webhook missing signature header');
                return;
            }
            // req.body is already parsed, but we need the raw body for signature verification
            // The raw body middleware should store it in req.rawBody
            const rawBody = req.rawBody;
            if (!rawBody) {
                logger_config_1.logger.error('Raw body not available for signature verification');
                return;
            }
            const result = await this.webhookService.processMetaWebhook(rawBody, signature);
            if (!result.success) {
                logger_config_1.logger.warn('Meta webhook processing had errors', {
                    eventsProcessed: result.eventsProcessed,
                    errors: result.errors,
                });
            }
            else {
                logger_config_1.logger.debug('Meta webhook processed successfully', {
                    eventsProcessed: result.eventsProcessed,
                });
            }
        }
        catch (error) {
            logger_config_1.logger.error('Error processing Meta webhook', {
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
    /**
     * GET /webhooks/health
     * Health check endpoint for webhooks.
     */
    async health(_req, res, _next) {
        res.status(200).json({ status: 'ok', service: 'webhooks' });
    }
};
exports.WebhookController = WebhookController;
exports.WebhookController = WebhookController = __decorate([
    (0, tsyringe_1.singleton)(),
    __param(0, (0, tsyringe_1.inject)(webhook_service_1.WebhookService)),
    __metadata("design:paramtypes", [webhook_service_1.WebhookService])
], WebhookController);
