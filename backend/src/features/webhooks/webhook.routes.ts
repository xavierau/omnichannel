import { Router, json, Request } from 'express';
import { container } from 'tsyringe';
import { WebhookController } from './webhook.controller';

/**
 * Extended Request type with raw body for signature verification.
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      rawBody?: Buffer;
    }
  }
}

/**
 * Middleware to capture raw body for signature verification.
 *
 * This must be applied before json() middleware for webhook routes.
 */
const rawBodyMiddleware = json({
  verify: (req: Request, _res, buf) => {
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
export function createWebhookRoutes(): Router {
  const router = Router();
  const controller = container.resolve(WebhookController);

  // Health check
  router.get('/health', (req, res, next) => controller.health(req, res, next));

  // Meta (WhatsApp Cloud API) webhooks
  // GET for verification challenge
  router.get('/meta', (req, res, next) => controller.verifyMeta(req, res, next));

  // POST for events (with raw body capture for signature verification)
  router.post('/meta', rawBodyMiddleware, (req, res, next) =>
    controller.handleMeta(req, res, next)
  );

  // Future webhook routes for other providers:
  // router.post('/twilio', rawBodyMiddleware, (req, res, next) => controller.handleTwilio(req, res, next));
  // router.post('/dialogue360', rawBodyMiddleware, (req, res, next) => controller.handleDialogue360(req, res, next));

  return router;
}
