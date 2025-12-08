import { TeamMember } from '../entities/team-member.entity';
import { TeamMemberRole } from '../enums';
import { Team } from '../entities/team.entity';
/**
 * Repository for TeamMember entity operations.
 * Handles team membership management.
 */
export declare class TeamMemberRepository {
    private _repository;
    private _teamRepository;
    /**
     * Lazy initialization of the repository to ensure AppDataSource is initialized.
     */
    private get repository();
    /**
     * Lazy initialization of team repository.
     */
    private get teamRepository();
    /**
     * Find all members of a team.
     *
     * @param teamId - The team ID
     * @returns Array of team members
     */
    findByTeam(teamId: string): Promise<TeamMember[]>;
    /**
     * Find all team memberships for a user.
     *
     * @param userId - The user ID
     * @returns Array of team memberships
     */
    findByUser(userId: string): Promise<TeamMember[]>;
    /**
     * Find all teams a user belongs to.
     * Returns the full Team entities with eager loading.
     *
     * @param userId - The user ID
     * @returns Array of teams the user is a member of
     */
    findTeamsByUser(userId: string): Promise<Team[]>;
    /**
     * Find a specific team membership by team ID and user ID.
     *
     * @param teamId - The team ID
     * @param userId - The user ID
     * @returns The membership if found, null otherwise
     */
    findByTeamAndUser(teamId: string, userId: string): Promise<TeamMember | null>;
    /**
     * Find a specific team membership.
     * Alias for findByTeamAndUser.
     *
     * @param teamId - The team ID
     * @param userId - The user ID
     * @returns The membership if found, null otherwise
     */
    findMembership(teamId: string, userId: string): Promise<TeamMember | null>;
    /**
     * Add a member to a team.
     *
     * @param teamId - The team ID
     * @param userId - The user ID to add
     * @param role - The member's role (leader or member)
     * @returns The created team membership
     */
    addMember(teamId: string, userId: string, role: TeamMemberRole): Promise<TeamMember>;
    /**
     * Remove a member from a team.
     *
     * @param teamId - The team ID
     * @param userId - The user ID to remove
     * @returns True if removed, false if not found
     */
    removeMember(teamId: string, userId: string): Promise<boolean>;
    /**
     * Update a member's role within a team.
     *
     * @param teamId - The team ID
     * @param userId - The user ID
     * @param role - The new role
     * @returns The updated membership if found, null otherwise
     */
    updateRole(teamId: string, userId: string, role: TeamMemberRole): Promise<TeamMember | null>;
    /**
     * Check if a user is a member of a team.
     *
     * @param teamId - The team ID
     * @param userId - The user ID
     * @returns True if the user is a member
     */
    isMember(teamId: string, userId: string): Promise<boolean>;
    /**
     * Check if a user is a team leader.
     *
     * @param teamId - The team ID
     * @param userId - The user ID
     * @returns True if the user is a leader
     */
    isLeader(teamId: string, userId: string): Promise<boolean>;
    /**
     * Count members in a team.
     *
     * @param teamId - The team ID
     * @returns The number of members
     */
    countByTeam(teamId: string): Promise<number>;
    /**
     * Count members in a team with a specific role.
     *
     * @param teamId - The team ID
     * @param role - The role to count
     * @returns The number of members with the specified role
     */
    countByRole(teamId: string, role: TeamMemberRole): Promise<number>;
    /**
     * Create a team membership.
     *
     * @param data - The membership data
     * @returns The created team membership
     */
    create(data: Partial<TeamMember>): Promise<TeamMember>;
    /**
     * Delete a team membership by team ID and user ID.
     *
     * @param teamId - The team ID
     * @param userId - The user ID to remove
     * @returns True if removed, false if not found
     */
    delete(teamId: string, userId: string): Promise<boolean>;
    /**
     * Get all team IDs a user belongs to.
     * Lightweight query returning only IDs.
     *
     * @param userId - The user ID
     * @returns Array of team IDs
     */
    getTeamIdsByUser(userId: string): Promise<string[]>;
    /**
     * Remove all members from a team.
     * Useful when deleting a team.
     *
     * @param teamId - The team ID
     * @returns The number of members removed
     */
    removeAllByTeam(teamId: string): Promise<number>;
    /**
     * Bulk add members to a team.
     * Uses transaction for atomicity.
     *
     * @param teamId - The team ID
     * @param members - Array of user IDs and roles to add
     * @returns Array of created memberships
     */
    bulkAddMembers(teamId: string, members: Array<{
        userId: string;
        role: TeamMemberRole;
    }>): Promise<TeamMember[]>;
}
