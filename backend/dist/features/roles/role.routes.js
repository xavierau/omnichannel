"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const tsyringe_1 = require("tsyringe");
const role_controller_1 = require("./role.controller");
const authenticate_1 = require("@middleware/authenticate");
const authorize_1 = require("@middleware/authorize");
const validate_dto_1 = require("@middleware/validate-dto");
const role_dto_1 = require("./dto/role.dto");
const csrf_protection_1 = require("@middleware/csrf-protection");
const router = (0, express_1.Router)();
const controller = tsyringe_1.container.resolve(role_controller_1.RoleController);
// All routes require authentication
router.use(authenticate_1.authenticate);
// List all roles - requires users:read:all permission
router.get('/', (0, authorize_1.requirePermission)('users', 'read', 'all'), controller.list);
// Get role by ID - requires users:read:all permission
router.get('/:id', (0, authorize_1.requirePermission)('users', 'read', 'all'), controller.getById);
// Create role - requires users:manage:all permission (admin only)
router.post('/', csrf_protection_1.csrfValidateToken, (0, authorize_1.requireRoleLevel)(authorize_1.RoleLevel.ADMIN), (0, authorize_1.requirePermission)('users', 'manage', 'all'), (0, validate_dto_1.validateDto)(role_dto_1.CreateRoleDto), controller.create);
// Update role - requires users:manage:all permission (admin only)
router.patch('/:id', csrf_protection_1.csrfValidateToken, (0, authorize_1.requireRoleLevel)(authorize_1.RoleLevel.ADMIN), (0, authorize_1.requirePermission)('users', 'manage', 'all'), (0, validate_dto_1.validateDto)(role_dto_1.UpdateRoleDto), controller.update);
// Delete role - requires users:manage:all permission (admin only)
router.delete('/:id', csrf_protection_1.csrfValidateToken, (0, authorize_1.requireRoleLevel)(authorize_1.RoleLevel.ADMIN), (0, authorize_1.requirePermission)('users', 'manage', 'all'), controller.delete);
// Add permissions to role - requires users:manage:all permission
router.post('/:id/permissions', csrf_protection_1.csrfValidateToken, (0, authorize_1.requireRoleLevel)(authorize_1.RoleLevel.ADMIN), (0, authorize_1.requirePermission)('users', 'manage', 'all'), (0, validate_dto_1.validateDto)(role_dto_1.RolePermissionsDto), controller.addPermissions);
// Remove permissions from role - requires users:manage:all permission
router.delete('/:id/permissions', csrf_protection_1.csrfValidateToken, (0, authorize_1.requireRoleLevel)(authorize_1.RoleLevel.ADMIN), (0, authorize_1.requirePermission)('users', 'manage', 'all'), (0, validate_dto_1.validateDto)(role_dto_1.RolePermissionsDto), controller.removePermissions);
// Sync (replace) permissions for role - requires users:manage:all permission
router.put('/:id/permissions', csrf_protection_1.csrfValidateToken, (0, authorize_1.requireRoleLevel)(authorize_1.RoleLevel.ADMIN), (0, authorize_1.requirePermission)('users', 'manage', 'all'), (0, validate_dto_1.validateDto)(role_dto_1.RolePermissionsDto), controller.syncPermissions);
exports.default = router;
