import { singleton, inject } from 'tsyringe';
import { TeamRepository } from '../repositories/team.repository';
import { TeamMemberRepository } from '../repositories/team-member.repository';
import { TeamChannelAccountRepository } from '../repositories/team-channel-account.repository';
import { Team } from '../entities/team.entity';
import { TeamMember } from '../entities/team-member.entity';
import { TeamMemberRole } from '../enums';
import { TeamChannelAccount } from '../entities/team-channel-account.entity';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '../../../shared/exceptions/http-exceptions';
import { auditLogger } from '../../../config/logger.config';

/**
 * Data transfer object for updating a team.
 */
export interface UpdateTeamData {
  name?: string;
  description?: string;
  isActive?: boolean;
}

/**
 * Service layer for team management operations.
 *
 * Handles business logic for:
 * - Team CRUD operations
 * - Team membership management
 * - Team channel account access control
 *
 * This service is critical for inbox access control. The `getAccessibleChannelAccountIds`
 * method determines which channel accounts a user can view conversations from.
 */
@singleton()
export class TeamService {
  constructor(
    @inject(TeamRepository) private teamRepository: TeamRepository,
    @inject(TeamMemberRepository) private teamMemberRepository: TeamMemberRepository,
    @inject(TeamChannelAccountRepository) private teamChannelAccountRepository: TeamChannelAccountRepository
  ) {}

  // ============================================================================
  // Team CRUD Operations
  // ============================================================================

  /**
   * Creates a new team within a tenant.
   *
   * @param tenantId - The tenant ID for isolation
   * @param name - The team name (must be unique within tenant)
   * @param description - Optional team description
   * @returns The created team
   * @throws ConflictException if team name already exists in tenant
   */
  async createTeam(
    tenantId: string,
    name: string,
    description?: string
  ): Promise<Team> {
    // Validate team name uniqueness within tenant
    const nameExists = await this.teamRepository.existsByName(name, tenantId);
    if (nameExists) {
      throw new ConflictException(`Team with name "${name}" already exists`);
    }

    const team = await this.teamRepository.create({
      tenantId,
      name,
      description: description ?? null,
      isActive: true,
    });

    auditLogger.info('Team created', {
      action: 'team.create',
      tenantId,
      teamId: team.id,
      teamName: team.name,
    });

    return team;
  }

  /**
   * Retrieves all teams for a tenant.
   *
   * @param tenantId - The tenant ID for isolation
   * @returns Array of teams belonging to the tenant
   */
  async getTeams(tenantId: string): Promise<Team[]> {
    return this.teamRepository.findByTenant(tenantId);
  }

  /**
   * Retrieves a single team by ID.
   *
   * @param tenantId - The tenant ID for isolation
   * @param teamId - The team ID
   * @returns The team or null if not found
   */
  async getTeam(tenantId: string, teamId: string): Promise<Team | null> {
    return this.teamRepository.findById(tenantId, teamId);
  }

  /**
   * Updates a team's properties.
   *
   * @param tenantId - The tenant ID for isolation
   * @param teamId - The team ID to update
   * @param data - The update data (name, description, isActive)
   * @returns The updated team or null if not found
   * @throws ConflictException if new name conflicts with existing team
   */
  async updateTeam(
    tenantId: string,
    teamId: string,
    data: UpdateTeamData
  ): Promise<Team | null> {
    const existingTeam = await this.teamRepository.findById(tenantId, teamId);
    if (!existingTeam) {
      return null;
    }

    // If name is being changed, validate uniqueness
    if (data.name !== undefined && data.name !== existingTeam.name) {
      const nameExists = await this.teamRepository.existsByName(data.name, tenantId, teamId);
      if (nameExists) {
        throw new ConflictException(`Team with name "${data.name}" already exists`);
      }
    }

    const updated = await this.teamRepository.update(tenantId, teamId, data);

    if (updated) {
      auditLogger.info('Team updated', {
        action: 'team.update',
        tenantId,
        teamId,
        changes: Object.keys(data),
      });
    }

    return updated;
  }

  /**
   * Deletes a team.
   *
   * Note: This will cascade delete all team members and channel account associations.
   *
   * @param tenantId - The tenant ID for isolation
   * @param teamId - The team ID to delete
   * @returns True if deleted, false if not found
   */
  async deleteTeam(tenantId: string, teamId: string): Promise<boolean> {
    const team = await this.teamRepository.findById(tenantId, teamId);
    if (!team) {
      return false;
    }

    const deleted = await this.teamRepository.delete(tenantId, teamId);

    if (deleted) {
      auditLogger.info('Team deleted', {
        action: 'team.delete',
        tenantId,
        teamId,
        teamName: team.name,
      });
    }

    return deleted;
  }

  // ============================================================================
  // Team Member Management
  // ============================================================================

