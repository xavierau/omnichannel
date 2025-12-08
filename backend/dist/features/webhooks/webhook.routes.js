"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createWebhookRoutes = createWebhookRoutes;
const express_1 = require("express");
const tsyringe_1 = require("tsyringe");
const webhook_controller_1 = require("./webhook.controller");
/**
 * Middleware to capture raw body for signature verification.
 *
 * This must be applied before json() middleware for webhook routes.
 */
const rawBodyMiddleware = (0, express_1.json)({
    verify: (req, _res, buf) => {
        req.rawBody = buf;
    },
});
/**
 * Create routes for webhook handling.
 *
 * Note: Webhook routes do NOT use authentication middleware.
 * Security is handled via signature verification per provider.
 *
 * @returns Express router
 */
function createWebhookRoutes() {
    const router = (0, express_1.Router)();
    const controller = tsyringe_1.container.resolve(webhook_controller_1.WebhookController);
    // Health check
    router.get('/health', (req, res, next) => controller.health(req, res, next));
    // Meta (WhatsApp Cloud API) webhooks
    // GET for verification challenge
    router.get('/meta', (req, res, next) => controller.verifyMeta(req, res, next));
    // POST for events (with raw body capture for signature verification)
    router.post('/meta', rawBodyMiddleware, (req, res, next) => controller.handleMeta(req, res, next));
    // Future webhook routes for other providers:
    // router.post('/twilio', rawBodyMiddleware, (req, res, next) => controller.handleTwilio(req, res, next));
    // router.post('/dialogue360', rawBodyMiddleware, (req, res, next) => controller.handleDialogue360(req, res, next));
    return router;
}
