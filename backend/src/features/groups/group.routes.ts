import { Router } from 'express';
import { container } from 'tsyringe';
import { GroupController } from './group.controller';
import { csrfValidateToken } from '@middleware/csrf-protection';
import { authenticate } from '@middleware/authenticate';
import { requirePermission } from '@middleware/authorize';
import { validateDto, validateQueryDto } from '@middleware/validate-dto';
import { requireTenant } from '@middleware/require-tenant';
import { validateUuid } from '@middleware/validate-uuid';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { GroupQueryDto, GroupMembersQueryDto } from './dto/group-query.dto';

const router = Router();
const controller = container.resolve(GroupController);

// All routes require authentication and tenant
router.use(authenticate);
router.use(requireTenant);

/**
 * GET /groups
 * List all customer groups with pagination and filtering.
 *
 * Query params:
 * - search: string (optional) - search by name or description
 * - isStatic: boolean (optional) - filter by group type
 * - page: number (optional, default: 1)
 * - limit: number (optional, default: 20, max: 100)
 * - sortBy: string (optional, default: 'createdAt')
 * - sortOrder: 'asc' | 'desc' (optional, default: 'desc')
 */
router.get(
  '/',
  requirePermission('customers', 'read', 'all'),
  validateQueryDto(GroupQueryDto),
  controller.listGroups
);

/**
 * GET /groups/:id
 * Get a specific customer group by ID.
 */
router.get(
  '/:id',
  requirePermission('customers', 'read', 'all'),
  validateUuid(),
  controller.getGroup
);

/**
 * GET /groups/:id/members
 * Get paginated members of a customer group.
 *
 * Query params:
 * - page: number (optional, default: 1)
 * - limit: number (optional, default: 20, max: 100)
 */
router.get(
  '/:id/members',
  requirePermission('customers', 'read', 'all'),
  validateUuid(),
  validateQueryDto(GroupMembersQueryDto),
  controller.getGroupMembers
);

/**
 * POST /groups
 * Create a new customer group.
 *
 * Body:
 * - name: string (required, 2-255 chars)
 * - description: string (optional, max 500 chars)
 * - isStatic: boolean (required)
 * - memberIds: string[] (required if isStatic=true)
 * - criteria: GroupCriteria (required if isStatic=false)
 */
router.post(
  '/',
  csrfValidateToken,
  requirePermission('customers', 'create', 'all'),
  validateDto(CreateGroupDto),
  controller.createGroup
);

/**
 * PATCH /groups/:id
 * Update an existing customer group.
 *
 * Body (all optional):
 * - name: string (2-255 chars)
 * - description: string (max 500 chars)
 * - isStatic: boolean
 * - memberIds: string[] (required if changing to static)
 * - criteria: GroupCriteria (required if changing to dynamic)
 */
router.patch(
  '/:id',
  csrfValidateToken,
  requirePermission('customers', 'update', 'all'),
  validateUuid(),
  validateDto(UpdateGroupDto),
  controller.updateGroup
);

/**
 * DELETE /groups/:id
 * Delete a customer group.
 */
router.delete(
  '/:id',
  csrfValidateToken,
  requirePermission('customers', 'delete', 'all'),
  validateUuid(),
  controller.deleteGroup
);

export default router;
