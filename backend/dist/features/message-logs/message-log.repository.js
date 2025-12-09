"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageLogRepository = void 0;
const tsyringe_1 = require("tsyringe");
const database_config_1 = require("../../config/database.config");
const message_log_entity_1 = require("./message-log.entity");
let MessageLogRepository = class MessageLogRepository {
    _repository = null;
    /**
     * Lazy initialization of the repository to ensure AppDataSource is initialized.
     */
    get repository() {
        if (!this._repository) {
            this._repository = database_config_1.AppDataSource.getRepository(message_log_entity_1.MessageLog);
        }
        return this._repository;
    }
    /**
     * Create a new message log entry.
     */
    async create(data) {
        const log = this.repository.create({
            ...data,
            status: message_log_entity_1.MessageStatus.PENDING,
        });
        return this.repository.save(log);
    }
    /**
     * Find a message log by ID.
     */
    async findById(id) {
        return this.repository.findOne({
            where: { id },
            relations: ['channel', 'provider'],
        });
    }
    /**
     * Find a message log by ID for a specific tenant.
     */
    async findByIdAndTenant(id, tenantId) {
        return this.repository.findOne({
            where: { id, tenantId },
            relations: ['channel', 'provider'],
        });
    }
    /**
     * Find a message log by provider message ID.
     * Used for webhook processing to update status.
     */
    async findByProviderMessageId(providerMessageId) {
        return this.repository.findOne({
            where: { providerMessageId },
            relations: ['channel', 'provider'],
        });
    }
    /**
     * Find message logs by tenant with optional filters.
     */
    async findByTenant(tenantId, options) {
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
            }
            else {
                queryBuilder.andWhere('log.status = :status', { status: options.status });
            }
        }
        if (options?.startDate && options?.endDate) {
            queryBuilder.andWhere('log.created_at BETWEEN :startDate AND :endDate', {
                startDate: options.startDate,
                endDate: options.endDate,
            });
        }
        else if (options?.startDate) {
            queryBuilder.andWhere('log.created_at >= :startDate', {
                startDate: options.startDate,
            });
        }
        else if (options?.endDate) {
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
    async findByBroadcast(broadcastId, options) {
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
            }
            else {
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
    async updateStatus(id, status, additionalData) {
        const updateData = { status };
        // Set timestamp based on status
        const now = new Date();
        switch (status) {
            case message_log_entity_1.MessageStatus.SENT:
                updateData.sentAt = now;
                break;
            case message_log_entity_1.MessageStatus.DELIVERED:
                updateData.deliveredAt = now;
                break;
            case message_log_entity_1.MessageStatus.READ:
                updateData.readAt = now;
                break;
            case message_log_entity_1.MessageStatus.FAILED:
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
        await this.repository.update(id, updateData);
    }
    /**
     * Update message status by provider message ID.
     * Used for webhook processing.
     */
    async updateStatusByProviderMessageId(providerMessageId, status, additionalData) {
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
    async incrementRetryCount(id) {
        await this.repository.increment({ id }, 'retryCount', 1);
    }
    /**
     * Mark message as using fallback provider.
     */
    async markAsFallback(id) {
        await this.repository.update(id, { usedFallback: true });
    }
    /**
     * Get statistics for a tenant's messages.
     */
    async getStatsByTenant(tenantId, options) {
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
        const stats = {
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
            stats[result.status] = count;
        }
        return stats;
    }
    /**
     * Get statistics for a specific broadcast.
     */
    async getStatsByBroadcast(broadcastId) {
        const queryBuilder = this.repository
            .createQueryBuilder('log')
            .select('log.status', 'status')
            .addSelect('COUNT(*)', 'count')
            .where('log.broadcast_id = :broadcastId', { broadcastId })
            .groupBy('log.status');
        const results = await queryBuilder.getRawMany();
        const stats = {
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
            stats[result.status] = count;
        }
        return stats;
    }
    /**
     * Count message logs for a tenant.
     */
    async countByTenant(tenantId, options) {
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
            }
            else {
                queryBuilder.andWhere('log.status = :status', { status: options.status });
            }
        }
        return queryBuilder.getCount();
    }
    /**
     * Delete old message logs (for data retention).
     */
    async deleteOldLogs(tenantId, olderThan) {
        const result = await this.repository
            .createQueryBuilder()
            .delete()
            .from(message_log_entity_1.MessageLog)
            .where('tenant_id = :tenantId', { tenantId })
            .andWhere('created_at < :olderThan', { olderThan })
            .execute();
        return result.affected || 0;
    }
};
exports.MessageLogRepository = MessageLogRepository;
exports.MessageLogRepository = MessageLogRepository = __decorate([
    (0, tsyringe_1.singleton)()
], MessageLogRepository);
