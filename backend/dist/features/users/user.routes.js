"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const tsyringe_1 = require("tsyringe");
const user_controller_1 = require("./user.controller");
const csrf_protection_1 = require("../../middleware/csrf-protection");
const authenticate_1 = require("../../middleware/authenticate");
const authorize_1 = require("../../middleware/authorize");
const validate_dto_1 = require("../../middleware/validate-dto");
const update_user_dto_1 = require("./dto/update-user.dto");
const router = (0, express_1.Router)();
const controller = tsyringe_1.container.resolve(user_controller_1.UserController);
// All routes require authentication
router.use(authenticate_1.authenticate);
// Get current user profile - any authenticated user
router.get('/me', controller.getMe);
// List all users - requires users:read:all permission
router.get('/', (0, authorize_1.requirePermission)('users', 'read', 'all'), controller.listUsers);
// Get specific user - requires users:read:all or users:read:own (for self)
router.get('/:id', (0, authorize_1.requireOwnerOrPermission)('users', 'read', (req) => req.params.id), controller.getUser);
// Update user - requires users:update:all or users:update:own (for self)
router.patch('/:id', csrf_protection_1.csrfValidateToken, (0, authorize_1.requireOwnerOrPermission)('users', 'update', (req) => req.params.id), controller.updateUser);
// Delete user - requires users:delete:all (admin only)
router.delete('/:id', csrf_protection_1.csrfValidateToken, (0, authorize_1.requireRoleLevel)(authorize_1.RoleLevel.ADMIN), (0, authorize_1.requirePermission)('users', 'delete', 'all'), controller.deleteUser);
// === User Role Management Routes ===
// Get user's roles - requires users:read:all
router.get('/:id/roles', (0, authorize_1.requirePermission)('users', 'read', 'all'), controller.getUserRoles);
// Add roles to user - requires users:manage:all (admin only)
router.post('/:id/roles', csrf_protection_1.csrfValidateToken, (0, authorize_1.requireRoleLevel)(authorize_1.RoleLevel.ADMIN), (0, authorize_1.requirePermission)('users', 'manage', 'all'), (0, validate_dto_1.validateDto)(update_user_dto_1.UserRolesDto), controller.addUserRoles);
// Remove roles from user - requires users:manage:all (admin only)
router.delete('/:id/roles', csrf_protection_1.csrfValidateToken, (0, authorize_1.requireRoleLevel)(authorize_1.RoleLevel.ADMIN), (0, authorize_1.requirePermission)('users', 'manage', 'all'), (0, validate_dto_1.validateDto)(update_user_dto_1.UserRolesDto), controller.removeUserRoles);
// Sync (replace) roles for user - requires users:manage:all (admin only)
router.put('/:id/roles', csrf_protection_1.csrfValidateToken, (0, authorize_1.requireRoleLevel)(authorize_1.RoleLevel.ADMIN), (0, authorize_1.requirePermission)('users', 'manage', 'all'), (0, validate_dto_1.validateDto)(update_user_dto_1.UserRolesDto), controller.syncUserRoles);
exports.default = router;
