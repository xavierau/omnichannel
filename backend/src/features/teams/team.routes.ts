import { Router } from 'express';
import { container } from 'tsyringe';
import { TeamController } from './team.controller';
import { csrfValidateToken } from '@middleware/csrf-protection';
import { authenticate } from '@middleware/authenticate';
import { requirePermission } from '@middleware/authorize';
import { validateDto } from '@middleware/validate-dto';
import { requireTenant } from '@middleware/require-tenant';
import { validateUuid } from '@middleware/validate-uuid';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { AddChannelAccountDto } from './dto/add-channel-account.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';

const router = Router();
const controller = container.resolve(TeamController);

// All routes require authentication and tenant
router.use(authenticate);
router.use(requireTenant);

// ============================================================================
// Team CRUD Routes
// ============================================================================

/**
 * GET /teams
 * List all teams for the current tenant.
 * Requires: teams:read:all permission
 */
router.get('/', requirePermission('teams', 'read', 'all'), controller.listTeams);

/**
 * POST /teams
 * Create a new team.
 * Requires: teams:create:all permission
 */
router.post(
  '/',
  csrfValidateToken,
  requirePermission('teams', 'create', 'all'),
  validateDto(CreateTeamDto),
  controller.createTeam
);

/**
 * GET /teams/:id
 * Get a specific team by ID.
 * Requires: teams:read:all permission
 */
router.get(
  '/:id',
  requirePermission('teams', 'read', 'all'),
  validateUuid(),
  controller.getTeam
);

/**
 * PATCH /teams/:id
 * Update an existing team.
 * Requires: teams:update:all permission
 */
router.patch(
  '/:id',
  csrfValidateToken,
  requirePermission('teams', 'update', 'all'),
  validateUuid(),
  validateDto(UpdateTeamDto),
  controller.updateTeam
);

/**
 * DELETE /teams/:id
 * Delete a team.
 * Requires: teams:delete:all permission
 */
router.delete(
  '/:id',
  csrfValidateToken,
  requirePermission('teams', 'delete', 'all'),
  validateUuid(),
  controller.deleteTeam
);

// ============================================================================
// Team Member Routes
// ============================================================================

/**
 * GET /teams/:id/members
 * List all members of a team.
 * Requires: teams:read:all permission
 */
router.get(
  '/:id/members',
  requirePermission('teams', 'read', 'all'),
  validateUuid(),
  controller.listMembers
);

/**
 * POST /teams/:id/members
 * Add a member to a team.
 * Requires: teams:update:all permission
 */
router.post(
  '/:id/members',
  csrfValidateToken,
  requirePermission('teams', 'update', 'all'),
  validateUuid(),
  validateDto(AddMemberDto),
  controller.addMember
);

/**
 * DELETE /teams/:id/members/:userId
 * Remove a member from a team.
 * Requires: teams:update:all permission
 */
router.delete(
  '/:id/members/:userId',
  csrfValidateToken,
  requirePermission('teams', 'update', 'all'),
  validateUuid(),
  validateUuid('userId'),
  controller.removeMember
);

/**
 * PATCH /teams/:id/members/:userId/role
 * Update a team member's role.
 * Requires: teams:update:all permission
 */
router.patch(
  '/:id/members/:userId/role',
  csrfValidateToken,
  requirePermission('teams', 'update', 'all'),
  validateUuid(),
  validateUuid('userId'),
  validateDto(UpdateMemberRoleDto),
  controller.updateMemberRole
);

// ============================================================================
// Team Channel Account Routes
// ============================================================================

/**
 * GET /teams/:id/channel-accounts
 * List all channel accounts associated with a team.
 * Requires: teams:read:all permission
 */
router.get(
  '/:id/channel-accounts',
  requirePermission('teams', 'read', 'all'),
  validateUuid(),
  controller.listChannelAccounts
);

/**
 * POST /teams/:id/channel-accounts
 * Add a channel account to a team.
 * Requires: teams:update:all permission
 */
router.post(
  '/:id/channel-accounts',
  csrfValidateToken,
  requirePermission('teams', 'update', 'all'),
  validateUuid(),
  validateDto(AddChannelAccountDto),
  controller.addChannelAccount
);

/**
 * DELETE /teams/:id/channel-accounts/:channelAccountId
 * Remove a channel account from a team.
 * Requires: teams:update:all permission
 */
router.delete(
  '/:id/channel-accounts/:channelAccountId',
  csrfValidateToken,
  requirePermission('teams', 'update', 'all'),
  validateUuid(),
  validateUuid('channelAccountId'),
  controller.removeChannelAccount
);

export default router;
