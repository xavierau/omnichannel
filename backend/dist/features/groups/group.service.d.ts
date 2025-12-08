import { GroupRepository, GroupQueryOptions, PaginatedResult } from './group.repository';
import { CustomerGroup } from './group.entity';
import { Customer } from '../customers/customer.entity';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
/**
 * Service for managing customer groups.
 * Handles business logic for both static and dynamic groups.
 */
export declare class GroupService {
    private groupRepository;
    constructor(groupRepository: GroupRepository);
    /**
     * Lists all groups for a tenant with pagination.
     * Includes member count for each group.
     * Uses bulk member count query to prevent N+1 queries.
     */
    listGroups(tenantId: string, options: GroupQueryOptions): Promise<PaginatedResult<CustomerGroup & {
        memberCount: number;
    }>>;
    /**
     * Gets a single group by ID with member count.
     */
    getGroup(tenantId: string, id: string): Promise<CustomerGroup & {
        memberCount: number;
    }>;
    /**
     * Creates a new customer group.
     *
     * For static groups:
     * - Validates that all provided memberIds exist
     *
     * For dynamic groups:
     * - Stores the criteria for runtime resolution
     */
    createGroup(dto: CreateGroupDto, tenantId: string): Promise<CustomerGroup>;
    /**
     * Updates an existing customer group.
     *
     * Validates:
     * - Name uniqueness if name is being changed
     * - memberIds validity if updating a static group
     * - Proper criteria/memberIds when changing group type
     */
    updateGroup(id: string, dto: UpdateGroupDto, tenantId: string): Promise<CustomerGroup>;
    /**
     * Deletes a customer group.
     */
    deleteGroup(id: string, tenantId: string): Promise<void>;
    /**
     * Gets paginated members of a group.
     * Works for both static and dynamic groups.
     */
    getGroupMembers(tenantId: string, groupId: string, page?: number, limit?: number): Promise<PaginatedResult<Customer>>;
    /**
     * Resolves all customer IDs in a group.
     * Used for broadcasts to get the full list of recipients.
     *
     * For static groups: returns the stored memberIds
     * For dynamic groups: executes criteria query and returns matching customer IDs
     */
    resolveGroupMemberIds(tenantId: string, groupId: string): Promise<string[]>;
}
