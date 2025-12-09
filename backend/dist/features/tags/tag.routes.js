"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const tsyringe_1 = require("tsyringe");
const tag_controller_1 = require("./tag.controller");
const csrf_protection_1 = require("../../middleware/csrf-protection");
const authenticate_1 = require("../../middleware/authenticate");
const authorize_1 = require("../../middleware/authorize");
const validate_dto_1 = require("../../middleware/validate-dto");
const require_tenant_1 = require("../../middleware/require-tenant");
const validate_uuid_1 = require("../../middleware/validate-uuid");
const create_tag_dto_1 = require("./dto/create-tag.dto");
const update_tag_dto_1 = require("./dto/update-tag.dto");
const router = (0, express_1.Router)();
const controller = tsyringe_1.container.resolve(tag_controller_1.TagController);
// All routes require authentication and tenant
router.use(authenticate_1.authenticate);
router.use(require_tenant_1.requireTenant);
// List all tags for the tenant
router.get('/', (0, authorize_1.requirePermission)('customers', 'read', 'all'), controller.listTags);
// Get specific tag
router.get('/:id', (0, authorize_1.requirePermission)('customers', 'read', 'all'), (0, validate_uuid_1.validateUuid)(), controller.getTag);
// Create a new tag
router.post('/', csrf_protection_1.csrfValidateToken, (0, authorize_1.requirePermission)('customers', 'create', 'all'), (0, validate_dto_1.validateDto)(create_tag_dto_1.CreateTagDto), controller.createTag);
// Update a tag
router.put('/:id', csrf_protection_1.csrfValidateToken, (0, authorize_1.requirePermission)('customers', 'update', 'all'), (0, validate_uuid_1.validateUuid)(), (0, validate_dto_1.validateDto)(update_tag_dto_1.UpdateTagDto), controller.updateTag);
// Delete a tag
router.delete('/:id', csrf_protection_1.csrfValidateToken, (0, authorize_1.requirePermission)('customers', 'delete', 'all'), (0, validate_uuid_1.validateUuid)(), controller.deleteTag);
exports.default = router;
