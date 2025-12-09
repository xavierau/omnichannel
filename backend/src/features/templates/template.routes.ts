import { Router } from 'express';
import { container } from 'tsyringe';
import { TemplateController } from './template.controller';
import { csrfValidateToken } from '@middleware/csrf-protection';
import { authenticate } from '@middleware/authenticate';
import { requirePermission } from '@middleware/authorize';
import { validateDto, validateQueryDto } from '@middleware/validate-dto';
import { requireTenant } from '@middleware/require-tenant';
import { validateUuid } from '@middleware/validate-uuid';
import { CreateTemplateGroupDto } from './dto/create-template-group.dto';
import { UpdateTemplateGroupDto } from './dto/update-template-group.dto';
import { CreateTranslationDto } from './dto/create-translation.dto';
import { UpdateTranslationDto } from './dto/update-translation.dto';
import { TemplateQueryDto } from './dto/template-query.dto';

const router = Router();
const controller = container.resolve(TemplateController);

// All routes require authentication and tenant
router.use(authenticate);
router.use(requireTenant);

// SSE endpoint for real-time template status updates (must be before /:id route)
router.get(
  '/events',
  requirePermission('templates', 'read', 'all'),
  controller.subscribeToEvents
);

// List all templates with pagination, search, and filters
router.get(
  '/',
  requirePermission('templates', 'read', 'all'),
  validateQueryDto(TemplateQueryDto),
  controller.listTemplates
);

// Get approved templates (must be before /:id route)
router.get(
  '/approved',
  requirePermission('templates', 'read', 'all'),
  validateQueryDto(TemplateQueryDto),
  controller.getApprovedTemplates
);

// Get specific template
router.get(
  '/:id',
  requirePermission('templates', 'read', 'all'),
  validateUuid(),
  controller.getTemplate
);

// Create a new template
router.post(
  '/',
  csrfValidateToken,
  requirePermission('templates', 'create', 'all'),
  validateDto(CreateTemplateGroupDto),
  controller.createTemplate
);

// Update a template
router.patch(
  '/:id',
  csrfValidateToken,
  requirePermission('templates', 'update', 'all'),
  validateUuid(),
  validateDto(UpdateTemplateGroupDto),
  controller.updateTemplate
);

// Delete a template
router.delete(
  '/:id',
  csrfValidateToken,
  requirePermission('templates', 'delete', 'all'),
  validateUuid(),
  controller.deleteTemplate
);

// Translation routes

// Add a translation to a template
router.post(
  '/:id/translations',
  csrfValidateToken,
  requirePermission('templates', 'create', 'all'),
  validateUuid(),
  validateDto(CreateTranslationDto),
  controller.addTranslation
);

// Update a translation
router.patch(
  '/:id/translations/:translationId',
  csrfValidateToken,
  requirePermission('templates', 'update', 'all'),
  validateUuid('id', 'translationId'),
  validateDto(UpdateTranslationDto),
  controller.updateTranslation
);

// Submit a translation to Meta for approval
router.post(
  '/:id/translations/:translationId/submit',
  csrfValidateToken,
  requirePermission('templates', 'update', 'all'),
  validateUuid('id', 'translationId'),
  controller.submitToMeta
);

// Delete a translation
router.delete(
  '/:id/translations/:translationId',
  csrfValidateToken,
  requirePermission('templates', 'delete', 'all'),
  validateUuid('id', 'translationId'),
  controller.deleteTranslation
);

export default router;
