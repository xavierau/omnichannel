"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BroadcastRepository = void 0;
const typeorm_1 = require("typeorm");
const tsyringe_1 = require("tsyringe");
const database_config_1 = require("@config/database.config");
const broadcast_entity_1 = require("./broadcast.entity");
const enums_1 = require("./enums");
const http_exceptions_1 = require("../../shared/exceptions/http-exceptions");
/**
 * Allowed sort columns for broadcast queries.
 * Maps user-facing field names to database column names.
 * This serves as an allowlist to prevent SQL injection.
 */
const ALLOWED_SORT_COLUMNS = {
    name: 'name',
    createdAt: 'created_at',
    scheduledAt: 'scheduled_at',
    status: 'status',
    updatedAt: 'updated_at',
};
/**
 * Default sort column if none specified or if invalid column provided.
 */
const DEFAULT_SORT_COLUMN = 'created_at';
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
/**
 * Repository for broadcast database operations.
 * All queries enforce tenant isolation via tenantId parameter.
 */
let BroadcastRepository = class BroadcastRepository {
    _repository = null;
    /**
     * Lazy initialization of the repository to ensure AppDataSource is initialized.
     */
    get repository() {
        if (!this._repository) {
            this._repository = database_config_1.AppDataSource.getRepository(broadcast_entity_1.Broadcast);
        }
        return this._repository;
    }
    /**
     * Find all broadcasts for a tenant with optional filtering, pagination, and sorting.
     *
     * @param tenantId - The tenant ID for isolation
     * @param options - Query options for filtering, pagination, and sorting
     * @returns Paginated result of broadcasts
     */
    async findAll(tenantId, options = {}) {
        const { search, statuses, templateCategories, dateFrom, dateTo, page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc', createdBy, } = options;
        const query = this.repository
            .createQueryBuilder('broadcast')
            .where('broadcast.tenant_id = :tenantId', { tenantId });
        // Search by name or description
        if (search) {
            query.andWhere('(LOWER(broadcast.name) LIKE LOWER(:search) OR LOWER(broadcast.description) LIKE LOWER(:search))', { search: `%${search}%` });
        }
        // Filter by statuses
        if (statuses && statuses.length > 0) {
            query.andWhere('broadcast.status IN (:...statuses)', { statuses });
        }
        // Filter by template categories
        if (templateCategories && templateCategories.length > 0) {
            query.andWhere('broadcast.template_category IN (:...templateCategories)', {
                templateCategories,
            });
        }
        // Filter by date range (based on createdAt)
        if (dateFrom) {
            query.andWhere('broadcast.created_at >= :dateFrom', { dateFrom });
        }
        if (dateTo) {
            query.andWhere('broadcast.created_at <= :dateTo', { dateTo });
        }
        // Filter by creator (for own scope permission)
        if (createdBy) {
            query.andWhere('broadcast.created_by = :createdBy', { createdBy });
        }
        // Sorting - use allowlist to prevent SQL injection
        const sortColumn = getSafeSortColumn(sortBy);
        const order = (sortOrder || 'desc').toUpperCase();
        query.orderBy(`broadcast.${sortColumn}`, order);
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
    /**
     * Find a single broadcast by ID with tenant isolation.
     *
     * @param tenantId - The tenant ID for isolation
     * @param id - The broadcast ID
     * @returns The broadcast or null if not found
     */
    async findById(tenantId, id) {
        return this.repository.findOne({
            where: { id, tenantId },
        });
    }
    /**
     * Find multiple broadcasts by IDs with tenant isolation.
     *
     * @param tenantId - The tenant ID for isolation
     * @param ids - Array of broadcast IDs
     * @returns Array of broadcasts found
     */
    async findByIds(tenantId, ids) {
        if (ids.length === 0)
            return [];
        return this.repository.find({
            where: {
                id: (0, typeorm_1.In)(ids),
                tenantId,
            },
        });
    }
    /**
     * Create a new broadcast.
     *
     * @param data - Partial broadcast data
     * @returns The created broadcast
     */
    async create(data) {
        const broadcast = this.repository.create(data);
        return this.repository.save(broadcast);
    }
    /**
     * Update an existing broadcast with tenant isolation.
     *
     * @param id - The broadcast ID
     * @param tenantId - The tenant ID for isolation
     * @param data - Partial broadcast data to update
     * @returns The updated broadcast or null if not found
     */
    async update(id, tenantId, data) {
        const broadcast = await this.findById(tenantId, id);
        if (!broadcast)
            return null;
        Object.assign(broadcast, data);
        return this.repository.save(broadcast);
    }
    /**
     * Delete a broadcast with tenant isolation.
     *
     * @param id - The broadcast ID
     * @param tenantId - The tenant ID for isolation
     * @returns True if deleted, false if not found
     */
    async delete(id, tenantId) {
        const result = await this.repository.delete({ id, tenantId });
        return (result.affected ?? 0) > 0;
    }
    /**
     * Bulk delete broadcasts with tenant isolation.
     *
     * @param ids - Array of broadcast IDs to delete
     * @param tenantId - The tenant ID for isolation
     * @returns Number of broadcasts deleted
     */
    async bulkDelete(ids, tenantId) {
        if (ids.length === 0)
            return 0;
        const result = await this.repository
            .createQueryBuilder()
            .delete()
            .from(broadcast_entity_1.Broadcast)
            .where('id IN (:...ids)', { ids })
            .andWhere('tenant_id = :tenantId', { tenantId })
            .execute();
        return result.affected ?? 0;
    }
    /**
     * Bulk update status for broadcasts with tenant isolation.
     *
     * @param ids - Array of broadcast IDs
     * @param tenantId - The tenant ID for isolation
     * @param status - New status to set
     * @returns Number of broadcasts updated
     */
    async bulkUpdateStatus(ids, tenantId, status) {
        if (ids.length === 0)
            return 0;
        const result = await this.repository
            .createQueryBuilder()
            .update(broadcast_entity_1.Broadcast)
            .set({ status })
            .where('id IN (:...ids)', { ids })
            .andWhere('tenant_id = :tenantId', { tenantId })
            .execute();
        return result.affected ?? 0;
    }
    /**
     * Find scheduled broadcasts that are ready to be sent.
     * Used by the job queue to process broadcasts.
     *
     * @param beforeTime - Find broadcasts scheduled before this time
     * @returns Array of broadcasts ready to send
     */
    async findScheduledBroadcasts(beforeTime) {
        return this.repository.find({
            where: {
                status: enums_1.BroadcastStatus.SCHEDULED,
                scheduledAt: (0, typeorm_1.LessThanOrEqual)(beforeTime),
            },
            order: {
                scheduledAt: 'ASC',
            },
        });
    }
    /**
     * Update broadcast metrics (sent, delivered, read, failed counts).
     *
     * @param id - The broadcast ID
     * @param metrics - Metrics to update
     * @returns True if updated, false if not found
     */
    async updateMetrics(id, metrics) {
        const updateData = {};
        if (metrics.sentCount !== undefined) {
            updateData.sentCount = metrics.sentCount;
        }
        if (metrics.deliveredCount !== undefined) {
            updateData.deliveredCount = metrics.deliveredCount;
        }
        if (metrics.readCount !== undefined) {
            updateData.readCount = metrics.readCount;
        }
        if (metrics.failedCount !== undefined) {
            updateData.failedCount = metrics.failedCount;
        }
        if (Object.keys(updateData).length === 0) {
            return false;
        }
        const result = await this.repository.update({ id }, {
            ...(metrics.sentCount !== undefined && { sentCount: metrics.sentCount }),
            ...(metrics.deliveredCount !== undefined && { deliveredCount: metrics.deliveredCount }),
            ...(metrics.readCount !== undefined && { readCount: metrics.readCount }),
            ...(metrics.failedCount !== undefined && { failedCount: metrics.failedCount }),
        });
        return (result.affected ?? 0) > 0;
    }
    /**
     * Increment a specific metric by a delta value.
     * Useful for updating counts during broadcast processing.
     *
     * @param id - The broadcast ID
     * @param metric - The metric to increment
     * @param delta - The amount to increment by (default 1)
     */
    async incrementMetric(id, metric, delta = 1) {
        await this.repository.increment({ id }, metric, delta);
    }
    /**
     * Check if a broadcast exists with the given name for the tenant.
     *
     * @param name - The broadcast name to check
     * @param tenantId - The tenant ID for isolation
     * @param excludeId - Optional ID to exclude from the check (for updates)
     * @returns True if a broadcast with the name exists
     */
    async existsByName(name, tenantId, excludeId) {
        const query = this.repository
            .createQueryBuilder('broadcast')
            .where('LOWER(broadcast.name) = LOWER(:name)', { name })
            .andWhere('broadcast.tenant_id = :tenantId', { tenantId });
        if (excludeId) {
            query.andWhere('broadcast.id != :excludeId', { excludeId });
        }
        const count = await query.getCount();
        return count > 0;
    }
    /**
     * Mark a broadcast as completed and set completion timestamp.
     *
     * @param id - The broadcast ID
     * @param tenantId - The tenant ID for isolation
     * @returns True if updated, false if not found
     */
    async markCompleted(id, tenantId) {
        const result = await this.repository.update({ id, tenantId }, {
            status: enums_1.BroadcastStatus.COMPLETED,
            completedAt: new Date(),
        });
        return (result.affected ?? 0) > 0;
    }
    /**
     * Atomically mark a broadcast as completed if all recipients have been processed.
     * Uses database-level atomic operation to prevent race conditions from concurrent
     * worker processes trying to mark the same broadcast as completed.
     *
     * This method checks that:
     * 1. The broadcast exists and belongs to the tenant
     * 2. The broadcast is currently in SENDING status
     * 3. The total processed count (sentCount + failedCount) >= totalRecipients
     * 4. The broadcast has not already been marked as completed
     *
     * @param id - The broadcast ID
     * @param tenantId - The tenant ID for isolation
     * @returns Object with success flag and whether the broadcast was updated
     */
    async markCompletedAtomic(id, tenantId) {
        const queryRunner = database_config_1.AppDataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
            // Acquire pessimistic lock to prevent race condition
            const broadcast = await queryRunner.manager
                .createQueryBuilder(broadcast_entity_1.Broadcast, 'broadcast')
                .setLock('pessimistic_write')
                .where('broadcast.id = :id', { id })
                .andWhere('broadcast.tenant_id = :tenantId', { tenantId })
                .getOne();
            if (!broadcast) {
                await queryRunner.rollbackTransaction();
                return { success: false, wasUpdated: false };
            }
            // Check if already completed or not in a state that can be completed
            if (broadcast.status === enums_1.BroadcastStatus.COMPLETED) {
                await queryRunner.rollbackTransaction();
                return { success: true, wasUpdated: false };
            }
            if (broadcast.status !== enums_1.BroadcastStatus.SENDING) {
                await queryRunner.rollbackTransaction();
                return { success: false, wasUpdated: false };
            }
            // Check if all recipients have been processed
            const totalProcessed = (broadcast.sentCount || 0) + (broadcast.failedCount || 0);
            if (totalProcessed < broadcast.totalRecipients) {
                await queryRunner.rollbackTransaction();
                return { success: true, wasUpdated: false };
            }
            // Mark as completed
            await queryRunner.manager.update(broadcast_entity_1.Broadcast, { id }, {
                status: enums_1.BroadcastStatus.COMPLETED,
                completedAt: new Date(),
            });
            await queryRunner.commitTransaction();
            return { success: true, wasUpdated: true };
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
     * Atomically updates broadcast status with pessimistic locking.
     * Prevents race conditions in concurrent status transitions.
     *
     * @param id - The broadcast ID
     * @param tenantId - The tenant ID for isolation
     * @param expectedStatuses - Array of valid current statuses for this transition
     * @param newStatus - The target status
     * @param additionalData - Optional additional fields to update
     * @returns The updated broadcast
     * @throws ConflictException if broadcast not found or status transition invalid
     */
    async updateStatusWithLock(id, tenantId, expectedStatuses, newStatus, additionalData) {
        const queryRunner = database_config_1.AppDataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
            // Acquire pessimistic lock on the broadcast row
            const broadcast = await queryRunner.manager
                .createQueryBuilder(broadcast_entity_1.Broadcast, 'broadcast')
                .setLock('pessimistic_write')
                .where('broadcast.id = :id', { id })
                .andWhere('broadcast.tenant_id = :tenantId', { tenantId })
                .getOne();
            if (!broadcast) {
                throw new http_exceptions_1.ConflictException('Broadcast not found');
            }
            if (!expectedStatuses.includes(broadcast.status)) {
                throw new http_exceptions_1.ConflictException(`Cannot transition broadcast from "${broadcast.status}" to "${newStatus}". ` +
                    `Expected status: ${expectedStatuses.join(' or ')}.`);
            }
            // Apply updates directly to the entity
            broadcast.status = newStatus;
            if (additionalData) {
                Object.assign(broadcast, additionalData);
            }
            const updated = await queryRunner.manager.save(broadcast_entity_1.Broadcast, broadcast);
            await queryRunner.commitTransaction();
            return updated;
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
     * Bulk pause broadcasts with transaction and pessimistic locking.
     * Ensures atomic operation across all broadcasts.
     *
     * @param ids - Array of broadcast IDs
     * @param tenantId - The tenant ID for isolation
     * @param pausableStatuses - Array of valid statuses that can be paused
     * @returns Object with paused count and details of each broadcast
     */
    async bulkPauseWithTransaction(ids, tenantId, pausableStatuses) {
        if (ids.length === 0) {
            return { paused: 0, results: [] };
        }
        const queryRunner = database_config_1.AppDataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
            // Lock all broadcasts at once to prevent race conditions
            const broadcasts = await queryRunner.manager
                .createQueryBuilder(broadcast_entity_1.Broadcast, 'broadcast')
                .setLock('pessimistic_write')
                .where('broadcast.id IN (:...ids)', { ids })
                .andWhere('broadcast.tenant_id = :tenantId', { tenantId })
                .getMany();
            const results = [];
            for (const broadcast of broadcasts) {
                if (pausableStatuses.includes(broadcast.status)) {
                    await queryRunner.manager.update(broadcast_entity_1.Broadcast, { id: broadcast.id }, {
                        status: enums_1.BroadcastStatus.PAUSED,
                        previousStatus: broadcast.status,
                    });
                    results.push({ id: broadcast.id, previousStatus: broadcast.status });
                }
            }
            await queryRunner.commitTransaction();
            return { paused: results.length, results };
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
     * Bulk cancel broadcasts with transaction and pessimistic locking.
     *
     * @param ids - Array of broadcast IDs
     * @param tenantId - The tenant ID for isolation
     * @param cancellableStatuses - Array of valid statuses that can be cancelled
     * @returns Number of broadcasts cancelled
     */
    async bulkCancelWithTransaction(ids, tenantId, cancellableStatuses) {
        if (ids.length === 0) {
            return 0;
        }
        const queryRunner = database_config_1.AppDataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
            const broadcasts = await queryRunner.manager
                .createQueryBuilder(broadcast_entity_1.Broadcast, 'broadcast')
                .setLock('pessimistic_write')
                .where('broadcast.id IN (:...ids)', { ids })
                .andWhere('broadcast.tenant_id = :tenantId', { tenantId })
                .getMany();
            let cancelled = 0;
            for (const broadcast of broadcasts) {
                if (cancellableStatuses.includes(broadcast.status)) {
                    await queryRunner.manager.update(broadcast_entity_1.Broadcast, { id: broadcast.id }, {
                        status: enums_1.BroadcastStatus.CANCELLED,
                        previousStatus: null,
                    });
                    cancelled++;
                }
            }
            await queryRunner.commitTransaction();
            return cancelled;
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
     * Bulk delete broadcasts with transaction.
     *
     * @param ids - Array of broadcast IDs
     * @param tenantId - The tenant ID for isolation
     * @param deletableStatuses - Array of valid statuses that can be deleted
     * @returns Number of broadcasts deleted
     */
    async bulkDeleteWithTransaction(ids, tenantId, deletableStatuses) {
        if (ids.length === 0) {
            return 0;
        }
        const queryRunner = database_config_1.AppDataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
            const broadcasts = await queryRunner.manager
                .createQueryBuilder(broadcast_entity_1.Broadcast, 'broadcast')
                .setLock('pessimistic_write')
                .where('broadcast.id IN (:...ids)', { ids })
                .andWhere('broadcast.tenant_id = :tenantId', { tenantId })
                .getMany();
            const deletableIds = broadcasts
                .filter(b => deletableStatuses.includes(b.status))
                .map(b => b.id);
            if (deletableIds.length > 0) {
                await queryRunner.manager
                    .createQueryBuilder()
                    .delete()
                    .from(broadcast_entity_1.Broadcast)
                    .where('id IN (:...ids)', { ids: deletableIds })
                    .execute();
            }
            await queryRunner.commitTransaction();
            return deletableIds.length;
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
exports.BroadcastRepository = BroadcastRepository;
exports.BroadcastRepository = BroadcastRepository = __decorate([
    (0, tsyringe_1.singleton)()
], BroadcastRepository);
