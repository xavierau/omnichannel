import { Repository, In } from 'typeorm';
import { singleton } from 'tsyringe';
import { AppDataSource } from '@config/database.config';
import { Customer } from './customer.entity';
import { Tag } from '../tags/tag.entity';

export interface CustomerQueryOptions {
  search?: string;
  tagIds?: string[];
  dateFrom?: string;
  dateTo?: string;
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
 * Allowed sort columns for customer queries.
 * Maps user-facing field names to database column names.
 * This serves as an allowlist to prevent SQL injection.
 */
const ALLOWED_SORT_COLUMNS: Record<string, string> = {
  name: 'name',
  createdAt: 'created_at',
  whatsappNumber: 'whatsapp_number',
  updatedAt: 'updated_at',
};

/**
 * Default sort column if none specified or if invalid column provided.
 */
const DEFAULT_SORT_COLUMN = 'created_at';

/**
 * Maximum number of records that can be exported at once.
 * This prevents memory exhaustion from exporting millions of records.
 */
export const MAX_EXPORT_RECORDS = 10000;

/**
 * Validates and maps a sort column name to its database column.
 *
 * @param sortBy - The user-provided sort column name
 * @returns The safe database column name
 */
const getSafeSortColumn = (sortBy: string | undefined): string => {
  if (!sortBy) {
    return DEFAULT_SORT_COLUMN;
  }
  return ALLOWED_SORT_COLUMNS[sortBy] ?? DEFAULT_SORT_COLUMN;
};

@singleton()
export class CustomerRepository {
  private repository: Repository<Customer>;

  constructor() {
    this.repository = AppDataSource.getRepository(Customer);
  }

  async findById(id: string, tenantId: string): Promise<Customer | null> {
    return this.repository.findOne({
      where: { id, tenantId },
      relations: ['tags'],
    });
  }

  async findByWhatsApp(
    whatsappNumber: string,
    tenantId: string
  ): Promise<Customer | null> {
    return this.repository.findOne({
      where: { whatsappNumber, tenantId },
      relations: ['tags'],
    });
  }