  /**
   * Adds a user as a member of a team.
   *
   * @param teamId - The team ID
   * @param userId - The user ID to add
   * @param role - The member's role (defaults to MEMBER)
   * @returns The created team member
   * @throws NotFoundException if team not found
   * @throws ConflictException if user is already a member
   */
  async addMember(
    teamId: string,
    userId: string,
    role: TeamMemberRole = TeamMemberRole.MEMBER
  ): Promise<TeamMember> {
    // Check if user is already a member
    const existingMember = await this.teamMemberRepository.findMembership(teamId, userId);
    if (existingMember) {
      throw new ConflictException('User is already a member of this team');
    }

    const member = await this.teamMemberRepository.addMember(teamId, userId, role);

    auditLogger.info('Team member added', {
      action: 'team.member.add',
      teamId,
      userId,
      role,
    });

    return member;
  }

  /**
   * Removes a user from a team.
   *
   * Business rule: Cannot remove the last leader from a team.
   * At least one leader must remain.
   *
   * @param teamId - The team ID
   * @param userId - The user ID to remove
   * @returns True if removed, false if not a member
   * @throws BadRequestException if attempting to remove the last leader
   */
  async removeMember(teamId: string, userId: string): Promise<boolean> {
    const member = await this.teamMemberRepository.findByTeamAndUser(teamId, userId);
    if (!member) {
      return false;
    }

    // Business rule: Cannot remove the last leader
    if (member.role === TeamMemberRole.LEADER) {
      const leaderCount = await this.teamMemberRepository.countByRole(
        teamId,
        TeamMemberRole.LEADER
      );

      if (leaderCount <= 1) {
        throw new BadRequestException(
          'Cannot remove the last team leader. Assign another leader before removing this member.'
        );
      }
    }

    const removed = await this.teamMemberRepository.delete(teamId, userId);

    if (removed) {
      const team = await this.teamRepository.findByIdWithoutTenant(teamId);
      auditLogger.info('Team member removed', {
        action: 'team.member.remove',
        teamId,
        userId,
        tenantId: team?.tenantId,
      });
    }

    return removed;
  }

  /**
   * Retrieves all members of a team.
   *
   * @param teamId - The team ID
   * @returns Array of team members
   */
  async getTeamMembers(teamId: string): Promise<TeamMember[]> {
    return this.teamMemberRepository.findByTeam(teamId);
  }

  /**
   * Retrieves all teams a user belongs to.
   *
   * @param userId - The user ID
   * @returns Array of teams the user is a member of
   */
  async getUserTeams(userId: string): Promise<Team[]> {
    return this.teamMemberRepository.findTeamsByUser(userId);
  }

  /**
   * Updates a team member's role.
   *
   * Business rule: Cannot demote the last leader.
   *
   * @param teamId - The team ID
   * @param userId - The user ID
   * @param newRole - The new role
   * @returns The updated team member or null if not found
   * @throws BadRequestException if demoting the last leader
   */
  async updateMemberRole(
    teamId: string,
    userId: string,
    newRole: TeamMemberRole
  ): Promise<TeamMember | null> {
    const member = await this.teamMemberRepository.findByTeamAndUser(teamId, userId);
    if (!member) {
      return null;
    }

    // Business rule: Cannot demote the last leader
    if (
      member.role === TeamMemberRole.LEADER &&
      newRole !== TeamMemberRole.LEADER
    ) {
      const leaderCount = await this.teamMemberRepository.countByRole(
        teamId,
        TeamMemberRole.LEADER
      );

      if (leaderCount <= 1) {
        throw new BadRequestException(
          'Cannot demote the last team leader. Promote another member to leader first.'
        );
      }
    }

    const updated = await this.teamMemberRepository.updateRole(teamId, userId, newRole);

    if (updated) {
      const team = await this.teamRepository.findByIdWithoutTenant(teamId);
      auditLogger.info('Team member role updated', {
        action: 'team.member.role_update',
        teamId,
        userId,
        oldRole: member.role,
        newRole,
        tenantId: team?.tenantId,
      });
    }

    return updated;
  }

  // ============================================================================
  // Channel Account Access Control
  // ============================================================================

  /**
   * Grants a team access to a channel account.
   *
   * @param teamId - The team ID
   * @param channelAccountId - The channel account ID
   * @returns The created team channel account association
   * @throws NotFoundException if team not found
   * @throws ConflictException if access already granted
   */
  async addChannelAccount(
    teamId: string,
    channelAccountId: string
  ): Promise<TeamChannelAccount> {
    // Verify team exists
    const team = await this.teamRepository.findByIdWithoutTenant(teamId);
    if (!team) {
      throw new NotFoundException('Team not found');
    }

    // Check if already associated
    const existing = await this.teamChannelAccountRepository.findByTeamAndChannelAccount(
      teamId,
      channelAccountId
    );
    if (existing) {
      throw new ConflictException('Team already has access to this channel account');
    }

    const association = await this.teamChannelAccountRepository.create({
      teamId,
      channelAccountId,
    });

    auditLogger.info('Channel account access granted to team', {
      action: 'team.channel_account.add',
      teamId,
      channelAccountId,
      tenantId: team.tenantId,
    });

    return association;
  }

