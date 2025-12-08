import { Team } from '../entities/team.entity';
/**
 * Repository for Team entity operations.
 * Handles CRUD operations with tenant isolation.
 */
export declare class TeamRepository {
    private _repository;
    /**
     * Lazy initialization of the repository to ensure AppDataSource is initialized.
     */
    private get repository();
    /**
     * Find a team by ID with tenant isolation.
     *
     * @param tenantId - The tenant ID for isolation
     * @param id - The team ID to find
     * @returns The team if found, null otherwise
     */
    findById(tenantId: string, id: string): Promise<Team | null>;
    /**
     * Find a team by ID without tenant isolation.
     * Use with caution - typically for internal operations
     * where tenant has already been validated.
     *
     * @param id - The team ID to find
     * @returns The team if found, null otherwise
     */
    findByIdWithoutTenant(id: string): Promise<Team | null>;
    /**
     * Find a team by name within a tenant.
     *
     * @param tenantId - The tenant ID for isolation
     * @param name - The team name to search for (case-insensitive)
     * @returns The team if found, null otherwise
     */
    findByName(tenantId: string, name: string): Promise<Team | null>;
    /**
     * Find all teams for a tenant.
     *
     * @param tenantId - The tenant ID
     * @returns Array of teams belonging to the tenant
     */
    findByTenant(tenantId: string): Promise<Team[]>;
    /**
     * Find all active teams for a tenant.
     *
     * @param tenantId - The tenant ID
     * @returns Array of active teams belonging to the tenant
     */
    findActiveByTenant(tenantId: string): Promise<Team[]>;
    /**
     * Create a new team.
     *
     * @param data - The team data to create
     * @returns The created team
     */
    create(data: Partial<Team>): Promise<Team>;
    /**
     * Update an existing team.
     *
     * @param tenantId - The tenant ID for isolation
     * @param id - The team ID to update
     * @param data - The data to update
     * @returns The updated team if found, null otherwise
     */
    update(tenantId: string, id: string, data: Partial<Team>): Promise<Team | null>;
    /**
     * Delete a team by ID with tenant isolation.
     *
     * @param tenantId - The tenant ID for isolation
     * @param id - The team ID to delete
     * @returns True if deleted, false if not found
     */
    delete(tenantId: string, id: string): Promise<boolean>;
    /**
     * Check if a team exists by name within a tenant.
     * Useful for preventing duplicate team names.
     *
     * @param name - The team name to check
     * @param tenantId - The tenant ID
     * @param excludeId - Optional team ID to exclude (for updates)
     * @returns True if a team with the name exists
     */
    existsByName(name: string, tenantId: string, excludeId?: string): Promise<boolean>;
    /**
     * Count teams for a tenant.
     *
     * @param tenantId - The tenant ID
     * @returns The number of teams
     */
    countByTenant(tenantId: string): Promise<number>;
}
