import { Router } from 'express';
import { container } from 'tsyringe';
import { ChannelAccountController } from './channel-account.controller';
import { authenticate } from '../../middleware/authenticate';
import { validateDto } from '../../middleware/validate-dto';
import { UpdateWebhookSettingsDto } from './dto/update-webhook-settings.dto';

/**
 * Create routes for channel account management.
 *
 * @returns Express router
 */
export function createChannelAccountRoutes(): Router {
  const router = Router();
  const controller = container.resolve(ChannelAccountController);

  // All routes require authentication
  router.use(authenticate);

  // List all channel accounts for tenant
  router.get('/', (req, res, next) => controller.list(req, res, next));

  // Get a specific channel account
  router.get('/:id', (req, res, next) => controller.get(req, res, next));

  // Create a new channel account
  router.post('/', (req, res, next) => controller.create(req, res, next));

  // Update a channel account
  router.put('/:id', (req, res, next) => controller.update(req, res, next));

  // Delete a channel account
  router.delete('/:id', (req, res, next) => controller.delete(req, res, next));

  // Test connection to provider
  router.post('/:id/test', (req, res, next) => controller.testConnection(req, res, next));

  // Set as primary for channel type
  router.patch('/:id/primary', (req, res, next) => controller.setPrimary(req, res, next));

  // Sync templates from provider
  router.post('/:id/sync-templates', (req, res, next) =>
    controller.syncTemplates(req, res, next)
  );

  // Get webhook configuration for Meta setup
  router.get('/:id/webhook-config', (req, res, next) =>
    controller.getWebhookConfig(req, res, next)
  );

  // =========================================================================
  // Webhook Settings Routes
  // =========================================================================

  // Get webhook settings
  router.get('/:id/webhook-settings', (req, res, next) =>
    controller.getWebhookSettings(req, res, next)
  );

  // Update webhook settings
  router.patch(
    '/:id/webhook-settings',
    validateDto(UpdateWebhookSettingsDto),
    (req, res, next) => controller.updateWebhookSettings(req, res, next)
  );

  // Regenerate webhook secret
  router.post('/:id/webhook-secret/regenerate', (req, res, next) =>
    controller.regenerateWebhookSecret(req, res, next)
  );

  // Test webhook
  router.post('/:id/webhook-test', (req, res, next) =>
    controller.testWebhook(req, res, next)
  );

  return router;
}
