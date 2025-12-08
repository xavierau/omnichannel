import { Request, Response, NextFunction } from 'express';
import { WebhookService } from './webhook.service';
/**
 * Controller for handling provider webhooks.
 *
 * Webhooks are public endpoints (no authentication) but are verified
 * using provider-specific signatures.
 */
export declare class WebhookController {
    private webhookService;
    constructor(webhookService: WebhookService);
    /**
     * GET /webhooks/meta
     * Handle Meta webhook verification challenge.
     *
     * Meta sends a GET request to verify webhook ownership.
     * We must respond with the challenge parameter.
     */
    verifyMeta(req: Request, res: Response, _next: NextFunction): Promise<void>;
    /**
     * POST /webhooks/meta
     * Handle Meta webhook events.
     *
     * Meta sends POST requests with status updates and incoming messages.
     * We verify the signature and process the events.
     */
    handleMeta(req: Request, res: Response, _next: NextFunction): Promise<void>;
    /**
     * GET /webhooks/health
     * Health check endpoint for webhooks.
     */
    health(_req: Request, res: Response, _next: NextFunction): Promise<void>;
}
