"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const tsyringe_1 = require("tsyringe");
const team_controller_1 = require("./team.controller");
const csrf_protection_1 = require("@middleware/csrf-protection");
const authenticate_1 = require("@middleware/authenticate");
const authorize_1 = require("@middleware/authorize");
const validate_dto_1 = require("@middleware/validate-dto");
const require_tenant_1 = require("@middleware/require-tenant");
const validate_uuid_1 = require("@middleware/validate-uuid");
const create_team_dto_1 = require("./dto/create-team.dto");
const update_team_dto_1 = require("./dto/update-team.dto");
const add_member_dto_1 = require("./dto/add-member.dto");
const add_channel_account_dto_1 = require("./dto/add-channel-account.dto");
const update_member_role_dto_1 = require("./dto/update-member-role.dto");
const router = (0, express_1.Router)();
const controller = tsyringe_1.container.resolve(team_controller_1.TeamController);
// All routes require authentication and tenant
router.use(authenticate_1.authenticate);
router.use(require_tenant_1.requireTenant);
// ============================================================================
// Team CRUD Routes
// ============================================================================
/**
 * GET /teams
 * List all teams for the current tenant.
 * Requires: teams:read:all permission
 */
router.get('/', (0, authorize_1.requirePermission)('teams', 'read', 'all'), controller.listTeams);
/**
 * POST /teams
 * Create a new team.
 * Requires: teams:create:all permission
 */
router.post('/', csrf_protection_1.csrfValidateToken, (0, authorize_1.requirePermission)('teams', 'create', 'all'), (0, validate_dto_1.validateDto)(create_team_dto_1.CreateTeamDto), controller.createTeam);
/**
 * GET /teams/:id
 * Get a specific team by ID.
 * Requires: teams:read:all permission
 */
router.get('/:id', (0, authorize_1.requirePermission)('teams', 'read', 'all'), (0, validate_uuid_1.validateUuid)(), controller.getTeam);
/**
 * PATCH /teams/:id
 * Update an existing team.
 * Requires: teams:update:all permission
 */
router.patch('/:id', csrf_protection_1.csrfValidateToken, (0, authorize_1.requirePermission)('teams', 'update', 'all'), (0, validate_uuid_1.validateUuid)(), (0, validate_dto_1.validateDto)(update_team_dto_1.UpdateTeamDto), controller.updateTeam);
/**
 * DELETE /teams/:id
 * Delete a team.
 * Requires: teams:delete:all permission
 */
router.delete('/:id', csrf_protection_1.csrfValidateToken, (0, authorize_1.requirePermission)('teams', 'delete', 'all'), (0, validate_uuid_1.validateUuid)(), controller.deleteTeam);
// ============================================================================
// Team Member Routes
// ============================================================================
/**
 * GET /teams/:id/members
 * List all members of a team.
 * Requires: teams:read:all permission
 */
router.get('/:id/members', (0, authorize_1.requirePermission)('teams', 'read', 'all'), (0, validate_uuid_1.validateUuid)(), controller.listMembers);
/**
 * POST /teams/:id/members
 * Add a member to a team.
 * Requires: teams:update:all permission
 */
router.post('/:id/members', csrf_protection_1.csrfValidateToken, (0, authorize_1.requirePermission)('teams', 'update', 'all'), (0, validate_uuid_1.validateUuid)(), (0, validate_dto_1.validateDto)(add_member_dto_1.AddMemberDto), controller.addMember);
/**
 * DELETE /teams/:id/members/:userId
 * Remove a member from a team.
 * Requires: teams:update:all permission
 */
router.delete('/:id/members/:userId', csrf_protection_1.csrfValidateToken, (0, authorize_1.requirePermission)('teams', 'update', 'all'), (0, validate_uuid_1.validateUuid)(), (0, validate_uuid_1.validateUuid)('userId'), controller.removeMember);
/**
 * PATCH /teams/:id/members/:userId/role
 * Update a team member's role.
 * Requires: teams:update:all permission
 */
router.patch('/:id/members/:userId/role', csrf_protection_1.csrfValidateToken, (0, authorize_1.requirePermission)('teams', 'update', 'all'), (0, validate_uuid_1.validateUuid)(), (0, validate_uuid_1.validateUuid)('userId'), (0, validate_dto_1.validateDto)(update_member_role_dto_1.UpdateMemberRoleDto), controller.updateMemberRole);
// ============================================================================
// Team Channel Account Routes
// ============================================================================
/**
 * GET /teams/:id/channel-accounts
 * List all channel accounts associated with a team.
 * Requires: teams:read:all permission
 */
router.get('/:id/channel-accounts', (0, authorize_1.requirePermission)('teams', 'read', 'all'), (0, validate_uuid_1.validateUuid)(), controller.listChannelAccounts);
/**
 * POST /teams/:id/channel-accounts
 * Add a channel account to a team.
 * Requires: teams:update:all permission
 */
router.post('/:id/channel-accounts', csrf_protection_1.csrfValidateToken, (0, authorize_1.requirePermission)('teams', 'update', 'all'), (0, validate_uuid_1.validateUuid)(), (0, validate_dto_1.validateDto)(add_channel_account_dto_1.AddChannelAccountDto), controller.addChannelAccount);
/**
 * DELETE /teams/:id/channel-accounts/:channelAccountId
 * Remove a channel account from a team.
 * Requires: teams:update:all permission
 */
router.delete('/:id/channel-accounts/:channelAccountId', csrf_protection_1.csrfValidateToken, (0, authorize_1.requirePermission)('teams', 'update', 'all'), (0, validate_uuid_1.validateUuid)(), (0, validate_uuid_1.validateUuid)('channelAccountId'), controller.removeChannelAccount);
exports.default = router;
