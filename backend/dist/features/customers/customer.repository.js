"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomerRepository = exports.MAX_EXPORT_RECORDS = void 0;
const typeorm_1 = require("typeorm");
const tsyringe_1 = require("tsyringe");
const database_config_1 = require("../../config/database.config");
const customer_entity_1 = require("./customer.entity");
/**
 * Allowed sort columns for customer queries.
 * Maps user-facing field names to database column names.
 * This serves as an allowlist to prevent SQL injection.
 */
const ALLOWED_SORT_COLUMNS = {
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
exports.MAX_EXPORT_RECORDS = 10000;
/**
 * Validates and maps a sort column name to its database column.
 *
 * @param sortBy - The user-provided sort column name
 * @returns The safe database column name
 */
const getSafeSortColumn = (sortBy) => {
    if (!sortBy) {
        return DEFAULT_SORT_COLUMN;
    }
    return ALLOWED_SORT_COLUMNS[sortBy] ?? DEFAULT_SORT_COLUMN;
};
let CustomerRepository = class CustomerRepository {
    _repository = null;
    /**
     * Lazy initialization of the repository to ensure AppDataSource is initialized.
     */
    get repository() {
        if (!this._repository) {
            this._repository = database_config_1.AppDataSource.getRepository(customer_entity_1.Customer);
        }
        return this._repository;
    }
    async findById(id, tenantId) {
        return this.repository.findOne({
            where: { id, tenantId },
            relations: ['tags'],
        });
    }
    /**
     * Find multiple customers by their IDs with tenant isolation.
     * This is the batch alternative to individual findById calls.
     * Prevents N+1 queries when resolving multiple customers.
     *
     * @param ids - Array of customer IDs to find
     * @param tenantId - The tenant ID for isolation
     * @returns Array of found customers (may be less than requested if some don't exist)
     */
    async findByIds(ids, tenantId) {
        if (ids.length === 0) {
            return [];
        }
        return this.repository.find({
            where: {
                id: (0, typeorm_1.In)(ids),
                tenantId,
            },
            relations: ['tags'],
        });
    }
    async findByWhatsApp(whatsappNumber, tenantId) {
        return this.repository.findOne({
            where: { whatsappNumber, tenantId },
            relations: ['tags'],
        });
    }
    /**
     * Find all customers for a tenant with pagination and filtering.
     *
     * Note: Uses separate queries for data and count to avoid TypeORM's
     * getManyAndCount() bug with nullable leftJoinAndSelect relations
     * that causes "Cannot read properties of undefined (reading 'databaseName')" error.
     */
    async findAll(tenantId, options = {}) {
        const { search, tagIds, dateFrom, dateTo, page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc', } = options;
        // Build base query conditions (without joins for counting)
        const baseQueryBuilder = () => {
            const qb = this.repository
                .createQueryBuilder('customer')
                .where('customer.tenant_id = :tenantId', { tenantId });
            // Search by name or whatsapp number
            if (search) {
                qb.andWhere('(LOWER(customer.name) LIKE LOWER(:search) OR customer.whatsapp_number LIKE :search)', { search: `%${search}%` });
            }
            // Filter by tags (OR logic - matches customers with any of the tags)
            if (tagIds && tagIds.length > 0) {
                qb.andWhere((subQb) => {
                    const subQuery = subQb
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
                qb.andWhere('customer.created_at >= :dateFrom', { dateFrom });
            }
            if (dateTo) {
                qb.andWhere('customer.created_at <= :dateTo', { dateTo });
            }
            return qb;
        };
        // Get total count first (without joins or ordering)
        const total = await baseQueryBuilder().getCount();
        if (total === 0) {
            return {
                data: [],
                total: 0,
                page,
                limit,
                totalPages: 0,
            };
        }
        // Sorting - use allowlist to prevent SQL injection
        const sortColumn = getSafeSortColumn(sortBy);
        const order = (sortOrder || 'desc').toUpperCase();
        // Pagination - fetch IDs first to avoid TypeORM bug with skip/take on nullable joins
        const skipCount = (page - 1) * limit;
        const idsQuery = baseQueryBuilder()
            .select('customer.id')
            .orderBy(`customer.${sortColumn}`, order)
            .offset(skipCount)
            .limit(limit);
        const idResults = await idsQuery.getRawMany();
        const ids = idResults.map((r) => r.customer_id);
        if (ids.length === 0) {
            return {
                data: [],
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            };
        }
        // Fetch full entities by IDs (no pagination needed, just the specific IDs)
        const data = await this.repository
            .createQueryBuilder('customer')
            .leftJoinAndSelect('customer.tags', 'tags')
            .where('customer.id IN (:...ids)', { ids })
            .orderBy(`customer.${sortColumn}`, order)
            .getMany();
        return {
            data,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }
    async create(data, tags) {
        const customer = this.repository.create(data);
        if (tags) {
            customer.tags = tags;
        }
        return this.repository.save(customer);
    }
    async update(id, tenantId, data, tags) {
        const customer = await this.findById(id, tenantId);
        if (!customer)
            return null;
        Object.assign(customer, data);
        if (tags !== undefined) {
            customer.tags = tags;
        }
        return this.repository.save(customer);
    }
    async delete(id, tenantId) {
        const result = await this.repository.delete({ id, tenantId });
        return (result.affected ?? 0) > 0;
    }
    async bulkDelete(ids, tenantId) {
        const result = await this.repository
            .createQueryBuilder()
            .delete()
            .from(customer_entity_1.Customer)
            .where('id IN (:...ids)', { ids })
            .andWhere('tenant_id = :tenantId', { tenantId })
            .execute();
        return result.affected ?? 0;
    }
    async bulkUpdateTags(customerIds, tags, action, tenantId) {
        if (customerIds.length === 0)
            return 0;
        const tagIds = tags.map((t) => t.id);
        // First, verify which customers belong to this tenant
        const validCustomers = await this.repository
            .createQueryBuilder('customer')
            .select('customer.id')
            .where('customer.id IN (:...customerIds)', { customerIds })
            .andWhere('customer.tenant_id = :tenantId', { tenantId })
            .getMany();
        if (validCustomers.length === 0)
            return 0;
        const validCustomerIds = validCustomers.map((c) => c.id);
        // Use raw SQL for bulk operations to avoid N+1 queries
        const queryRunner = this.repository.manager.connection.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
            if (action === 'replace') {
                // Delete all existing tags for these customers
                await queryRunner.query(`DELETE FROM customer_tags WHERE customer_id = ANY($1::uuid[])`, [validCustomerIds]);
                // Insert new tags if any
                if (tagIds.length > 0) {
                    const insertValues = validCustomerIds.flatMap((customerId) => tagIds.map((tagId) => ({ customer_id: customerId, tag_id: tagId })));
                    await queryRunner.query(`INSERT INTO customer_tags (customer_id, tag_id)
             SELECT * FROM unnest($1::uuid[], $2::uuid[])
             ON CONFLICT DO NOTHING`, [
                        insertValues.map((v) => v.customer_id),
                        insertValues.map((v) => v.tag_id),
                    ]);
                }
            }
            else if (action === 'add' && tagIds.length > 0) {
                // Insert new tags (ignore conflicts for already existing associations)
                const insertValues = validCustomerIds.flatMap((customerId) => tagIds.map((tagId) => ({ customer_id: customerId, tag_id: tagId })));
                await queryRunner.query(`INSERT INTO customer_tags (customer_id, tag_id)
           SELECT * FROM unnest($1::uuid[], $2::uuid[])
           ON CONFLICT DO NOTHING`, [
                    insertValues.map((v) => v.customer_id),
                    insertValues.map((v) => v.tag_id),
                ]);
            }
            else if (action === 'remove' && tagIds.length > 0) {
                // Delete specific tags from customers
                await queryRunner.query(`DELETE FROM customer_tags
           WHERE customer_id = ANY($1::uuid[])
           AND tag_id = ANY($2::uuid[])`, [validCustomerIds, tagIds]);
            }
            await queryRunner.commitTransaction();
            return validCustomerIds.length;
        }
        catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        }
        finally {
            await queryRunner.release();
        }
    }
    async existsByWhatsApp(whatsappNumber, tenantId, excludeId) {
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
    async count(tenantId) {
        return this.repository.count({ where: { tenantId } });
    }
    /**
     * Find all customers for export with filtering.
     *
     * Note: Uses two-phase query to avoid TypeORM's bug with nullable
     * leftJoinAndSelect relations combined with limit/take.
     */
    async findAllForExport(tenantId, options = {}) {
        const { search, tagIds, dateFrom, dateTo, sortBy = 'createdAt', sortOrder = 'desc' } = options;
        // Build base query conditions (without joins)
        const baseQueryBuilder = () => {
            const qb = this.repository
                .createQueryBuilder('customer')
                .where('customer.tenant_id = :tenantId', { tenantId });
            if (search) {
                qb.andWhere('(LOWER(customer.name) LIKE LOWER(:search) OR customer.whatsapp_number LIKE :search)', { search: `%${search}%` });
            }
            if (tagIds && tagIds.length > 0) {
                qb.andWhere((subQb) => {
                    const subQuery = subQb
                        .subQuery()
                        .select('ct.customer_id')
                        .from('customer_tags', 'ct')
                        .where('ct.tag_id IN (:...tagIds)', { tagIds })
                        .getQuery();
                    return `customer.id IN ${subQuery}`;
                });
            }
            if (dateFrom) {
                qb.andWhere('customer.created_at >= :dateFrom', { dateFrom });
            }
            if (dateTo) {
                qb.andWhere('customer.created_at <= :dateTo', { dateTo });
            }
            return qb;
        };
        // Sorting - use allowlist to prevent SQL injection
        const sortColumn = getSafeSortColumn(sortBy);
        const order = (sortOrder || 'desc').toUpperCase();
        // Phase 1: Fetch IDs with limit to avoid TypeORM bug
        const idsQuery = baseQueryBuilder()
            .select('customer.id')
            .orderBy(`customer.${sortColumn}`, order)
            .limit(exports.MAX_EXPORT_RECORDS);
        const idResults = await idsQuery.getRawMany();
        const ids = idResults.map((r) => r.customer_id);
        if (ids.length === 0) {
            return [];
        }
        // Phase 2: Fetch full entities by IDs (with joins, no limit needed)
        return this.repository
            .createQueryBuilder('customer')
            .leftJoinAndSelect('customer.tags', 'tags')
            .where('customer.id IN (:...ids)', { ids })
            .orderBy(`customer.${sortColumn}`, order)
            .getMany();
    }
};
exports.CustomerRepository = CustomerRepository;
exports.CustomerRepository = CustomerRepository = __decorate([
    (0, tsyringe_1.singleton)()
], CustomerRepository);
