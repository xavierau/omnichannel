import { Repository } from 'typeorm';
import { singleton } from 'tsyringe';
import { AppDataSource } from '@config/database.config';
import { TeamMember } from '../entities/team-member.entity';
import { TeamMemberRole } from '../enums';
import { Team } from '../entities/team.entity';

/**
 * Repository for TeamMember entity operations.
 * Handles team membership management.
 */
@singleton()
export class TeamMemberRepository {
  private _repository: Repository<TeamMember> | null = null;
  private _teamRepository: Repository<Team> | null = null;

  /**
   * Lazy initialization of the repository to ensure AppDataSource is initialized.
   */
  private get repository(): Repository<TeamMember> {
    if (!this._repository) {
      this._repository = AppDataSource.getRepository(TeamMember);
    }
    return this._repository;
  }

  /**
   * Lazy initialization of team repository.
   */
  private get teamRepository(): Repository<Team> {
    if (!this._teamRepository) {
      this._teamRepository = AppDataSource.getRepository(Team);
    }
    return this._teamRepository;
  }

  /**
   * Find all members of a team.
   *
   * @param teamId - The team ID
   * @returns Array of team members
   */
  async findByTeam(teamId: string): Promise<TeamMember[]> {
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
  async findByUser(userId: string): Promise<TeamMember[]> {
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
  async findTeamsByUser(userId: string): Promise<Team[]> {
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
  async findByTeamAndUser(
    teamId: string,
    userId: string
  ): Promise<TeamMember | null> {
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
  async findMembership(
    teamId: string,
    userId: string
  ): Promise<TeamMember | null> {
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
  async addMember(
    teamId: string,
    userId: string,
    role: TeamMemberRole
  ): Promise<TeamMember> {
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
  async removeMember(teamId: string, userId: string): Promise<boolean> {
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
  async updateRole(
    teamId: string,
    userId: string,
    role: TeamMemberRole
  ): Promise<TeamMember | null> {
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
  async isMember(teamId: string, userId: string): Promise<boolean> {
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
  async isLeader(teamId: string, userId: string): Promise<boolean> {
    const count = await this.repository.count({
      where: { teamId, userId, role: TeamMemberRole.LEADER },
    });
    return count > 0;
  }

  /**
   * Count members in a team.
   *
   * @param teamId - The team ID
   * @returns The number of members
   */
  async countByTeam(teamId: string): Promise<number> {
    return this.repository.count({ where: { teamId } });
  }

  /**
   * Count members in a team with a specific role.
   *
   * @param teamId - The team ID
   * @param role - The role to count
   * @returns The number of members with the specified role
   */
  async countByRole(teamId: string, role: TeamMemberRole): Promise<number> {
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
  async create(data: Partial<TeamMember>): Promise<TeamMember> {
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
  async delete(teamId: string, userId: string): Promise<boolean> {
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
  async getTeamIdsByUser(userId: string): Promise<string[]> {
    const memberships = await this.repository
      .createQueryBuilder('tm')
      .select('tm.team_id', 'teamId')
      .where('tm.user_id = :userId', { userId })
      .getRawMany<{ teamId: string }>();

    return memberships.map((m) => m.teamId);
  }

  /**
   * Remove all members from a team.
   * Useful when deleting a team.
   *
   * @param teamId - The team ID
   * @returns The number of members removed
   */
  async removeAllByTeam(teamId: string): Promise<number> {
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
  async bulkAddMembers(
    teamId: string,
    members: Array<{ userId: string; role: TeamMemberRole }>
  ): Promise<TeamMember[]> {
    if (members.length === 0) {
      return [];
    }

    const queryRunner = this.repository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const memberEntities = members.map((m) =>
        this.repository.create({
          teamId,
          userId: m.userId,
          role: m.role,
        })
      );

      const savedMembers = await queryRunner.manager.save(
        TeamMember,
        memberEntities
      );
      await queryRunner.commitTransaction();
      return savedMembers;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
