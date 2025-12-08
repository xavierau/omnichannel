import { TeamChannelAccount } from '../entities/team-channel-account.entity';
/**
 * Repository for TeamChannelAccount entity operations.
 * Handles the relationship between teams and channel accounts.
 * Critical for team-based access control.
 */
export declare class TeamChannelAccountRepository {
    private _repository;
    /**
     * Lazy initialization of the repository to ensure AppDataSource is initialized.
     */
    private get repository();
    /**
     * Find all channel account associations for a team.
     *
     * @param teamId - The team ID
     * @returns Array of team-channel account associations
     */
    findByTeam(teamId: string): Promise<TeamChannelAccount[]>;
    /**
     * Find all teams associated with a channel account.
     *
     * @param channelAccountId - The channel account ID
     * @returns Array of team-channel account associations
     */
    findByChannelAccount(channelAccountId: string): Promise<TeamChannelAccount[]>;
    /**
     * Find a specific team-channel account association.
     *
     * @param teamId - The team ID
     * @param channelAccountId - The channel account ID
     * @returns The association if found, null otherwise
     */
    findByTeamAndChannelAccount(teamId: string, channelAccountId: string): Promise<TeamChannelAccount | null>;
    /**
     * CRITICAL: Get all channel account IDs a user can access via their team memberships.
     * This is the primary query for enforcing team-based access control.
     *
     * The query joins team_channel_accounts with team_members to find
     * all channel accounts accessible through any team the user belongs to.
     *
     * @param userId - The user ID
     * @returns Array of accessible channel account IDs (deduplicated)
     */
    getAccessibleChannelAccountIds(userId: string): Promise<string[]>;
    /**
     * Check if a user has access to a specific channel account.
     *
     * @param userId - The user ID
     * @param channelAccountId - The channel account ID
     * @returns True if the user has access
     */
    hasAccess(userId: string, channelAccountId: string): Promise<boolean>;
    /**
     * Create a team-channel account association.
     *
     * @param data - The association data
     * @returns The created association
     */
    create(data: Partial<TeamChannelAccount>): Promise<TeamChannelAccount>;
    /**
     * Add a channel account to a team.
     *
     * @param teamId - The team ID
     * @param channelAccountId - The channel account ID
     * @returns The created association
     */
    addChannelAccount(teamId: string, channelAccountId: string): Promise<TeamChannelAccount>;
    /**
     * Delete a team-channel account association.
     *
     * @param teamId - The team ID
     * @param channelAccountId - The channel account ID
     * @returns True if removed, false if not found
     */
    delete(teamId: string, channelAccountId: string): Promise<boolean>;
    /**
     * Remove a channel account from a team.
     * Alias for delete method.
     *
     * @param teamId - The team ID
     * @param channelAccountId - The channel account ID
     * @returns True if removed, false if not found
     */
    removeChannelAccount(teamId: string, channelAccountId: string): Promise<boolean>;
    /**
     * Check if an association exists.
     *
     * @param teamId - The team ID
     * @param channelAccountId - The channel account ID
     * @returns True if the association exists
     */
    exists(teamId: string, channelAccountId: string): Promise<boolean>;
    /**
     * Get channel account IDs for a team.
     * Lightweight query returning only IDs.
     *
     * @param teamId - The team ID
     * @returns Array of channel account IDs
     */
    getChannelAccountIdsByTeam(teamId: string): Promise<string[]>;
    /**
     * Remove all channel account associations for a team.
     * Useful when deleting a team.
     *
     * @param teamId - The team ID
     * @returns The number of associations removed
     */
    removeAllByTeam(teamId: string): Promise<number>;
    /**
     * Remove all team associations for a channel account.
     * Useful when deleting a channel account.
     *
     * @param channelAccountId - The channel account ID
     * @returns The number of associations removed
     */
    removeAllByChannelAccount(channelAccountId: string): Promise<number>;
    /**
     * Bulk add channel accounts to a team.
     * Uses transaction for atomicity.
     *
     * @param teamId - The team ID
     * @param channelAccountIds - Array of channel account IDs to add
     * @returns Array of created associations
     */
    bulkAddChannelAccounts(teamId: string, channelAccountIds: string[]): Promise<TeamChannelAccount[]>;
    /**
     * Sync channel accounts for a team.
     * Removes existing associations and adds new ones.
     * Uses transaction for atomicity.
     *
     * @param teamId - The team ID
     * @param channelAccountIds - Array of channel account IDs to set
     * @returns Array of new associations
     */
    syncChannelAccounts(teamId: string, channelAccountIds: string[]): Promise<TeamChannelAccount[]>;
    /**
     * Count channel accounts for a team.
     *
     * @param teamId - The team ID
     * @returns The number of channel accounts
     */
    countByTeam(teamId: string): Promise<number>;
    /**
     * Count teams for a channel account.
     *
     * @param channelAccountId - The channel account ID
     * @returns The number of teams
     */
    countByChannelAccount(channelAccountId: string): Promise<number>;
}