  /**
   * Revokes a team's access to a channel account.
   *
   * @param teamId - The team ID
   * @param channelAccountId - The channel account ID
   * @returns True if revoked, false if association didn't exist
   */
  async removeChannelAccount(
    teamId: string,
    channelAccountId: string
  ): Promise<boolean> {
    const removed = await this.teamChannelAccountRepository.delete(teamId, channelAccountId);

    if (removed) {
      const team = await this.teamRepository.findByIdWithoutTenant(teamId);
      auditLogger.info('Channel account access revoked from team', {
        action: 'team.channel_account.remove',
        teamId,
        channelAccountId,
        tenantId: team?.tenantId,
      });
    }

    return removed;
  }

  /**
   * Retrieves all channel account associations for a team.
   *
   * @param teamId - The team ID
   * @returns Array of team channel account associations
   */
  async getTeamChannelAccounts(teamId: string): Promise<TeamChannelAccount[]> {
    return this.teamChannelAccountRepository.findByTeam(teamId);
  }

  /**
   * CRITICAL: Gets all channel account IDs that a user can access.
   *
   * This is the cornerstone of inbox access control. A user can access
   * conversations from channel accounts if they belong to a team that
   * has been granted access to those channel accounts.
   *
   * Flow:
   * 1. Find all teams the user belongs to
   * 2. Find all channel accounts those teams have access to
   * 3. Return the unique set of channel account IDs
   *
   * @param userId - The user ID
   * @returns Array of channel account IDs the user can access
   */
  async getAccessibleChannelAccountIds(userId: string): Promise<string[]> {
    return this.teamChannelAccountRepository.getAccessibleChannelAccountIds(userId);
  }

  /**
   * Checks if a user has access to a specific channel account.
   *
   * @param userId - The user ID
   * @param channelAccountId - The channel account ID
   * @returns True if user has access through any team membership
   */
  async hasAccessToChannelAccount(
    userId: string,
    channelAccountId: string
  ): Promise<boolean> {
    const accessibleIds = await this.getAccessibleChannelAccountIds(userId);
    return accessibleIds.includes(channelAccountId);
  }

  // ============================================================================
  // Bulk Operations
  // ============================================================================

  /**
   * Adds multiple users to a team at once.
   *
   * Skips users who are already members (no error thrown for duplicates).
   *
   * @param teamId - The team ID
   * @param userIds - Array of user IDs to add
   * @param role - The role for all new members (defaults to MEMBER)
   * @returns Object containing counts of added and skipped members
   * @throws NotFoundException if team not found
   */
  async addMembers(
    teamId: string,
    userIds: string[],
    role: TeamMemberRole = TeamMemberRole.MEMBER
  ): Promise<{ added: number; skipped: number }> {
    const team = await this.teamRepository.findByIdWithoutTenant(teamId);
    if (!team) {
      throw new NotFoundException('Team not found');
    }

    let added = 0;
    let skipped = 0;

    for (const userId of userIds) {
      const existingMember = await this.teamMemberRepository.findByTeamAndUser(teamId, userId);
      if (existingMember) {
        skipped++;
        continue;
      }

      await this.teamMemberRepository.create({
        teamId,
        userId,
        role,
      });
      added++;
    }

    auditLogger.info('Team members bulk added', {
      action: 'team.member.bulk_add',
      teamId,
      userCount: userIds.length,
      added,
      skipped,
      tenantId: team.tenantId,
    });

    return { added, skipped };
  }

  /**
   * Grants team access to multiple channel accounts at once.
   *
   * Skips associations that already exist (no error thrown for duplicates).
   *
   * @param teamId - The team ID
   * @param channelAccountIds - Array of channel account IDs
   * @returns Object containing counts of added and skipped associations
   * @throws NotFoundException if team not found
   */
  async addChannelAccounts(
    teamId: string,
    channelAccountIds: string[]
  ): Promise<{ added: number; skipped: number }> {
    const team = await this.teamRepository.findByIdWithoutTenant(teamId);
    if (!team) {
      throw new NotFoundException('Team not found');
    }

    let added = 0;
    let skipped = 0;

    for (const channelAccountId of channelAccountIds) {
      const existing = await this.teamChannelAccountRepository.findByTeamAndChannelAccount(
        teamId,
        channelAccountId
      );
      if (existing) {
        skipped++;
        continue;
      }

      await this.teamChannelAccountRepository.create({
        teamId,
        channelAccountId,
      });
      added++;
    }

    auditLogger.info('Channel accounts bulk added to team', {
      action: 'team.channel_account.bulk_add',
      teamId,
      channelAccountCount: channelAccountIds.length,
      added,
      skipped,
      tenantId: team.tenantId,
    });

    return { added, skipped };
  }
}
