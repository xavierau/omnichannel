import { Router } from 'express';
import { container } from 'tsyringe';
import { ChannelAccountController } from './channel-account.controller';
import { authenticate } from '../../middleware/authenticate';

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

  return router;
}
