import { Request, Response, NextFunction } from 'express';
import { singleton, inject } from 'tsyringe';
import {
  ChannelAccountService,
  CreateChannelAccountDto,
  UpdateChannelAccountDto,
} from './channel-account.service';
import { WebhookConfigurationService } from './services/webhook-configuration.service';
import { logger } from '../../config/logger.config';

/**
 * Controller for channel account management.
 *
 * Handles HTTP requests for CRUD operations on channel accounts.
 */
@singleton()
export class ChannelAccountController {
  constructor(
    @inject(ChannelAccountService)
    private readonly channelAccountService: ChannelAccountService,
    @inject(WebhookConfigurationService)
    private readonly webhookConfigurationService: WebhookConfigurationService
  ) {}

  /**
   * GET /api/channel-accounts
   * List all channel accounts for the tenant.
   */
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.user?.tenantId;

      if (!tenantId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const channelCode = req.query.channelCode as string | undefined;

      const accounts = await this.channelAccountService.getByTenant(tenantId, channelCode);

      res.json({ data: accounts });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/channel-accounts/:id
   * Get a specific channel account.
   */
  async get(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.user?.tenantId;
      const { id } = req.params;

      if (!tenantId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const account = await this.channelAccountService.getById(id, tenantId);

      if (!account) {
        res.status(404).json({ error: 'Channel account not found' });
        return;
      }

      res.json({ data: account });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/channel-accounts
   * Create a new channel account.
   */
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.user?.tenantId;

      if (!tenantId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const dto: CreateChannelAccountDto = req.body;

      // Validate required fields
      if (!dto.name || !dto.channelCode || !dto.credentials) {
        res.status(400).json({
          error: 'Missing required fields: name, channelCode, credentials',
        });
        return;
      }

      const account = await this.channelAccountService.create(tenantId, dto);

      logger.info('Channel account created via API', {
        channelAccountId: account.id,
        tenantId,
        channelCode: dto.channelCode,
      });

      res.status(201).json({ data: account });
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(400).json({ error: error.message });
        return;
      }
      if (error instanceof Error && error.message.includes('Missing required')) {
        res.status(400).json({ error: error.message });
        return;
      }
      next(error);
    }
  }

  /**
   * PUT /api/channel-accounts/:id
   * Update a channel account.
   */
  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.user?.tenantId;
      const { id } = req.params;

      if (!tenantId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const dto: UpdateChannelAccountDto = req.body;

      const account = await this.channelAccountService.update(id, tenantId, dto);

      if (!account) {
        res.status(404).json({ error: 'Channel account not found' });
        return;
      }

      logger.info('Channel account updated via API', {
        channelAccountId: id,
        tenantId,
      });

      res.json({ data: account });
    } catch (error) {
      if (error instanceof Error && error.message.includes('Missing required')) {
        res.status(400).json({ error: error.message });
        return;
      }
      next(error);
    }
  }

  /**
   * DELETE /api/channel-accounts/:id
   * Delete a channel account.
   */
  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.user?.tenantId;
      const { id } = req.params;

