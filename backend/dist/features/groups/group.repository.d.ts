import { CustomerGroup } from './group.entity';
import { Customer } from '../customers/customer.entity';
export interface GroupQueryOptions {
    search?: string;
    isStatic?: boolean;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc' | 'ASC' | 'DESC';
}
export interface PaginatedResult<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}
export declare class GroupRepository {
    private _repository;
    private _customerRepository;
    /**
     * Lazy initialization of the repository to ensure AppDataSource is initialized.
     */
    private get repository();
    /**
     * Lazy initialization of customer repository.
     */
    private get customerRepository();
    findById(tenantId: string, id: string): Promise<CustomerGroup | null>;
    findAll(tenantId: string, options?: GroupQueryOptions): Promise<PaginatedResult<CustomerGroup>>;
    create(data: Partial<CustomerGroup>): Promise<CustomerGroup>;
    update(id: string, tenantId: string, data: Partial<CustomerGroup>): Promise<CustomerGroup | null>;
    delete(id: string, tenantId: string): Promise<boolean>;
    existsByName(name: string, tenantId: string, excludeId?: string): Promise<boolean>;
    /**
     * Gets the count of members in a group.
     * For static groups, counts the memberIds array.
     * For dynamic groups, executes the criteria query.
     */
    getMemberCount(tenantId: string, groupId: string): Promise<number>;
    /**
     * Gets member counts for multiple groups in bulk.
     * Optimizes by separating static and dynamic groups:
     * - Static groups: immediate calculation from memberIds array
     * - Dynamic groups: parallel Promise.all for criteria queries
     *
     * This prevents N+1 queries when listing groups with member counts.
     *
     * @param tenantId - The tenant ID for isolation
     * @param groupIds - Array of group IDs to get counts for
     * @returns Map of group ID to member count
     */
    getMemberCountsBulk(tenantId: string, groupIds: string[]): Promise<Map<string, number>>;
    /**
     * Gets all member IDs in a group.
     * For static groups, returns the memberIds array.
     * For dynamic groups, executes the criteria query.
     */
    getMemberIds(tenantId: string, groupId: string): Promise<string[]>;
    /**
     * Gets paginated members for a group.
     * Returns full customer entities with tags.
     */
    getMembers(tenantId: string, groupId: string, page?: number, limit?: number): Promise<PaginatedResult<Customer>>;
    /**
     * Validates that all provided customer IDs exist for the tenant.
     * Returns the count of valid customer IDs.
     */
    validateCustomerIds(customerIds: string[], tenantId: string): Promise<number>;
    /**
     * Builds a query to find customers matching dynamic group criteria.
     */
    private buildDynamicMemberQuery;
}
