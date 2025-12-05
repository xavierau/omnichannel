import { Request, Response, NextFunction } from 'express';
import { singleton, inject } from 'tsyringe';
import { WebhookService, MetaWebhookVerifyQuery } from './webhook.service';
import { logger } from '../../config/logger.config';

/**
 * Controller for handling provider webhooks.
 *
 * Webhooks are public endpoints (no authentication) but are verified
 * using provider-specific signatures.
 */
@singleton()
export class WebhookController {
  constructor(@inject(WebhookService) private webhookService: WebhookService) {}

  /**
   * GET /webhooks/meta
   * Handle Meta webhook verification challenge.
   *
   * Meta sends a GET request to verify webhook ownership.
   * We must respond with the challenge parameter.
   */
  async verifyMeta(req: Request, res: Response, _next: NextFunction): Promise<void> {
    try {
      const query = req.query as unknown as MetaWebhookVerifyQuery;

      const result = this.webhookService.verifyMetaWebhook(query);

      if (result.valid && result.challenge) {
        // Must respond with the challenge for verification
        res.status(200).send(result.challenge);
      } else {
        res.status(403).json({ error: result.error || 'Verification failed' });
      }
    } catch (error) {
      logger.error('Error in Meta webhook verification', { error });
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
  async handleMeta(req: Request, res: Response, _next: NextFunction): Promise<void> {
    // Meta requires 200 response within 20 seconds
    // Send 200 immediately, process async
    res.status(200).send('EVENT_RECEIVED');

    try {
      const signature = req.headers['x-hub-signature-256'] as string;

      if (!signature) {
        logger.warn('Meta webhook missing signature header');
        return;
      }

      // req.body is already parsed, but we need the raw body for signature verification
      // The raw body middleware should store it in req.rawBody
      const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;

      if (!rawBody) {
        logger.error('Raw body not available for signature verification');
        return;
      }

      const result = await this.webhookService.processMetaWebhook(rawBody, signature);

      if (!result.success) {
        logger.warn('Meta webhook processing had errors', {
          eventsProcessed: result.eventsProcessed,
          errors: result.errors,
        });
      } else {
        logger.debug('Meta webhook processed successfully', {
          eventsProcessed: result.eventsProcessed,
        });
      }
    } catch (error) {
      logger.error('Error processing Meta webhook', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /webhooks/health
   * Health check endpoint for webhooks.
   */
  async health(_req: Request, res: Response, _next: NextFunction): Promise<void> {
    res.status(200).json({ status: 'ok', service: 'webhooks' });
  }
}
