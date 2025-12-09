import { singleton } from 'tsyringe';
import { Repository } from 'typeorm';
import { AppDataSource } from '../../config/database.config';
import { MessageLog, MessageStatus } from './message-log.entity';

/**
 * Query options for message logs.
 */
export interface MessageLogQueryOptions {
  broadcastId?: string;
  customerId?: string;
  channelAccountId?: string;
  status?: MessageStatus | MessageStatus[];
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

/**
 * Statistics for message delivery.
 */
export interface MessageLogStats {
  total: number;
  pending: number;
  queued: number;
  sent: number;
  delivered: number;
  read: number;
  failed: number;
}

/**
 * Data for creating a new message log.
 */
export interface CreateMessageLogData {
  tenantId: string;
  broadcastId?: string | null;
  customerId?: string | null;
  channelAccountId?: string | null;
  channelId: string;
  providerId: string;
  recipient: string;
  templateData?: Record<string, unknown> | null;
}

@singleton()
export class MessageLogRepository {
  private _repository: Repository<MessageLog> | null = null;

  /**
   * Lazy initialization of the repository to ensure AppDataSource is initialized.
   */
  private get repository(): Repository<MessageLog> {
    if (!this._repository) {
      this._repository = AppDataSource.getRepository(MessageLog);
    }
    return this._repository;
  }

  /**
   * Create a new message log entry.
   */
  async create(data: CreateMessageLogData): Promise<MessageLog> {
    const log = this.repository.create({
      ...data,
      status: MessageStatus.PENDING,
    });
    return this.repository.save(log);
  }

  /**
   * Find a message log by ID.
   */
  async findById(id: string): Promise<MessageLog | null> {
    return this.repository.findOne({
      where: { id },
      relations: ['channel', 'provider'],
    });
  }

  /**
   * Find a message log by ID for a specific tenant.
   */
  async findByIdAndTenant(id: string, tenantId: string): Promise<MessageLog | null> {
    return this.repository.findOne({
      where: { id, tenantId },
      relations: ['channel', 'provider'],
    });
  }

  /**
   * Find a message log by provider message ID.
   * Used for webhook processing to update status.
   */
  async findByProviderMessageId(providerMessageId: string): Promise<MessageLog | null> {
    return this.repository.findOne({
      where: { providerMessageId },
      relations: ['channel', 'provider'],
    });
  }

  /**
   * Find message logs by tenant with optional filters.
   */
  async findByTenant(
    tenantId: string,
    options?: MessageLogQueryOptions
  ): Promise<MessageLog[]> {
    const queryBuilder = this.repository
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.channel', 'channel')
      .leftJoinAndSelect('log.provider', 'provider')
      .where('log.tenant_id = :tenantId', { tenantId });

    if (options?.broadcastId) {
      queryBuilder.andWhere('log.broadcast_id = :broadcastId', {
        broadcastId: options.broadcastId,
      });
    }

    if (options?.customerId) {
      queryBuilder.andWhere('log.customer_id = :customerId', {
        customerId: options.customerId,
      });
    }

    if (options?.channelAccountId) {
      queryBuilder.andWhere('log.channel_account_id = :channelAccountId', {
        channelAccountId: options.channelAccountId,
      });
    }

    if (options?.status) {
      if (Array.isArray(options.status)) {
        queryBuilder.andWhere('log.status IN (:...statuses)', {
          statuses: options.status,
        });
      } else {
        queryBuilder.andWhere('log.status = :status', { status: options.status });
      }
    }

    if (options?.startDate && options?.endDate) {
      queryBuilder.andWhere('log.created_at BETWEEN :startDate AND :endDate', {
        startDate: options.startDate,
        endDate: options.endDate,
      });
    } else if (options?.startDate) {
      queryBuilder.andWhere('log.created_at >= :startDate', {
        startDate: options.startDate,
      });
    } else if (options?.endDate) {
      queryBuilder.andWhere('log.created_at <= :endDate', {
        endDate: options.endDate,
      });
    }

    queryBuilder.orderBy('log.createdAt', 'DESC');

    if (options?.limit) {
      queryBuilder.take(options.limit);
    }

    if (options?.offset) {
      queryBuilder.skip(options.offset);
    }

    return queryBuilder.getMany();
  }

  /**
   * Find message logs for a specific broadcast.
   */
  async findByBroadcast(
    broadcastId: string,
    options?: Omit<MessageLogQueryOptions, 'broadcastId'>
  ): Promise<MessageLog[]> {
    const queryBuilder = this.repository
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.channel', 'channel')
      .leftJoinAndSelect('log.provider', 'provider')
      .where('log.broadcastId = :broadcastId', { broadcastId });

    if (options?.status) {
      if (Array.isArray(options.status)) {
        queryBuilder.andWhere('log.status IN (:...statuses)', {
          statuses: options.status,
        });
      } else {
        queryBuilder.andWhere('log.status = :status', { status: options.status });
      }
    }

    queryBuilder.orderBy('log.createdAt', 'DESC');

    if (options?.limit) {
      queryBuilder.take(options.limit);
    }

    if (options?.offset) {
      queryBuilder.skip(options.offset);
    }

    return queryBuilder.getMany();
  }

