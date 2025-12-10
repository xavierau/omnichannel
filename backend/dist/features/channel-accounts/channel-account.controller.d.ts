import { Request, Response, NextFunction } from 'express';
import { ChannelAccountService } from './channel-account.service';
import { WebhookConfigurationService } from './services/webhook-configuration.service';
/**
 * Controller for channel account management.
 *
 * Handles HTTP requests for CRUD operations on channel accounts.
 */
export declare class ChannelAccountController {
    private readonly channelAccountService;
    private readonly webhookConfigurationService;
    constructor(channelAccountService: ChannelAccountService, webhookConfigurationService: WebhookConfigurationService);
    /**
     * GET /api/channel-accounts
     * List all channel accounts for the tenant.
     */
    list(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * GET /api/channel-accounts/:id
     * Get a specific channel account.
     */
    get(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * POST /api/channel-accounts
     * Create a new channel account.
     */
    create(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * PUT /api/channel-accounts/:id
     * Update a channel account.
     */
    update(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * DELETE /api/channel-accounts/:id
     * Delete a channel account.
     */
    delete(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * POST /api/channel-accounts/:id/test
     * Test connection to the provider.
     */
    testConnection(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * PATCH /api/channel-accounts/:id/primary
     * Set channel account as primary for its channel type.
     */
    setPrimary(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * POST /api/channel-accounts/:id/sync-templates
     * Sync templates from the provider.
     */
    syncTemplates(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * GET /api/channel-accounts/:id/webhook-config
     * Get webhook configuration for Meta setup.
     *
     * Returns the webhook URL and verify token needed to configure
     * webhooks in Meta's developer portal.
     */
    getWebhookConfig(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * GET /api/channel-accounts/:id/webhook-settings
     * Get webhook settings for a channel account.
     *
     * Returns the current webhook URL, whether a secret exists,
     * and whether webhook events are enabled.
     */
    getWebhookSettings(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * PATCH /api/channel-accounts/:id/webhook-settings
     * Update webhook settings for a channel account.
     *
     * Accepts webhookUrl and/or webhookEventsEnabled.
     * If setting webhookUrl for the first time, auto-generates a secret.
     */
    updateWebhookSettings(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * POST /api/channel-accounts/:id/webhook-secret/regenerate
     * Regenerate the webhook secret for a channel account.
     *
     * Returns the new secret - this is the ONLY time it will be visible.
     * The user must save it immediately.
     */
    regenerateWebhookSecret(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * POST /api/channel-accounts/:id/webhook-test
     * Test the webhook configuration by sending a test payload.
     *
     * Returns success/failure status.
     */
    testWebhook(req: Request, res: Response, next: NextFunction): Promise<void>;
}
