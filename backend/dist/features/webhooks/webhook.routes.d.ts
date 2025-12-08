import { Router } from 'express';
/**
 * Extended Request type with raw body for signature verification.
 */
declare global {
    namespace Express {
        interface Request {
            rawBody?: Buffer;
        }
    }
}
/**
 * Create routes for webhook handling.
 *
 * Note: Webhook routes do NOT use authentication middleware.
 * Security is handled via signature verification per provider.
 *
 * @returns Express router
 */
export declare function createWebhookRoutes(): Router;
