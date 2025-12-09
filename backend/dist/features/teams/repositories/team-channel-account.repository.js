"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TeamChannelAccountRepository = void 0;
const tsyringe_1 = require("tsyringe");
const database_config_1 = require("../../../config/database.config");
const team_channel_account_entity_1 = require("../entities/team-channel-account.entity");
/**
 * Repository for TeamChannelAccount entity operations.
 * Handles the relationship between teams and channel accounts.
 * Critical for team-based access control.
 */
let TeamChannelAccountRepository = class TeamChannelAccountRepository {
    _repository = null;
    /**
     * Lazy initialization of the repository to ensure AppDataSource is initialized.
     */
    get repository() {
        if (!this._repository) {
            this._repository = database_config_1.AppDataSource.getRepository(team_channel_account_entity_1.TeamChannelAccount);
        }
        return this._repository;
    }
    /**
     * Find all channel account associations for a team.
     *
     * @param teamId - The team ID
     * @returns Array of team-channel account associations
     */
    async findByTeam(teamId) {
        return this.repository.find({
            where: { teamId },
            order: { createdAt: 'ASC' },
        });
    }
    /**
     * Find all teams associated with a channel account.
     *
     * @param channelAccountId - The channel account ID
     * @returns Array of team-channel account associations
     */
    async findByChannelAccount(channelAccountId) {
        return this.repository.find({
            where: { channelAccountId },
            order: { createdAt: 'ASC' },
        });
    }
    /**
     * Find a specific team-channel account association.
     *
     * @param teamId - The team ID
     * @param channelAccountId - The channel account ID
     * @returns The association if found, null otherwise
     */
    async findByTeamAndChannelAccount(teamId, channelAccountId) {
        return this.repository.findOne({
            where: { teamId, channelAccountId },
        });
    }
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
    async getAccessibleChannelAccountIds(userId) {
        const result = await this.repository
            .createQueryBuilder('tca')
            .select('DISTINCT tca.channel_account_id', 'channelAccountId')
            .innerJoin('team_members', 'tm', 'tca.team_id = tm.team_id')
            .where('tm.user_id = :userId', { userId })
            .getRawMany();
        return result.map((r) => r.channelAccountId);
    }
    /**
     * Check if a user has access to a specific channel account.
     *
     * @param userId - The user ID
     * @param channelAccountId - The channel account ID
     * @returns True if the user has access
     */
    async hasAccess(userId, channelAccountId) {
        const count = await this.repository
            .createQueryBuilder('tca')
            .innerJoin('team_members', 'tm', 'tca.team_id = tm.team_id')
            .where('tm.user_id = :userId', { userId })
            .andWhere('tca.channel_account_id = :channelAccountId', {
            channelAccountId,
        })
            .getCount();
        return count > 0;
    }
    /**
     * Create a team-channel account association.
     *
     * @param data - The association data
     * @returns The created association
     */
    async create(data) {
        const association = this.repository.create(data);
        return this.repository.save(association);
    }
    /**
     * Add a channel account to a team.
     *
     * @param teamId - The team ID
     * @param channelAccountId - The channel account ID
     * @returns The created association
     */
    async addChannelAccount(teamId, channelAccountId) {
        return this.create({ teamId, channelAccountId });
    }
    /**
     * Delete a team-channel account association.
     *
     * @param teamId - The team ID
     * @param channelAccountId - The channel account ID
     * @returns True if removed, false if not found
     */
    async delete(teamId, channelAccountId) {
        const result = await this.repository.delete({ teamId, channelAccountId });
        return (result.affected ?? 0) > 0;
    }
    /**
     * Remove a channel account from a team.
     * Alias for delete method.
     *
     * @param teamId - The team ID
     * @param channelAccountId - The channel account ID
     * @returns True if removed, false if not found
     */
    async removeChannelAccount(teamId, channelAccountId) {
        return this.delete(teamId, channelAccountId);
    }
    /**
     * Check if an association exists.
     *
     * @param teamId - The team ID
     * @param channelAccountId - The channel account ID
     * @returns True if the association exists
     */
    async exists(teamId, channelAccountId) {
        const count = await this.repository.count({
            where: { teamId, channelAccountId },
        });
        return count > 0;
    }
    /**
     * Get channel account IDs for a team.
     * Lightweight query returning only IDs.
     *
     * @param teamId - The team ID
     * @returns Array of channel account IDs
     */
    async getChannelAccountIdsByTeam(teamId) {
        const associations = await this.repository
            .createQueryBuilder('tca')
            .select('tca.channel_account_id', 'channelAccountId')
            .where('tca.team_id = :teamId', { teamId })
            .getRawMany();
        return associations.map((a) => a.channelAccountId);
    }
    /**
     * Remove all channel account associations for a team.
     * Useful when deleting a team.
     *
     * @param teamId - The team ID
     * @returns The number of associations removed
     */
    async removeAllByTeam(teamId) {
        const result = await this.repository.delete({ teamId });
        return result.affected ?? 0;
    }
    /**
     * Remove all team associations for a channel account.
     * Useful when deleting a channel account.
     *
     * @param channelAccountId - The channel account ID
     * @returns The number of associations removed
     */
    async removeAllByChannelAccount(channelAccountId) {
        const result = await this.repository.delete({ channelAccountId });
        return result.affected ?? 0;
    }
    /**
     * Bulk add channel accounts to a team.
     * Uses transaction for atomicity.
     *
     * @param teamId - The team ID
     * @param channelAccountIds - Array of channel account IDs to add
     * @returns Array of created associations
     */
    async bulkAddChannelAccounts(teamId, channelAccountIds) {
        if (channelAccountIds.length === 0) {
            return [];
        }
        const queryRunner = this.repository.manager.connection.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
            const associations = channelAccountIds.map((channelAccountId) => this.repository.create({
                teamId,
                channelAccountId,
            }));
            const savedAssociations = await queryRunner.manager.save(team_channel_account_entity_1.TeamChannelAccount, associations);
            await queryRunner.commitTransaction();
            return savedAssociations;
        }
        catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        }
        finally {
            await queryRunner.release();
        }
    }
    /**
     * Sync channel accounts for a team.
     * Removes existing associations and adds new ones.
     * Uses transaction for atomicity.
     *
     * @param teamId - The team ID
     * @param channelAccountIds - Array of channel account IDs to set
     * @returns Array of new associations
     */
    async syncChannelAccounts(teamId, channelAccountIds) {
        const queryRunner = this.repository.manager.connection.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
            // Remove existing associations
            await queryRunner.manager.delete(team_channel_account_entity_1.TeamChannelAccount, { teamId });
            // Add new associations if any
            if (channelAccountIds.length === 0) {
                await queryRunner.commitTransaction();
                return [];
            }
            const associations = channelAccountIds.map((channelAccountId) => this.repository.create({
                teamId,
                channelAccountId,
            }));
            const savedAssociations = await queryRunner.manager.save(team_channel_account_entity_1.TeamChannelAccount, associations);
            await queryRunner.commitTransaction();
            return savedAssociations;
        }
        catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        }
        finally {
            await queryRunner.release();
        }
    }
    /**
     * Count channel accounts for a team.
     *
     * @param teamId - The team ID
     * @returns The number of channel accounts
     */
    async countByTeam(teamId) {
        return this.repository.count({ where: { teamId } });
    }
    /**
     * Count teams for a channel account.
     *
     * @param channelAccountId - The channel account ID
     * @returns The number of teams
     */
    async countByChannelAccount(channelAccountId) {
        return this.repository.count({ where: { channelAccountId } });
    }
};
exports.TeamChannelAccountRepository = TeamChannelAccountRepository;
exports.TeamChannelAccountRepository = TeamChannelAccountRepository = __decorate([
    (0, tsyringe_1.singleton)()
], TeamChannelAccountRepository);
