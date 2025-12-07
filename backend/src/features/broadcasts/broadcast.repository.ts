import { Repository, In, LessThanOrEqual } from 'typeorm';
import { singleton } from 'tsyringe';
import { AppDataSource } from '@config/database.config';
import { Broadcast } from './broadcast.entity';
import { BroadcastStatus } from './enums';
import { TemplateCategory } from '../templates/enums';
import { ConflictException } from '../../shared/exceptions/http-exceptions';

/**
 * Query options for listing broadcasts with filtering, pagination, and sorting.
 */
export interface BroadcastQueryOptions {
  search?: string;
  statuses?: BroadcastStatus[];
  templateCategories?: TemplateCategory[];
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc' | 'ASC' | 'DESC';
  createdBy?: string; // For filtering by owner (own scope)
}

/**
 * Generic paginated result interface.
 */
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Metrics update data for broadcast statistics.
 */
export interface BroadcastMetrics {
  sentCount?: number;
  deliveredCount?: number;
  readCount?: number;
  failedCount?: number;
}

/**
 * Allowed sort columns for broadcast queries.
 * Maps user-facing field names to database column names.
 * This serves as an allowlist to prevent SQL injection.
 */
const ALLOWED_SORT_COLUMNS: Record<string, string> = {
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
const getSafeSortColumn = (sortBy: string | undefined): string => {
  if (!sortBy) {
    return DEFAULT_SORT_COLUMN;
  }
  return ALLOWED_SORT_COLUMNS[sortBy] ?? DEFAULT_SORT_COLUMN;
};

/**
 * Repository for broadcast database operations.
 * All queries enforce tenant isolation via tenantId parameter.
 */
@singleton()
export class BroadcastRepository {
  private _repository: Repository<Broadcast> | null = null;

  /**
   * Lazy initialization of the repository to ensure AppDataSource is initialized.
   */
  private get repository(): Repository<Broadcast> {
    if (!this._repository) {
      this._repository = AppDataSource.getRepository(Broadcast);
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
  async findAll(
    tenantId: string,
    options: BroadcastQueryOptions = {}
  ): Promise<PaginatedResult<Broadcast>> {
    const {
      search,
      statuses,
      templateCategories,
      dateFrom,
      dateTo,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      createdBy,
    } = options;

    const query = this.repository
      .createQueryBuilder('broadcast')
      .where('broadcast.tenant_id = :tenantId', { tenantId });

    // Search by name or description
    if (search) {
      query.andWhere(
        '(LOWER(broadcast.name) LIKE LOWER(:search) OR LOWER(broadcast.description) LIKE LOWER(:search))',
        { search: `%${search}%` }
      );
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
    const order = (sortOrder || 'desc').toUpperCase() as 'ASC' | 'DESC';
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
  async findById(tenantId: string, id: string): Promise<Broadcast | null> {
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
  async findByIds(tenantId: string, ids: string[]): Promise<Broadcast[]> {
    if (ids.length === 0) return [];

    return this.repository.find({
      where: {
        id: In(ids),
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
  async create(data: Partial<Broadcast>): Promise<Broadcast> {
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
  async update(
    id: string,
    tenantId: string,
    data: Partial<Broadcast>
  ): Promise<Broadcast | null> {
    const broadcast = await this.findById(tenantId, id);
    if (!broadcast) return null;

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
  async delete(id: string, tenantId: string): Promise<boolean> {
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
  async bulkDelete(ids: string[], tenantId: string): Promise<number> {
    if (ids.length === 0) return 0;

    const result = await this.repository
      .createQueryBuilder()
      .delete()
      .from(Broadcast)
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
  async bulkUpdateStatus(
    ids: string[],
    tenantId: string,
    status: BroadcastStatus
  ): Promise<number> {
    if (ids.length === 0) return 0;

    const result = await this.repository
      .createQueryBuilder()
      .update(Broadcast)
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
  async findScheduledBroadcasts(beforeTime: Date): Promise<Broadcast[]> {
    return this.repository.find({
      where: {
        status: BroadcastStatus.SCHEDULED,
        scheduledAt: LessThanOrEqual(beforeTime),
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
  async updateMetrics(id: string, metrics: BroadcastMetrics): Promise<boolean> {
    const updateData: Partial<Broadcast> = {};

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
  async incrementMetric(
    id: string,
    metric: 'sentCount' | 'deliveredCount' | 'readCount' | 'failedCount',
    delta: number = 1
  ): Promise<void> {
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
  async existsByName(
    name: string,
    tenantId: string,
    excludeId?: string
  ): Promise<boolean> {
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
  async markCompleted(id: string, tenantId: string): Promise<boolean> {
    const result = await this.repository.update(
      { id, tenantId },
      {
        status: BroadcastStatus.COMPLETED,
        completedAt: new Date(),
      }
    );
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
  async markCompletedAtomic(
    id: string,
    tenantId: string
  ): Promise<{ success: boolean; wasUpdated: boolean }> {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Acquire pessimistic lock to prevent race condition
      const broadcast = await queryRunner.manager
        .createQueryBuilder(Broadcast, 'broadcast')
        .setLock('pessimistic_write')
        .where('broadcast.id = :id', { id })
        .andWhere('broadcast.tenant_id = :tenantId', { tenantId })
        .getOne();

      if (!broadcast) {
        await queryRunner.rollbackTransaction();
        return { success: false, wasUpdated: false };
      }

      // Check if already completed or not in a state that can be completed
      if (broadcast.status === BroadcastStatus.COMPLETED) {
        await queryRunner.rollbackTransaction();
        return { success: true, wasUpdated: false };
      }

      if (broadcast.status !== BroadcastStatus.SENDING) {
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
      await queryRunner.manager.update(Broadcast, { id }, {
        status: BroadcastStatus.COMPLETED,
        completedAt: new Date(),
      });

      await queryRunner.commitTransaction();
      return { success: true, wasUpdated: true };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
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
  async updateStatusWithLock(
    id: string,
    tenantId: string,
    expectedStatuses: BroadcastStatus[],
    newStatus: BroadcastStatus,
    additionalData?: Partial<Broadcast>
  ): Promise<Broadcast> {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Acquire pessimistic lock on the broadcast row
      const broadcast = await queryRunner.manager
        .createQueryBuilder(Broadcast, 'broadcast')
        .setLock('pessimistic_write')
        .where('broadcast.id = :id', { id })
        .andWhere('broadcast.tenant_id = :tenantId', { tenantId })
        .getOne();

      if (!broadcast) {
        throw new ConflictException('Broadcast not found');
      }

      if (!expectedStatuses.includes(broadcast.status)) {
        throw new ConflictException(
          `Cannot transition broadcast from "${broadcast.status}" to "${newStatus}". ` +
          `Expected status: ${expectedStatuses.join(' or ')}.`
        );
      }

      // Apply updates directly to the entity
      broadcast.status = newStatus;
      if (additionalData) {
        Object.assign(broadcast, additionalData);
      }

      const updated = await queryRunner.manager.save(Broadcast, broadcast);
      await queryRunner.commitTransaction();

      return updated;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
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
  async bulkPauseWithTransaction(
    ids: string[],
    tenantId: string,
    pausableStatuses: BroadcastStatus[]
  ): Promise<{ paused: number; results: Array<{ id: string; previousStatus: BroadcastStatus }> }> {
    if (ids.length === 0) {
      return { paused: 0, results: [] };
    }

    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Lock all broadcasts at once to prevent race conditions
      const broadcasts = await queryRunner.manager
        .createQueryBuilder(Broadcast, 'broadcast')
        .setLock('pessimistic_write')
        .where('broadcast.id IN (:...ids)', { ids })
        .andWhere('broadcast.tenant_id = :tenantId', { tenantId })
        .getMany();

      const results: Array<{ id: string; previousStatus: BroadcastStatus }> = [];

      for (const broadcast of broadcasts) {
        if (pausableStatuses.includes(broadcast.status)) {
          await queryRunner.manager.update(Broadcast, { id: broadcast.id }, {
            status: BroadcastStatus.PAUSED,
            previousStatus: broadcast.status,
          });
          results.push({ id: broadcast.id, previousStatus: broadcast.status });
        }
      }

      await queryRunner.commitTransaction();
      return { paused: results.length, results };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
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
  async bulkCancelWithTransaction(
    ids: string[],
    tenantId: string,
    cancellableStatuses: BroadcastStatus[]
  ): Promise<number> {
    if (ids.length === 0) {
      return 0;
    }

    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const broadcasts = await queryRunner.manager
        .createQueryBuilder(Broadcast, 'broadcast')
        .setLock('pessimistic_write')
        .where('broadcast.id IN (:...ids)', { ids })
        .andWhere('broadcast.tenant_id = :tenantId', { tenantId })
        .getMany();

      let cancelled = 0;

      for (const broadcast of broadcasts) {
        if (cancellableStatuses.includes(broadcast.status)) {
          await queryRunner.manager.update(Broadcast, { id: broadcast.id }, {
            status: BroadcastStatus.CANCELLED,
            previousStatus: null,
          });
          cancelled++;
        }
      }

      await queryRunner.commitTransaction();
      return cancelled;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
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
  async bulkDeleteWithTransaction(
    ids: string[],
    tenantId: string,
    deletableStatuses: BroadcastStatus[]
  ): Promise<number> {
    if (ids.length === 0) {
      return 0;
    }

    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const broadcasts = await queryRunner.manager
        .createQueryBuilder(Broadcast, 'broadcast')
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
          .from(Broadcast)
          .where('id IN (:...ids)', { ids: deletableIds })
          .execute();
      }

      await queryRunner.commitTransaction();
      return deletableIds.length;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
