import { Router } from 'express';
import { container } from 'tsyringe';
import { RoleController } from './role.controller';
import { authenticate } from '@middleware/authenticate';
import { requirePermission, requireRoleLevel, RoleLevel } from '@middleware/authorize';
import { validateDto } from '@middleware/validate-dto';
import { CreateRoleDto, UpdateRoleDto, RolePermissionsDto } from './dto/role.dto';
import { csrfValidateToken } from '@middleware/csrf-protection';

const router = Router();
const controller = container.resolve(RoleController);

// All routes require authentication
router.use(authenticate);

// List all roles - requires users:read:all permission
router.get(
  '/',
  requirePermission('users', 'read', 'all'),
  controller.list
);

// Get role by ID - requires users:read:all permission
router.get(
  '/:id',
  requirePermission('users', 'read', 'all'),
  controller.getById
);

// Create role - requires users:manage:all permission (admin only)
router.post(
  '/',
  csrfValidateToken,
  requireRoleLevel(RoleLevel.ADMIN),
  requirePermission('users', 'manage', 'all'),
  validateDto(CreateRoleDto),
  controller.create
);

// Update role - requires users:manage:all permission (admin only)
router.patch(
  '/:id',
  csrfValidateToken,
  requireRoleLevel(RoleLevel.ADMIN),
  requirePermission('users', 'manage', 'all'),
  validateDto(UpdateRoleDto),
  controller.update
);

// Delete role - requires users:manage:all permission (admin only)
router.delete(
  '/:id',
  csrfValidateToken,
  requireRoleLevel(RoleLevel.ADMIN),
  requirePermission('users', 'manage', 'all'),
  controller.delete
);

// Add permissions to role - requires users:manage:all permission
router.post(
  '/:id/permissions',
  csrfValidateToken,
  requireRoleLevel(RoleLevel.ADMIN),
  requirePermission('users', 'manage', 'all'),
  validateDto(RolePermissionsDto),
  controller.addPermissions
);

// Remove permissions from role - requires users:manage:all permission
router.delete(
  '/:id/permissions',
  csrfValidateToken,
  requireRoleLevel(RoleLevel.ADMIN),
  requirePermission('users', 'manage', 'all'),
  validateDto(RolePermissionsDto),
  controller.removePermissions
);

// Sync (replace) permissions for role - requires users:manage:all permission
router.put(
  '/:id/permissions',
  csrfValidateToken,
  requireRoleLevel(RoleLevel.ADMIN),
  requirePermission('users', 'manage', 'all'),
  validateDto(RolePermissionsDto),
  controller.syncPermissions
);

export default router;
