"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const tsyringe_1 = require("tsyringe");
const template_controller_1 = require("./template.controller");
const csrf_protection_1 = require("../../middleware/csrf-protection");
const authenticate_1 = require("../../middleware/authenticate");
const authorize_1 = require("../../middleware/authorize");
const validate_dto_1 = require("../../middleware/validate-dto");
const require_tenant_1 = require("../../middleware/require-tenant");
const validate_uuid_1 = require("../../middleware/validate-uuid");
const create_template_group_dto_1 = require("./dto/create-template-group.dto");
const update_template_group_dto_1 = require("./dto/update-template-group.dto");
const create_translation_dto_1 = require("./dto/create-translation.dto");
const update_translation_dto_1 = require("./dto/update-translation.dto");
const template_query_dto_1 = require("./dto/template-query.dto");
const router = (0, express_1.Router)();
const controller = tsyringe_1.container.resolve(template_controller_1.TemplateController);
// All routes require authentication and tenant
router.use(authenticate_1.authenticate);
router.use(require_tenant_1.requireTenant);
// SSE endpoint for real-time template status updates (must be before /:id route)
router.get('/events', (0, authorize_1.requirePermission)('templates', 'read', 'all'), controller.subscribeToEvents);
// List all templates with pagination, search, and filters
router.get('/', (0, authorize_1.requirePermission)('templates', 'read', 'all'), (0, validate_dto_1.validateQueryDto)(template_query_dto_1.TemplateQueryDto), controller.listTemplates);
// Get approved templates (must be before /:id route)
router.get('/approved', (0, authorize_1.requirePermission)('templates', 'read', 'all'), (0, validate_dto_1.validateQueryDto)(template_query_dto_1.TemplateQueryDto), controller.getApprovedTemplates);
// Get specific template
router.get('/:id', (0, authorize_1.requirePermission)('templates', 'read', 'all'), (0, validate_uuid_1.validateUuid)(), controller.getTemplate);
// Create a new template
router.post('/', csrf_protection_1.csrfValidateToken, (0, authorize_1.requirePermission)('templates', 'create', 'all'), (0, validate_dto_1.validateDto)(create_template_group_dto_1.CreateTemplateGroupDto), controller.createTemplate);
// Update a template
router.patch('/:id', csrf_protection_1.csrfValidateToken, (0, authorize_1.requirePermission)('templates', 'update', 'all'), (0, validate_uuid_1.validateUuid)(), (0, validate_dto_1.validateDto)(update_template_group_dto_1.UpdateTemplateGroupDto), controller.updateTemplate);
// Delete a template
router.delete('/:id', csrf_protection_1.csrfValidateToken, (0, authorize_1.requirePermission)('templates', 'delete', 'all'), (0, validate_uuid_1.validateUuid)(), controller.deleteTemplate);
// Translation routes
// Add a translation to a template
router.post('/:id/translations', csrf_protection_1.csrfValidateToken, (0, authorize_1.requirePermission)('templates', 'create', 'all'), (0, validate_uuid_1.validateUuid)(), (0, validate_dto_1.validateDto)(create_translation_dto_1.CreateTranslationDto), controller.addTranslation);
// Update a translation
router.patch('/:id/translations/:translationId', csrf_protection_1.csrfValidateToken, (0, authorize_1.requirePermission)('templates', 'update', 'all'), (0, validate_uuid_1.validateUuid)('id', 'translationId'), (0, validate_dto_1.validateDto)(update_translation_dto_1.UpdateTranslationDto), controller.updateTranslation);
// Delete a translation
router.delete('/:id/translations/:translationId', csrf_protection_1.csrfValidateToken, (0, authorize_1.requirePermission)('templates', 'delete', 'all'), (0, validate_uuid_1.validateUuid)('id', 'translationId'), controller.deleteTranslation);
exports.default = router;
