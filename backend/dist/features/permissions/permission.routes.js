"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const tsyringe_1 = require("tsyringe");
const permission_controller_1 = require("./permission.controller");
const authenticate_1 = require("@middleware/authenticate");
const authorize_1 = require("@middleware/authorize");
const router = (0, express_1.Router)();
const controller = tsyringe_1.container.resolve(permission_controller_1.PermissionController);
// All routes require authentication
router.use(authenticate_1.authenticate);
// List all permissions - requires users:read:all permission
router.get('/', (0, authorize_1.requirePermission)('users', 'read', 'all'), controller.list);
// Get permissions grouped by resource - requires users:read:all permission
router.get('/grouped', (0, authorize_1.requirePermission)('users', 'read', 'all'), controller.getGrouped);
// Get permission metadata - requires users:read:all permission
router.get('/meta', (0, authorize_1.requirePermission)('users', 'read', 'all'), controller.getMeta);
// Get permission by ID - requires users:read:all permission
router.get('/:id', (0, authorize_1.requirePermission)('users', 'read', 'all'), controller.getById);
exports.default = router;
