import { Repository, SelectQueryBuilder, In } from 'typeorm';
import { singleton } from 'tsyringe';
import { AppDataSource } from '@config/database.config';
import { CustomerGroup, GroupCriteria } from './group.entity';
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

/**
 * Allowed sort columns for group queries.
 * Maps user-facing field names to database column names.
 * This serves as an allowlist to prevent SQL injection.
 */
const ALLOWED_SORT_COLUMNS: Record<string, string> = {
  name: 'name',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
};

/**
 * Default sort column if none specified or if invalid column provided.
 */
const DEFAULT_SORT_COLUMN = 'created_at';

/**
 * Validates and maps a sort column name to its database column.
 */
const getSafeSortColumn = (sortBy: string | undefined): string => {
  if (!sortBy) {
    return DEFAULT_SORT_COLUMN;
  }
  return ALLOWED_SORT_COLUMNS[sortBy] ?? DEFAULT_SORT_COLUMN;
};

@singleton()
export class GroupRepository {
  private _repository: Repository<CustomerGroup> | null = null;
  private _customerRepository: Repository<Customer> | null = null;

  /**
   * Lazy initialization of the repository to ensure AppDataSource is initialized.
   */
  private get repository(): Repository<CustomerGroup> {
    if (!this._repository) {
      this._repository = AppDataSource.getRepository(CustomerGroup);
    }
    return this._repository;
  }

  /**
   * Lazy initialization of customer repository.
   */
  private get customerRepository(): Repository<Customer> {
    if (!this._customerRepository) {
      this._customerRepository = AppDataSource.getRepository(Customer);
    }
    return this._customerRepository;
  }

  async findById(tenantId: string, id: string): Promise<CustomerGroup | null> {
    return this.repository.findOne({
      where: { id, tenantId },
    });
  }

