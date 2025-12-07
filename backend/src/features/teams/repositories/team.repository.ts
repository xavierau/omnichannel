import { Repository } from 'typeorm';
import { singleton } from 'tsyringe';
import { AppDataSource } from '@config/database.config';
import { Team } from '../entities/team.entity';

/**
 * Repository for Team entity operations.
 * Handles CRUD operations with tenant isolation.
 */
@singleton()
export class TeamRepository {
  private _repository: Repository<Team> | null = null;

  /**
   * Lazy initialization of the repository to ensure AppDataSource is initialized.
   */
  private get repository(): Repository<Team> {
    if (!this._repository) {
      this._repository = AppDataSource.getRepository(Team);
    }
    return this._repository;
  }

  /**
   * Find a team by ID with tenant isolation.
   *
   * @param tenantId - The tenant ID for isolation
   * @param id - The team ID to find
   * @returns The team if found, null otherwise
   */
  async findById(tenantId: string, id: string): Promise<Team | null> {
    return this.repository.findOne({
      where: { id, tenantId },
    });
  }

  /**
   * Find a team by ID without tenant isolation.
   * Use with caution - typically for internal operations
   * where tenant has already been validated.
   *
   * @param id - The team ID to find
   * @returns The team if found, null otherwise
   */
  async findByIdWithoutTenant(id: string): Promise<Team | null> {
    return this.repository.findOne({
      where: { id },
    });
  }

  /**
   * Find a team by name within a tenant.
   *
   * @param tenantId - The tenant ID for isolation
   * @param name - The team name to search for (case-insensitive)
   * @returns The team if found, null otherwise
   */
  async findByName(tenantId: string, name: string): Promise<Team | null> {
    return this.repository
      .createQueryBuilder('team')
      .where('team.tenant_id = :tenantId', { tenantId })
      .andWhere('LOWER(team.name) = LOWER(:name)', { name })
      .getOne();
  }

  /**
   * Find all teams for a tenant.
   *
   * @param tenantId - The tenant ID
   * @returns Array of teams belonging to the tenant
   */
  async findByTenant(tenantId: string): Promise<Team[]> {
    return this.repository.find({
      where: { tenantId },
      order: { name: 'ASC' },
    });
  }

  /**
   * Find all active teams for a tenant.
   *
   * @param tenantId - The tenant ID
   * @returns Array of active teams belonging to the tenant
   */
  async findActiveByTenant(tenantId: string): Promise<Team[]> {
    return this.repository.find({
      where: { tenantId, isActive: true },
      order: { name: 'ASC' },
    });
  }

  /**
   * Create a new team.
   *
   * @param data - The team data to create
   * @returns The created team
   */
  async create(data: Partial<Team>): Promise<Team> {
    const team = this.repository.create(data);
    return this.repository.save(team);
  }

  /**
   * Update an existing team.
   *
   * @param tenantId - The tenant ID for isolation
   * @param id - The team ID to update
   * @param data - The data to update
   * @returns The updated team if found, null otherwise
   */
  async update(
    tenantId: string,
    id: string,
    data: Partial<Team>
  ): Promise<Team | null> {
    const team = await this.findById(tenantId, id);
    if (!team) {
      return null;
    }

    Object.assign(team, data);
    return this.repository.save(team);
  }

  /**
   * Delete a team by ID with tenant isolation.
   *
   * @param tenantId - The tenant ID for isolation
   * @param id - The team ID to delete
   * @returns True if deleted, false if not found
   */
  async delete(tenantId: string, id: string): Promise<boolean> {
    const result = await this.repository.delete({ id, tenantId });
    return (result.affected ?? 0) > 0;
  }

  /**
   * Check if a team exists by name within a tenant.
   * Useful for preventing duplicate team names.
   *
   * @param name - The team name to check
   * @param tenantId - The tenant ID
   * @param excludeId - Optional team ID to exclude (for updates)
   * @returns True if a team with the name exists
   */
  async existsByName(
    name: string,
    tenantId: string,
    excludeId?: string
  ): Promise<boolean> {
    const query = this.repository
      .createQueryBuilder('team')
      .where('LOWER(team.name) = LOWER(:name)', { name })
      .andWhere('team.tenant_id = :tenantId', { tenantId });

    if (excludeId) {
      query.andWhere('team.id != :excludeId', { excludeId });
    }

    const count = await query.getCount();
    return count > 0;
  }

  /**
   * Count teams for a tenant.
   *
   * @param tenantId - The tenant ID
   * @returns The number of teams
   */
  async countByTenant(tenantId: string): Promise<number> {
    return this.repository.count({ where: { tenantId } });
  }
}
