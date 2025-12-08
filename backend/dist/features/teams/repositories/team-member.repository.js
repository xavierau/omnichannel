"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TeamMemberRepository = void 0;
const tsyringe_1 = require("tsyringe");
const database_config_1 = require("@config/database.config");
const team_member_entity_1 = require("../entities/team-member.entity");
const enums_1 = require("../enums");
const team_entity_1 = require("../entities/team.entity");
/**
 * Repository for TeamMember entity operations.
 * Handles team membership management.
 */
let TeamMemberRepository = class TeamMemberRepository {
    _repository = null;
    _teamRepository = null;
    /**
     * Lazy initialization of the repository to ensure AppDataSource is initialized.
     */
    get repository() {
        if (!this._repository) {
            this._repository = database_config_1.AppDataSource.getRepository(team_member_entity_1.TeamMember);
        }
        return this._repository;
    }
    /**
     * Lazy initialization of team repository.
     */
    get teamRepository() {
        if (!this._teamRepository) {
            this._teamRepository = database_config_1.AppDataSource.getRepository(team_entity_1.Team);
        }
        return this._teamRepository;
    }
    /**
     * Find all members of a team.
     *
     * @param teamId - The team ID
     * @returns Array of team members
     */
    async findByTeam(teamId) {
        return this.repository.find({
            where: { teamId },
            order: { createdAt: 'ASC' },
        });
    }
    /**
     * Find all team memberships for a user.
     *
     * @param userId - The user ID
     * @returns Array of team memberships
     */
    async findByUser(userId) {
        return this.repository.find({
            where: { userId },
            order: { createdAt: 'ASC' },
        });
    }
    /**
     * Find all teams a user belongs to.
     * Returns the full Team entities with eager loading.
     *
     * @param userId - The user ID
     * @returns Array of teams the user is a member of
     */
    async findTeamsByUser(userId) {
        return this.teamRepository
            .createQueryBuilder('team')
            .innerJoin('team_members', 'tm', 'tm.team_id = team.id')
            .where('tm.user_id = :userId', { userId })
            .andWhere('team.is_active = :isActive', { isActive: true })
            .orderBy('team.name', 'ASC')
            .getMany();
    }
    /**
     * Find a specific team membership by team ID and user ID.
     *
     * @param teamId - The team ID
     * @param userId - The user ID
     * @returns The membership if found, null otherwise
     */
    async findByTeamAndUser(teamId, userId) {
        return this.repository.findOne({
            where: { teamId, userId },
        });
    }
    /**
     * Find a specific team membership.
     * Alias for findByTeamAndUser.
     *
     * @param teamId - The team ID
     * @param userId - The user ID
     * @returns The membership if found, null otherwise
     */
    async findMembership(teamId, userId) {
        return this.findByTeamAndUser(teamId, userId);
    }
    /**
     * Add a member to a team.
     *
     * @param teamId - The team ID
     * @param userId - The user ID to add
     * @param role - The member's role (leader or member)
     * @returns The created team membership
     */
    async addMember(teamId, userId, role) {
        const member = this.repository.create({
            teamId,
            userId,
            role,
        });
        return this.repository.save(member);
    }
    /**
     * Remove a member from a team.
     *
     * @param teamId - The team ID
     * @param userId - The user ID to remove
     * @returns True if removed, false if not found
     */
    async removeMember(teamId, userId) {
        const result = await this.repository.delete({ teamId, userId });
        return (result.affected ?? 0) > 0;
    }
    /**
     * Update a member's role within a team.
     *
     * @param teamId - The team ID
     * @param userId - The user ID
     * @param role - The new role
     * @returns The updated membership if found, null otherwise
     */
    async updateRole(teamId, userId, role) {
        const member = await this.findMembership(teamId, userId);
        if (!member) {
            return null;
        }
        member.role = role;
        return this.repository.save(member);
    }
    /**
     * Check if a user is a member of a team.
     *
     * @param teamId - The team ID
     * @param userId - The user ID
     * @returns True if the user is a member
     */
    async isMember(teamId, userId) {
        const count = await this.repository.count({
            where: { teamId, userId },
        });
        return count > 0;
    }
    /**
     * Check if a user is a team leader.
     *
     * @param teamId - The team ID
     * @param userId - The user ID
     * @returns True if the user is a leader
     */
    async isLeader(teamId, userId) {
        const count = await this.repository.count({
            where: { teamId, userId, role: enums_1.TeamMemberRole.LEADER },
        });
        return count > 0;
    }
    /**
     * Count members in a team.
     *
     * @param teamId - The team ID
     * @returns The number of members
     */
    async countByTeam(teamId) {
        return this.repository.count({ where: { teamId } });
    }
    /**
     * Count members in a team with a specific role.
     *
     * @param teamId - The team ID
     * @param role - The role to count
     * @returns The number of members with the specified role
     */
    async countByRole(teamId, role) {
        return this.repository.count({
            where: { teamId, role },
        });
    }
    /**
     * Create a team membership.
     *
     * @param data - The membership data
     * @returns The created team membership
     */
    async create(data) {
        const member = this.repository.create(data);
        return this.repository.save(member);
    }
    /**
     * Delete a team membership by team ID and user ID.
     *
     * @param teamId - The team ID
     * @param userId - The user ID to remove
     * @returns True if removed, false if not found
     */
    async delete(teamId, userId) {
        const result = await this.repository.delete({ teamId, userId });
        return (result.affected ?? 0) > 0;
    }
    /**
     * Get all team IDs a user belongs to.
     * Lightweight query returning only IDs.
     *
     * @param userId - The user ID
     * @returns Array of team IDs
     */
    async getTeamIdsByUser(userId) {
        const memberships = await this.repository
            .createQueryBuilder('tm')
            .select('tm.team_id', 'teamId')
            .where('tm.user_id = :userId', { userId })
            .getRawMany();
        return memberships.map((m) => m.teamId);
    }
    /**
     * Remove all members from a team.
     * Useful when deleting a team.
     *
     * @param teamId - The team ID
     * @returns The number of members removed
     */
    async removeAllByTeam(teamId) {
        const result = await this.repository.delete({ teamId });
        return result.affected ?? 0;
    }
    /**
     * Bulk add members to a team.
     * Uses transaction for atomicity.
     *
     * @param teamId - The team ID
     * @param members - Array of user IDs and roles to add
     * @returns Array of created memberships
     */
    async bulkAddMembers(teamId, members) {
        if (members.length === 0) {
            return [];
        }
        const queryRunner = this.repository.manager.connection.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
            const memberEntities = members.map((m) => this.repository.create({
                teamId,
                userId: m.userId,
                role: m.role,
            }));
            const savedMembers = await queryRunner.manager.save(team_member_entity_1.TeamMember, memberEntities);
            await queryRunner.commitTransaction();
            return savedMembers;
        }
        catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        }
        finally {
            await queryRunner.release();
        }
    }
};
exports.TeamMemberRepository = TeamMemberRepository;
exports.TeamMemberRepository = TeamMemberRepository = __decorate([
    (0, tsyringe_1.singleton)()
], TeamMemberRepository);
