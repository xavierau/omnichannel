import { Request, Response } from 'express';
import { inject, singleton } from 'tsyringe';
import { TeamService } from './services/team.service';
import { asyncHandler } from '@middleware/async-handler';
import { NotFoundException } from '@shared/exceptions/http-exceptions';
import { TeamMemberRole } from './enums';

/**
 * Controller for team management operations.
 *
 * Handles HTTP request/response mapping for:
 * - Team CRUD operations
 * - Team member management
 * - Team channel account access control
 */
@singleton()
export class TeamController {
  constructor(@inject(TeamService) private teamService: TeamService) {}

  // ============================================================================
  // Team CRUD Operations
  // ============================================================================

  /**
   * GET /teams
   * List all teams for the current tenant.
   */
  listTeams = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;

    const teams = await this.teamService.getTeams(tenantId);

    res.json({
      data: teams,
    });
  });

  /**
   * POST /teams
   * Create a new team.
   */
  createTeam = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const { name, description } = req.body;

    const team = await this.teamService.createTeam(tenantId, name, description);

    res.status(201).json({
      data: team,
    });
  });

  /**
   * GET /teams/:id
   * Get a specific team by ID.
   */
  getTeam = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const { id } = req.params;

    const team = await this.teamService.getTeam(tenantId, id);

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    res.json({
      data: team,
    });
  });

  /**
   * PATCH /teams/:id
   * Update an existing team.
   */
  updateTeam = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const { id } = req.params;

    const team = await this.teamService.updateTeam(tenantId, id, req.body);

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    res.json({
      data: team,
    });
  });

  /**
   * DELETE /teams/:id
   * Delete a team.
   */
  deleteTeam = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const { id } = req.params;

    const deleted = await this.teamService.deleteTeam(tenantId, id);

    if (!deleted) {
      throw new NotFoundException('Team not found');
    }

    res.status(204).send();
  });

  // ============================================================================
  // Team Member Management
  // ============================================================================

  /**
   * GET /teams/:id/members
   * List all members of a team.
   */
  listMembers = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const { id } = req.params;

    // Verify team exists and belongs to tenant
    const team = await this.teamService.getTeam(tenantId, id);
    if (!team) {
      throw new NotFoundException('Team not found');
    }

    const members = await this.teamService.getTeamMembers(id);

    res.json({
      data: members,
    });
  });

  /**
   * POST /teams/:id/members
   * Add a member to a team.
   */
  addMember = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const { id } = req.params;
    const { userId, role } = req.body;

    // Verify team exists and belongs to tenant
    const team = await this.teamService.getTeam(tenantId, id);
    if (!team) {
      throw new NotFoundException('Team not found');
    }

    const member = await this.teamService.addMember(
      id,
      userId,
      role ?? TeamMemberRole.MEMBER
    );

    res.status(201).json({
      data: member,
    });
  });

  /**
   * DELETE /teams/:id/members/:userId
   * Remove a member from a team.
   */
  removeMember = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const { id, userId } = req.params;

    // Verify team exists and belongs to tenant
    const team = await this.teamService.getTeam(tenantId, id);
    if (!team) {
      throw new NotFoundException('Team not found');
    }

    const removed = await this.teamService.removeMember(id, userId);

    if (!removed) {
      throw new NotFoundException('Member not found in team');
    }

    res.status(204).send();
  });

  /**
   * PATCH /teams/:id/members/:userId/role
   * Update a team member's role.
   */
  updateMemberRole = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const { id, userId } = req.params;
    const { role } = req.body;

    // Verify team exists and belongs to tenant
    const team = await this.teamService.getTeam(tenantId, id);
    if (!team) {
      throw new NotFoundException('Team not found');
    }

    const member = await this.teamService.updateMemberRole(id, userId, role);

    if (!member) {
      throw new NotFoundException('Member not found in team');
    }

    res.json({
      data: member,
    });
  });

  // ============================================================================
  // Team Channel Account Management
  // ============================================================================

  /**
   * GET /teams/:id/channel-accounts
   * List all channel accounts associated with a team.
   */
  listChannelAccounts = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const { id } = req.params;

    // Verify team exists and belongs to tenant
    const team = await this.teamService.getTeam(tenantId, id);
    if (!team) {
      throw new NotFoundException('Team not found');
    }

    const channelAccounts = await this.teamService.getTeamChannelAccounts(id);

    res.json({
      data: channelAccounts,
    });
  });

  /**
   * POST /teams/:id/channel-accounts
   * Add a channel account to a team.
   */
  addChannelAccount = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const { id } = req.params;
    const { channelAccountId } = req.body;

    // Verify team exists and belongs to tenant
    const team = await this.teamService.getTeam(tenantId, id);
    if (!team) {
      throw new NotFoundException('Team not found');
    }

    const association = await this.teamService.addChannelAccount(id, channelAccountId);

    res.status(201).json({
      data: association,
    });
  });

  /**
   * DELETE /teams/:id/channel-accounts/:channelAccountId
   * Remove a channel account from a team.
   */
  removeChannelAccount = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const { id, channelAccountId } = req.params;

    // Verify team exists and belongs to tenant
    const team = await this.teamService.getTeam(tenantId, id);
    if (!team) {
      throw new NotFoundException('Team not found');
    }

    const removed = await this.teamService.removeChannelAccount(id, channelAccountId);

    if (!removed) {
      throw new NotFoundException('Channel account not associated with team');
    }

    res.status(204).send();
  });
}