      if (!tenantId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const deleted = await this.channelAccountService.delete(id, tenantId);

      if (!deleted) {
        res.status(404).json({ error: 'Channel account not found' });
        return;
      }

      logger.info('Channel account deleted via API', {
        channelAccountId: id,
        tenantId,
      });

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/channel-accounts/:id/test
   * Test connection to the provider.
   */
  async testConnection(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.user?.tenantId;
      const { id } = req.params;

      if (!tenantId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const result = await this.channelAccountService.testConnection(id, tenantId);

      if (result.success) {
        res.json({
          data: {
            success: true,
            message: 'Connection successful',
            accountInfo: result.accountInfo,
          },
        });
      } else {
        res.status(400).json({
          data: {
            success: false,
            message: 'Connection failed',
            error: result.error,
          },
        });
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/channel-accounts/:id/primary
   * Set channel account as primary for its channel type.
   */
  async setPrimary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.user?.tenantId;
      const { id } = req.params;

      if (!tenantId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const success = await this.channelAccountService.setPrimary(id, tenantId);

      if (!success) {
        res.status(404).json({ error: 'Channel account not found' });
        return;
      }

      res.json({ data: { success: true, message: 'Channel account set as primary' } });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/channel-accounts/:id/sync-templates
   * Sync templates from the provider.
   */
  async syncTemplates(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.user?.tenantId;
      const { id } = req.params;

      if (!tenantId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const result = await this.channelAccountService.syncTemplates(id, tenantId);

      if (result.success) {
        res.json({
          data: {
            success: true,
            templates: result.templates,
            count: result.templates?.length || 0,
          },
        });
      } else {
        res.status(400).json({
          data: {
            success: false,
            error: result.error,
          },
        });
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/channel-accounts/:id/webhook-config
   * Get webhook configuration for Meta setup.
   *
   * Returns the webhook URL and verify token needed to configure
   * webhooks in Meta's developer portal.
   */
  async getWebhookConfig(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.user?.tenantId;
      const { id } = req.params;

      if (!tenantId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const config = await this.channelAccountService.generateWebhookConfig(id, tenantId);

      res.json({
        data: {
          webhookUrl: config.webhookUrl,
          verifyToken: config.verifyToken,
          instructions: {
            step1: 'Go to Meta Developer Portal > Your App > WhatsApp > Configuration',
            step2: 'In the Webhook section, click "Edit"',
            step3: 'Enter the Callback URL (webhookUrl) and Verify token (verifyToken)',
            step4: 'Click "Verify and save"',
            step5: 'Subscribe to the "messages" webhook field',
          },
        },
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'Channel account not found') {
        res.status(404).json({ error: error.message });
        return;
      }
      next(error);
    }
  }

  // =========================================================================
  // Webhook Settings Endpoints
  // =========================================================================

  /**
   * GET /api/channel-accounts/:id/webhook-settings
   * Get webhook settings for a channel account.
   *
   * Returns the current webhook URL, whether a secret exists,
   * and whether webhook events are enabled.
   */
  async getWebhookSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.user?.tenantId;
      const { id } = req.params;

      if (!tenantId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const settings = await this.webhookConfigurationService.getWebhookSettings(id, tenantId);

      res.json({ data: settings });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/channel-accounts/:id/webhook-settings
   * Update webhook settings for a channel account.
   *
   * Accepts webhookUrl and/or webhookEventsEnabled.
   * If setting webhookUrl for the first time, auto-generates a secret.
   */
  async updateWebhookSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.user?.tenantId;
      const { id } = req.params;

      if (!tenantId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const dto = req.body;

      const settings = await this.webhookConfigurationService.updateWebhookSettings(
        id,
        tenantId,
        dto
      );

      logger.info('Webhook settings updated via API', {
        channelAccountId: id,
        tenantId,
      });

      res.json({ data: settings });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/channel-accounts/:id/webhook-secret/regenerate
   * Regenerate the webhook secret for a channel account.
   *
   * Returns the new secret - this is the ONLY time it will be visible.
   * The user must save it immediately.
   */
  async regenerateWebhookSecret(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const tenantId = req.user?.tenantId;
      const { id } = req.params;

      if (!tenantId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const result = await this.webhookConfigurationService.regenerateWebhookSecret(id, tenantId);

      logger.info('Webhook secret regenerated via API', {
        channelAccountId: id,
        tenantId,
      });

      res.json({
        data: {
          secret: result.secret,
          message:
            'This is the only time the secret will be displayed. Please save it securely.',
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/channel-accounts/:id/webhook-test
   * Test the webhook configuration by sending a test payload.
   *
   * Returns success/failure status.
   */
  async testWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.user?.tenantId;
      const { id } = req.params;

      if (!tenantId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const result = await this.webhookConfigurationService.testWebhook(id, tenantId);

      if (result.success) {
        res.json({
          data: {
            success: true,
            message: 'Test webhook sent successfully',
          },
        });
      } else {
        res.status(400).json({
          data: {
            success: false,
            error: result.error,
          },
        });
      }
    } catch (error) {
      next(error);
    }
  }
}