  async findAll(
    tenantId: string,
    options: GroupQueryOptions = {}
  ): Promise<PaginatedResult<CustomerGroup>> {
    const {
      search,
      isStatic,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = options;

    const query = this.repository
      .createQueryBuilder('group')
      .where('group.tenant_id = :tenantId', { tenantId });

    // Search by name or description
    if (search) {
      query.andWhere(
        '(LOWER(group.name) LIKE LOWER(:search) OR LOWER(group.description) LIKE LOWER(:search))',
        { search: `%${search}%` }
      );
    }

    // Filter by static/dynamic type
    if (isStatic !== undefined) {
      query.andWhere('group.is_static = :isStatic', { isStatic });
    }

    // Sorting - use allowlist to prevent SQL injection
    const sortColumn = getSafeSortColumn(sortBy);
    const order = (sortOrder || 'desc').toUpperCase() as 'ASC' | 'DESC';
    query.orderBy(`group.${sortColumn}`, order);

    // Pagination
    const skip = (page - 1) * limit;
    query.skip(skip).take(limit);

    const [data, total] = await query.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async create(data: Partial<CustomerGroup>): Promise<CustomerGroup> {
    const group = this.repository.create(data);
    return this.repository.save(group);
  }

  async update(
    id: string,
    tenantId: string,
    data: Partial<CustomerGroup>
  ): Promise<CustomerGroup | null> {
    const group = await this.findById(tenantId, id);
    if (!group) return null;

    Object.assign(group, data);
    return this.repository.save(group);
  }

  async delete(id: string, tenantId: string): Promise<boolean> {
    const result = await this.repository.delete({ id, tenantId });
    return (result.affected ?? 0) > 0;
  }

  async existsByName(
    name: string,
    tenantId: string,
    excludeId?: string
  ): Promise<boolean> {
    const query = this.repository
      .createQueryBuilder('group')
      .where('LOWER(group.name) = LOWER(:name)', { name })
      .andWhere('group.tenant_id = :tenantId', { tenantId });

    if (excludeId) {
      query.andWhere('group.id != :excludeId', { excludeId });
    }

    const count = await query.getCount();
    return count > 0;
  }

  /**
   * Gets the count of members in a group.
   * For static groups, counts the memberIds array.
   * For dynamic groups, executes the criteria query.
   */
  async getMemberCount(tenantId: string, groupId: string): Promise<number> {
    const group = await this.findById(tenantId, groupId);
    if (!group) return 0;

    if (group.isStatic) {
      return group.memberIds?.length ?? 0;
    }

    // Dynamic group - query customers based on criteria
    const query = this.buildDynamicMemberQuery(tenantId, group.criteria);
    return query.getCount();
  }

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
  async getMemberCountsBulk(
    tenantId: string,
    groupIds: string[]
  ): Promise<Map<string, number>> {
    if (groupIds.length === 0) {
      return new Map();
    }

    // Fetch all groups in a single query
    const groups = await this.repository.find({
      where: { tenantId, id: In(groupIds) },
    });

    const counts = new Map<string, number>();

    // Process static groups immediately (no DB query needed)
    const staticGroups = groups.filter(g => g.isStatic);
    for (const group of staticGroups) {
      counts.set(group.id, group.memberIds?.length ?? 0);
    }

    // Process dynamic groups in parallel
    const dynamicGroups = groups.filter(g => !g.isStatic);
    if (dynamicGroups.length > 0) {
      const dynamicPromises = dynamicGroups.map(async group => {
        const query = this.buildDynamicMemberQuery(tenantId, group.criteria);
        const count = await query.getCount();
        return { id: group.id, count };
      });

      const results = await Promise.all(dynamicPromises);
      for (const result of results) {
        counts.set(result.id, result.count);
      }
    }

    return counts;
  }

  /**
   * Gets all member IDs in a group.
   * For static groups, returns the memberIds array.
   * For dynamic groups, executes the criteria query.
   */
  async getMemberIds(tenantId: string, groupId: string): Promise<string[]> {
    const group = await this.findById(tenantId, groupId);
    if (!group) return [];

    if (group.isStatic) {
      return group.memberIds ?? [];
    }

    // Dynamic group - query customers based on criteria
    const query = this.buildDynamicMemberQuery(tenantId, group.criteria);
    const customers = await query.select('customer.id').getMany();
    return customers.map((c) => c.id);
  }

  /**
   * Gets paginated members for a group.
   * Returns full customer entities with tags.
   */
  async getMembers(
    tenantId: string,
    groupId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedResult<Customer>> {
    const group = await this.findById(tenantId, groupId);
    if (!group) {
      return { data: [], total: 0, page, limit, totalPages: 0 };
    }

    let query: SelectQueryBuilder<Customer>;

    if (group.isStatic) {
      if (!group.memberIds || group.memberIds.length === 0) {
        return { data: [], total: 0, page, limit, totalPages: 0 };
      }

      query = this.customerRepository
        .createQueryBuilder('customer')
        .leftJoinAndSelect('customer.tags', 'tags')
        .where('customer.id IN (:...memberIds)', { memberIds: group.memberIds })
        .andWhere('customer.tenant_id = :tenantId', { tenantId });
    } else {
      query = this.buildDynamicMemberQuery(tenantId, group.criteria);
      query.leftJoinAndSelect('customer.tags', 'tags');
    }

    // Pagination
    const skip = (page - 1) * limit;
    query.skip(skip).take(limit);
    query.orderBy('customer.createdAt', 'DESC');

    const [data, total] = await query.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Validates that all provided customer IDs exist for the tenant.
   * Returns the count of valid customer IDs.
   */
  async validateCustomerIds(
    customerIds: string[],
    tenantId: string
  ): Promise<number> {
    if (customerIds.length === 0) return 0;

    const count = await this.customerRepository
      .createQueryBuilder('customer')
      .where('customer.id IN (:...customerIds)', { customerIds })
      .andWhere('customer.tenant_id = :tenantId', { tenantId })
      .getCount();

    return count;
  }

  /**
   * Builds a query to find customers matching dynamic group criteria.
   */
  private buildDynamicMemberQuery(
    tenantId: string,
    criteria: GroupCriteria | null
  ): SelectQueryBuilder<Customer> {
    const query = this.customerRepository
      .createQueryBuilder('customer')
      .where('customer.tenant_id = :tenantId', { tenantId });

    if (!criteria) {
      return query;
    }

    // Filter by tags (OR logic - matches customers with any of the tags)
    if (criteria.tagIds && criteria.tagIds.length > 0) {
      query.andWhere((qb) => {
        const subQuery = qb
          .subQuery()
          .select('ct.customer_id')
          .from('customer_tags', 'ct')
          .where('ct.tag_id IN (:...tagIds)', { tagIds: criteria.tagIds })
          .getQuery();
        return `customer.id IN ${subQuery}`;
      });
    }

    // Filter by creation date range
    if (criteria.createdAfter) {
      query.andWhere('customer.created_at >= :createdAfter', {
        createdAfter: criteria.createdAfter,
      });
    }

    if (criteria.createdBefore) {
      query.andWhere('customer.created_at <= :createdBefore', {
        createdBefore: criteria.createdBefore,
      });
    }

    // Filter by custom field conditions using parameterized jsonb_extract_path_text
    // This prevents SQL injection by never interpolating field keys into the query
    if (criteria.customFieldConditions && criteria.customFieldConditions.length > 0) {
      criteria.customFieldConditions.forEach((condition, index) => {
        const keyParam = `cfKey${index}`;
        const valueParam = `cfValue${index}`;

        switch (condition.operator) {
          case 'equals':
            if (typeof condition.value === 'boolean') {
              query.andWhere(
                `(jsonb_extract_path_text(customer.custom_fields, :${keyParam}))::boolean = :${valueParam}`,
                {
                  [keyParam]: condition.fieldKey,
                  [valueParam]: condition.value,
                }
              );
            } else if (typeof condition.value === 'number') {
              query.andWhere(
                `(jsonb_extract_path_text(customer.custom_fields, :${keyParam}))::numeric = :${valueParam}`,
                {
                  [keyParam]: condition.fieldKey,
                  [valueParam]: condition.value,
                }
              );
            } else {
              query.andWhere(
                `jsonb_extract_path_text(customer.custom_fields, :${keyParam}) = :${valueParam}`,
                {
                  [keyParam]: condition.fieldKey,
                  [valueParam]: String(condition.value),
                }
              );
            }
            break;

          case 'contains':
            query.andWhere(
              `LOWER(jsonb_extract_path_text(customer.custom_fields, :${keyParam})) LIKE LOWER(:${valueParam})`,
              {
                [keyParam]: condition.fieldKey,
                [valueParam]: `%${String(condition.value)}%`,
              }
            );
            break;

          case 'greaterThan':
            query.andWhere(
              `(jsonb_extract_path_text(customer.custom_fields, :${keyParam}))::numeric > :${valueParam}`,
              {
                [keyParam]: condition.fieldKey,
                [valueParam]: Number(condition.value),
              }
            );
            break;

          case 'lessThan':
            query.andWhere(
              `(jsonb_extract_path_text(customer.custom_fields, :${keyParam}))::numeric < :${valueParam}`,
              {
                [keyParam]: condition.fieldKey,
                [valueParam]: Number(condition.value),
              }
            );
            break;
        }
      });
    }

    return query;
  }
}
