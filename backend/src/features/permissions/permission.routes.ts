import { Router } from 'express';
import { container } from 'tsyringe';
import { PermissionController } from './permission.controller';
import { authenticate } from '@middleware/authenticate';
import { requirePermission } from '@middleware/authorize';

const router = Router();
const controller = container.resolve(PermissionController);

// All routes require authentication
router.use(authenticate);

// List all permissions - requires users:read:all permission
router.get(
  '/',
  requirePermission('users', 'read', 'all'),
  controller.list
);

// Get permissions grouped by resource - requires users:read:all permission
router.get(
  '/grouped',
  requirePermission('users', 'read', 'all'),
  controller.getGrouped
);

// Get permission metadata - requires users:read:all permission
router.get(
  '/meta',
  requirePermission('users', 'read', 'all'),
  controller.getMeta
);

// Get permission by ID - requires users:read:all permission
router.get(
  '/:id',
  requirePermission('users', 'read', 'all'),
  controller.getById
);

export default router;