  /**
   * Update message log status.
   */
  async updateStatus(
    id: string,
    status: MessageStatus,
    additionalData?: {
      providerMessageId?: string;
      errorMessage?: string;
      errorCode?: string;
      providerResponse?: Record<string, unknown>;
    }
  ): Promise<void> {
    const updateData: Partial<MessageLog> = { status };

    // Set timestamp based on status
    const now = new Date();
    switch (status) {
      case MessageStatus.SENT:
        updateData.sentAt = now;
        break;
      case MessageStatus.DELIVERED:
        updateData.deliveredAt = now;
        break;
      case MessageStatus.READ:
        updateData.readAt = now;
        break;
      case MessageStatus.FAILED:
        updateData.failedAt = now;
        break;
    }

    if (additionalData?.providerMessageId) {
      updateData.providerMessageId = additionalData.providerMessageId;
    }

    if (additionalData?.errorMessage) {
      updateData.errorMessage = additionalData.errorMessage;
    }

    if (additionalData?.errorCode) {
      updateData.errorCode = additionalData.errorCode;
    }

    if (additionalData?.providerResponse) {
      updateData.providerResponse = additionalData.providerResponse;
    }

    // Use type assertion to satisfy TypeORM's strict typing for jsonb fields
    await this.repository.update(id, updateData as unknown as Record<string, unknown>);
  }

  /**
   * Update message status by provider message ID.
   * Used for webhook processing.
   */
  async updateStatusByProviderMessageId(
    providerMessageId: string,
    status: MessageStatus,
    additionalData?: {
      errorMessage?: string;
      errorCode?: string;
    }
  ): Promise<MessageLog | null> {
    const log = await this.findByProviderMessageId(providerMessageId);
    if (!log) {
      return null;
    }

    await this.updateStatus(log.id, status, additionalData);
    return this.findById(log.id);
  }

  /**
   * Increment retry count for a message log.
   */
  async incrementRetryCount(id: string): Promise<void> {
    await this.repository.increment({ id }, 'retryCount', 1);
  }

  /**
   * Mark message as using fallback provider.
   */
  async markAsFallback(id: string): Promise<void> {
    await this.repository.update(id, { usedFallback: true });
  }

  /**
   * Get statistics for a tenant's messages.
   */
  async getStatsByTenant(
    tenantId: string,
    options?: { broadcastId?: string; startDate?: Date; endDate?: Date }
  ): Promise<MessageLogStats> {
    const queryBuilder = this.repository
      .createQueryBuilder('log')
      .select('log.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('log.tenant_id = :tenantId', { tenantId })
      .groupBy('log.status');

    if (options?.broadcastId) {
      queryBuilder.andWhere('log.broadcast_id = :broadcastId', {
        broadcastId: options.broadcastId,
      });
    }

    if (options?.startDate && options?.endDate) {
      queryBuilder.andWhere('log.created_at BETWEEN :startDate AND :endDate', {
        startDate: options.startDate,
        endDate: options.endDate,
      });
    }

    const results = await queryBuilder.getRawMany();

    const stats: MessageLogStats = {
      total: 0,
      pending: 0,
      queued: 0,
      sent: 0,
      delivered: 0,
      read: 0,
      failed: 0,
    };

    for (const result of results) {
      const count = parseInt(result.count, 10);
      stats.total += count;
      stats[result.status as keyof Omit<MessageLogStats, 'total'>] = count;
    }

    return stats;
  }

  /**
   * Get statistics for a specific broadcast.
   */
  async getStatsByBroadcast(broadcastId: string): Promise<MessageLogStats> {
    const queryBuilder = this.repository
      .createQueryBuilder('log')
      .select('log.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('log.broadcast_id = :broadcastId', { broadcastId })
      .groupBy('log.status');

    const results = await queryBuilder.getRawMany();

    const stats: MessageLogStats = {
      total: 0,
      pending: 0,
      queued: 0,
      sent: 0,
      delivered: 0,
      read: 0,
      failed: 0,
    };

    for (const result of results) {
      const count = parseInt(result.count, 10);
      stats.total += count;
      stats[result.status as keyof Omit<MessageLogStats, 'total'>] = count;
    }

    return stats;
  }

  /**
   * Count message logs for a tenant.
   */
  async countByTenant(tenantId: string, options?: MessageLogQueryOptions): Promise<number> {
    const queryBuilder = this.repository
      .createQueryBuilder('log')
      .where('log.tenant_id = :tenantId', { tenantId });

    if (options?.broadcastId) {
      queryBuilder.andWhere('log.broadcast_id = :broadcastId', {
        broadcastId: options.broadcastId,
      });
    }

    if (options?.status) {
      if (Array.isArray(options.status)) {
        queryBuilder.andWhere('log.status IN (:...statuses)', {
          statuses: options.status,
        });
      } else {
        queryBuilder.andWhere('log.status = :status', { status: options.status });
      }
    }

    return queryBuilder.getCount();
  }

  /**
   * Delete old message logs (for data retention).
   */
  async deleteOldLogs(tenantId: string, olderThan: Date): Promise<number> {
    const result = await this.repository
      .createQueryBuilder()
      .delete()
      .from(MessageLog)
      .where('tenant_id = :tenantId', { tenantId })
      .andWhere('created_at < :olderThan', { olderThan })
      .execute();

    return result.affected || 0;
  }
}
