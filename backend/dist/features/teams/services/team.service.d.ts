import { TeamRepository } from '../repositories/team.repository';
import { TeamMemberRepository } from '../repositories/team-member.repository';
import { TeamChannelAccountRepository } from '../repositories/team-channel-account.repository';
import { Team } from '../entities/team.entity';
import { TeamMember } from '../entities/team-member.entity';
import { TeamMemberRole } from '../enums';
import { TeamChannelAccount } from '../entities/team-channel-account.entity';
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
export declare class TeamService {
    private teamRepository;
    private teamMemberRepository;
    private teamChannelAccountRepository;
    constructor(teamRepository: TeamRepository, teamMemberRepository: TeamMemberRepository, teamChannelAccountRepository: TeamChannelAccountRepository);
    /**
     * Creates a new team within a tenant.
     *
     * @param tenantId - The tenant ID for isolation
     * @param name - The team name (must be unique within tenant)
     * @param description - Optional team description
     * @returns The created team
     * @throws ConflictException if team name already exists in tenant
     */
    createTeam(tenantId: string, name: string, description?: string): Promise<Team>;
    /**
     * Retrieves all teams for a tenant.
     *
     * @param tenantId - The tenant ID for isolation
     * @returns Array of teams belonging to the tenant
     */
    getTeams(tenantId: string): Promise<Team[]>;
    /**
     * Retrieves a single team by ID.
     *
     * @param tenantId - The tenant ID for isolation
     * @param teamId - The team ID
     * @returns The team or null if not found
     */
    getTeam(tenantId: string, teamId: string): Promise<Team | null>;
    /**
     * Updates a team's properties.
     *
     * @param tenantId - The tenant ID for isolation
     * @param teamId - The team ID to update
     * @param data - The update data (name, description, isActive)
     * @returns The updated team or null if not found
     * @throws ConflictException if new name conflicts with existing team
     */
    updateTeam(tenantId: string, teamId: string, data: UpdateTeamData): Promise<Team | null>;
    /**
     * Deletes a team.
     *
     * Note: This will cascade delete all team members and channel account associations.
     *
     * @param tenantId - The tenant ID for isolation
     * @param teamId - The team ID to delete
     * @returns True if deleted, false if not found
     */
    deleteTeam(tenantId: string, teamId: string): Promise<boolean>;
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
    addMember(teamId: string, userId: string, role?: TeamMemberRole): Promise<TeamMember>;
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
    removeMember(teamId: string, userId: string): Promise<boolean>;
    /**
     * Retrieves all members of a team.
     *
     * @param teamId - The team ID
     * @returns Array of team members
     */
    getTeamMembers(teamId: string): Promise<TeamMember[]>;
    /**
     * Retrieves all teams a user belongs to.
     *
     * @param userId - The user ID
     * @returns Array of teams the user is a member of
     */
    getUserTeams(userId: string): Promise<Team[]>;
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
    updateMemberRole(teamId: string, userId: string, newRole: TeamMemberRole): Promise<TeamMember | null>;
    /**
     * Grants a team access to a channel account.
     *
     * @param teamId - The team ID
     * @param channelAccountId - The channel account ID
     * @returns The created team channel account association
     * @throws NotFoundException if team not found
     * @throws ConflictException if access already granted
     */
    addChannelAccount(teamId: string, channelAccountId: string): Promise<TeamChannelAccount>;
    /**
     * Revokes a team's access to a channel account.
     *
     * @param teamId - The team ID
     * @param channelAccountId - The channel account ID
     * @returns True if revoked, false if association didn't exist
     */
    removeChannelAccount(teamId: string, channelAccountId: string): Promise<boolean>;
    /**
     * Retrieves all channel account associations for a team.
     *
     * @param teamId - The team ID
     * @returns Array of team channel account associations
     */
    getTeamChannelAccounts(teamId: string): Promise<TeamChannelAccount[]>;
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
    getAccessibleChannelAccountIds(userId: string): Promise<string[]>;
    /**
     * Checks if a user has access to a specific channel account.
     *
     * @param userId - The user ID
     * @param channelAccountId - The channel account ID
     * @returns True if user has access through any team membership
     */
    hasAccessToChannelAccount(userId: string, channelAccountId: string): Promise<boolean>;
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
    addMembers(teamId: string, userIds: string[], role?: TeamMemberRole): Promise<{
        added: number;
        skipped: number;
    }>;
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
    addChannelAccounts(teamId: string, channelAccountIds: string[]): Promise<{
        added: number;
        skipped: number;
    }>;
}
