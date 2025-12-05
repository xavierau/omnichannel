import { Router } from 'express';
import { container } from 'tsyringe';
import { UserController } from './user.controller';
import { csrfValidateToken } from '@middleware/csrf-protection';
import { authenticate } from '@middleware/authenticate';
import {
  requirePermission,
  requireRoleLevel,
  requireOwnerOrPermission,
  RoleLevel,
} from '@middleware/authorize';
import { validateDto } from '@middleware/validate-dto';
import { UserRolesDto } from './dto/update-user.dto';

const router = Router();
const controller = container.resolve(UserController);

// All routes require authentication
router.use(authenticate);

// Get current user profile - any authenticated user
router.get('/me', controller.getMe);

// List all users - requires users:read:all permission
router.get(
  '/',
  requirePermission('users', 'read', 'all'),
  controller.listUsers
);

// Get specific user - requires users:read:all or users:read:own (for self)
router.get(
  '/:id',
  requireOwnerOrPermission('users', 'read', (req) => req.params.id),
  controller.getUser
);

// Update user - requires users:update:all or users:update:own (for self)
router.patch(
  '/:id',
  csrfValidateToken,
  requireOwnerOrPermission('users', 'update', (req) => req.params.id),
  controller.updateUser
);

// Delete user - requires users:delete:all (admin only)
router.delete(
  '/:id',
  csrfValidateToken,
  requireRoleLevel(RoleLevel.ADMIN),
  requirePermission('users', 'delete', 'all'),
  controller.deleteUser
);

// === User Role Management Routes ===

// Get user's roles - requires users:read:all
router.get(
  '/:id/roles',
  requirePermission('users', 'read', 'all'),
  controller.getUserRoles
);

// Add roles to user - requires users:manage:all (admin only)
router.post(
  '/:id/roles',
  csrfValidateToken,
  requireRoleLevel(RoleLevel.ADMIN),
  requirePermission('users', 'manage', 'all'),
  validateDto(UserRolesDto),
  controller.addUserRoles
);

// Remove roles from user - requires users:manage:all (admin only)
router.delete(
  '/:id/roles',
  csrfValidateToken,
  requireRoleLevel(RoleLevel.ADMIN),
  requirePermission('users', 'manage', 'all'),
  validateDto(UserRolesDto),
  controller.removeUserRoles
);

// Sync (replace) roles for user - requires users:manage:all (admin only)
router.put(
  '/:id/roles',
  csrfValidateToken,
  requireRoleLevel(RoleLevel.ADMIN),
  requirePermission('users', 'manage', 'all'),
  validateDto(UserRolesDto),
  controller.syncUserRoles
);

export default router;
