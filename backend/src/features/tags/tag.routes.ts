import { Router } from 'express';
import { container } from 'tsyringe';
import { TagController } from './tag.controller';
import { csrfValidateToken } from '@middleware/csrf-protection';
import { authenticate } from '@middleware/authenticate';
import { requirePermission } from '@middleware/authorize';
import { validateDto } from '@middleware/validate-dto';
import { requireTenant } from '@middleware/require-tenant';
import { validateUuid } from '@middleware/validate-uuid';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';

const router = Router();
const controller = container.resolve(TagController);

// All routes require authentication and tenant
router.use(authenticate);
router.use(requireTenant);

// List all tags for the tenant
router.get('/', requirePermission('customers', 'read', 'all'), controller.listTags);

// Get specific tag
router.get(
  '/:id',
  requirePermission('customers', 'read', 'all'),
  validateUuid(),
  controller.getTag
);

// Create a new tag
router.post(
  '/',
  csrfValidateToken,
  requirePermission('customers', 'create', 'all'),
  validateDto(CreateTagDto),
  controller.createTag
);

// Update a tag
router.put(
  '/:id',
  csrfValidateToken,
  requirePermission('customers', 'update', 'all'),
  validateUuid(),
  validateDto(UpdateTagDto),
  controller.updateTag
);

// Delete a tag
router.delete(
  '/:id',
  csrfValidateToken,
  requirePermission('customers', 'delete', 'all'),
  validateUuid(),
  controller.deleteTag
);

export default router;