  async findAll(
    tenantId: string,
    options: CustomerQueryOptions = {}
  ): Promise<PaginatedResult<Customer>> {
    const {
      search,
      tagIds,
      dateFrom,
      dateTo,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = options;

    const query = this.repository
      .createQueryBuilder('customer')
      .leftJoinAndSelect('customer.tags', 'tags')
      .where('customer.tenant_id = :tenantId', { tenantId });

    // Search by name or whatsapp number
    if (search) {
      query.andWhere(
        '(LOWER(customer.name) LIKE LOWER(:search) OR customer.whatsapp_number LIKE :search)',
        { search: `%${search}%` }
      );
    }

    // Filter by tags (OR logic - matches customers with any of the tags)
    if (tagIds && tagIds.length > 0) {
      query.andWhere((qb) => {
        const subQuery = qb
          .subQuery()
          .select('ct.customer_id')
          .from('customer_tags', 'ct')
          .where('ct.tag_id IN (:...tagIds)', { tagIds })
          .getQuery();
        return `customer.id IN ${subQuery}`;
      });
    }

    // Filter by date range
    if (dateFrom) {
      query.andWhere('customer.created_at >= :dateFrom', { dateFrom });
    }

    if (dateTo) {
      query.andWhere('customer.created_at <= :dateTo', { dateTo });
    }

    // Sorting - use allowlist to prevent SQL injection
    const sortColumn = getSafeSortColumn(sortBy);
    const order = (sortOrder || 'desc').toUpperCase() as 'ASC' | 'DESC';
    query.orderBy(`customer.${sortColumn}`, order);

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

  async create(data: Partial<Customer>, tags?: Tag[]): Promise<Customer> {
    const customer = this.repository.create(data);
    if (tags) {
      customer.tags = tags;
    }
    return this.repository.save(customer);
  }

  async update(
    id: string,
    tenantId: string,
    data: Partial<Customer>,
    tags?: Tag[]
  ): Promise<Customer | null> {
    const customer = await this.findById(id, tenantId);
    if (!customer) return null;

    Object.assign(customer, data);
    if (tags !== undefined) {
      customer.tags = tags;
    }

    return this.repository.save(customer);
  }

  async delete(id: string, tenantId: string): Promise<boolean> {
    const result = await this.repository.delete({ id, tenantId });
    return (result.affected ?? 0) > 0;
  }

  async bulkDelete(ids: string[], tenantId: string): Promise<number> {
    const result = await this.repository
      .createQueryBuilder()
      .delete()
      .from(Customer)
      .where('id IN (:...ids)', { ids })
      .andWhere('tenant_id = :tenantId', { tenantId })
      .execute();

    return result.affected ?? 0;
  }

  async bulkUpdateTags(
    customerIds: string[],
    tags: Tag[],
    action: 'add' | 'remove' | 'replace',
    tenantId: string
  ): Promise<number> {
    if (customerIds.length === 0) return 0;

    const tagIds = tags.map((t) => t.id);

    // First, verify which customers belong to this tenant
    const validCustomers = await this.repository
      .createQueryBuilder('customer')
      .select('customer.id')
      .where('customer.id IN (:...customerIds)', { customerIds })
      .andWhere('customer.tenant_id = :tenantId', { tenantId })
      .getMany();

    if (validCustomers.length === 0) return 0;

    const validCustomerIds = validCustomers.map((c) => c.id);

    // Use raw SQL for bulk operations to avoid N+1 queries
    const queryRunner = this.repository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      if (action === 'replace') {
        // Delete all existing tags for these customers
        await queryRunner.query(
          `DELETE FROM customer_tags WHERE customer_id = ANY($1::uuid[])`,
          [validCustomerIds]
        );

        // Insert new tags if any
        if (tagIds.length > 0) {
          const insertValues = validCustomerIds.flatMap((customerId) =>
            tagIds.map((tagId) => ({ customer_id: customerId, tag_id: tagId }))
          );

          await queryRunner.query(
            `INSERT INTO customer_tags (customer_id, tag_id)
             SELECT * FROM unnest($1::uuid[], $2::uuid[])
             ON CONFLICT DO NOTHING`,
            [
              insertValues.map((v) => v.customer_id),
              insertValues.map((v) => v.tag_id),
            ]
          );
        }
      } else if (action === 'add' && tagIds.length > 0) {
        // Insert new tags (ignore conflicts for already existing associations)
        const insertValues = validCustomerIds.flatMap((customerId) =>
          tagIds.map((tagId) => ({ customer_id: customerId, tag_id: tagId }))
        );

        await queryRunner.query(
          `INSERT INTO customer_tags (customer_id, tag_id)
           SELECT * FROM unnest($1::uuid[], $2::uuid[])
           ON CONFLICT DO NOTHING`,
          [
            insertValues.map((v) => v.customer_id),
            insertValues.map((v) => v.tag_id),
          ]
        );
      } else if (action === 'remove' && tagIds.length > 0) {
        // Delete specific tags from customers
        await queryRunner.query(
          `DELETE FROM customer_tags
           WHERE customer_id = ANY($1::uuid[])
           AND tag_id = ANY($2::uuid[])`,
          [validCustomerIds, tagIds]
        );
      }

      await queryRunner.commitTransaction();
      return validCustomerIds.length;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async existsByWhatsApp(
    whatsappNumber: string,
    tenantId: string,
    excludeId?: string
  ): Promise<boolean> {
    const query = this.repository
      .createQueryBuilder('customer')
      .where('customer.whatsapp_number = :whatsappNumber', { whatsappNumber })
      .andWhere('customer.tenant_id = :tenantId', { tenantId });

    if (excludeId) {
      query.andWhere('customer.id != :excludeId', { excludeId });
    }

    const count = await query.getCount();
    return count > 0;
  }

  async count(tenantId: string): Promise<number> {
    return this.repository.count({ where: { tenantId } });
  }

  async findAllForExport(
    tenantId: string,
    options: CustomerQueryOptions = {}
  ): Promise<Customer[]> {
    const { search, tagIds, dateFrom, dateTo, sortBy = 'createdAt', sortOrder = 'desc' } = options;

    const query = this.repository
      .createQueryBuilder('customer')
      .leftJoinAndSelect('customer.tags', 'tags')
      .where('customer.tenant_id = :tenantId', { tenantId });

    if (search) {
      query.andWhere(
        '(LOWER(customer.name) LIKE LOWER(:search) OR customer.whatsapp_number LIKE :search)',
        { search: `%${search}%` }
      );
    }

    if (tagIds && tagIds.length > 0) {
      query.andWhere((qb) => {
        const subQuery = qb
          .subQuery()
          .select('ct.customer_id')
          .from('customer_tags', 'ct')
          .where('ct.tag_id IN (:...tagIds)', { tagIds })
          .getQuery();
        return `customer.id IN ${subQuery}`;
      });
    }

    if (dateFrom) {
      query.andWhere('customer.created_at >= :dateFrom', { dateFrom });
    }

    if (dateTo) {
      query.andWhere('customer.created_at <= :dateTo', { dateTo });
    }

    // Sorting - use allowlist to prevent SQL injection
    const sortColumn = getSafeSortColumn(sortBy);
    const order = (sortOrder || 'desc').toUpperCase() as 'ASC' | 'DESC';
    query.orderBy(`customer.${sortColumn}`, order);

    // Apply export limit to prevent memory exhaustion
    query.take(MAX_EXPORT_RECORDS);

    return query.getMany();
  }
}
