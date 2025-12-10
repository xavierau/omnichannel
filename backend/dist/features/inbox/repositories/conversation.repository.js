"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConversationRepository = void 0;
const tsyringe_1 = require("tsyringe");
const database_config_1 = require("../../../config/database.config");
const conversation_entity_1 = require("../entities/conversation.entity");
const enums_1 = require("../enums");
/**
 * Allowed sort columns for conversation queries.
 * Maps user-facing field names to entity property names (camelCase).
 * TypeORM's orderBy with entity alias expects property names, not DB column names.
 * This serves as an allowlist to prevent SQL injection.
 */
const ALLOWED_SORT_COLUMNS = {
    lastMessageAt: 'lastMessageAt',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    status: 'status',
    unreadCount: 'unreadCount',
};
/**
 * Default sort column if none specified or if invalid column provided.
 */
const DEFAULT_SORT_COLUMN = 'lastMessageAt';
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
 * Repository for Conversation entity operations.
 * Handles CRUD operations with tenant isolation and team-based access control.
 *
 * CRITICAL: All operator-facing queries must enforce channel account access
 * through the accessibleChannelAccountIds parameter. This ensures operators
 * only see conversations from channel accounts their team has access to.
 */
let ConversationRepository = class ConversationRepository {
    _repository = null;
    /**
     * Lazy initialization of the repository to ensure AppDataSource is initialized.
     */
    get repository() {
        if (!this._repository) {
            this._repository = database_config_1.AppDataSource.getRepository(conversation_entity_1.Conversation);
        }
        return this._repository;
    }
    /**
     * Find a conversation by ID with tenant isolation.
     * Includes customer and assignedTo relations for display purposes.
     *
     * @param tenantId - The tenant ID for isolation
     * @param id - The conversation ID
     * @returns The conversation with relations or null if not found
     */
    async findById(tenantId, id) {
        return this.repository.findOne({
            where: { id, tenantId },
            relations: ['customer', 'assignedTo', 'channelAccount', 'channelAccount.channel'],
        });
    }
    /**
     * Find a conversation by customer and channel account combination.
     * This is the canonical lookup for finding or creating conversations
     * when processing incoming messages.
     *
     * @param tenantId - The tenant ID for isolation
     * @param customerId - The customer ID
     * @param channelAccountId - The channel account ID
     * @returns The conversation or null if not found
     */
    async findByCustomerAndChannel(tenantId, customerId, channelAccountId) {
        return this.repository.findOne({
            where: { tenantId, customerId, channelAccountId },
            relations: ['customer', 'assignedTo', 'channelAccount', 'channelAccount.channel'],
        });
    }
    /**
     * Find all conversations accessible to an operator.
     *
     * CRITICAL ACCESS CONTROL LOGIC:
     * 1. Tenant isolation: conversation.tenantId = tenantId
     * 2. Channel access: conversation.channelAccountId IN accessibleChannelAccountIds
     * 3. Assignment visibility: conversation.assignedToId = userId OR assignedToId IS NULL
     *
     * This ensures operators only see:
     * - Conversations from channel accounts their team has access to
     * - Conversations assigned to them OR unassigned conversations
     *
     * @param tenantId - The tenant ID for isolation
     * @param userId - The operator's user ID for assignment filtering
     * @param accessibleChannelAccountIds - Channel account IDs the operator's team has access to
     * @param options - Query options for filtering, pagination, and sorting
     * @returns Paginated result of conversations
     */
    async findAllForOperator(tenantId, userId, accessibleChannelAccountIds, options = {}) {
        const { statuses, search, page = 1, limit = 20, sortBy = 'lastMessageAt', sortOrder = 'desc', } = options;
        // Return empty result if no accessible channel accounts
        if (accessibleChannelAccountIds.length === 0) {
            return {
                data: [],
                total: 0,
                page,
                limit,
                totalPages: 0,
            };
        }
        const query = this.repository
            .createQueryBuilder('conversation')
            .leftJoinAndSelect('conversation.customer', 'customer')
            .leftJoinAndSelect('conversation.assignedTo', 'assignedTo')
            .leftJoinAndSelect('conversation.channelAccount', 'channelAccount')
            .leftJoinAndSelect('channelAccount.channel', 'channel')
            .where('conversation.tenant_id = :tenantId', { tenantId })
            .andWhere('conversation.channel_account_id IN (:...channelAccountIds)', {
            channelAccountIds: accessibleChannelAccountIds,
        })
            .andWhere('(conversation.assigned_to_id = :userId OR conversation.assigned_to_id IS NULL)', { userId });
        // Filter by statuses
        if (statuses && statuses.length > 0) {
            query.andWhere('conversation.status IN (:...statuses)', { statuses });
        }
        // Search by customer name or phone number
        if (search) {
            query.andWhere('(LOWER(customer.name) LIKE LOWER(:search) OR customer.whatsapp_number LIKE :search)', { search: `%${search}%` });
        }
        // Sorting - use allowlist to prevent SQL injection
        const sortColumn = getSafeSortColumn(sortBy);
        const order = (sortOrder || 'desc').toUpperCase();
        query.orderBy(`conversation.${sortColumn}`, order, 'NULLS LAST');
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
     * Create a new conversation.
     *
     * @param data - The conversation data to create
     * @returns The created conversation
     */
    async create(data) {
        const conversation = this.repository.create(data);
        return this.repository.save(conversation);
    }
    /**
     * Update an existing conversation with tenant isolation.
     *
     * @param tenantId - The tenant ID for isolation
     * @param id - The conversation ID
     * @param data - The data to update
     * @returns The updated conversation or null if not found
     */
    async update(tenantId, id, data) {
        const conversation = await this.findById(tenantId, id);
        if (!conversation) {
            return null;
        }
        Object.assign(conversation, data);
        return this.repository.save(conversation);
    }
    /**
     * Update the last message preview and timestamp.
     * Called when a new message is added to the conversation.
     *
     * @param tenantId - The tenant ID for isolation
     * @param id - The conversation ID
     * @param preview - The message preview text (truncated)
     * @param direction - The message direction (inbound/outbound)
     * @param timestamp - The message timestamp
     */
    async updateLastMessage(tenantId, id, preview, direction, timestamp) {
        await this.repository.update({ id, tenantId }, {
            lastMessagePreview: preview.substring(0, 255),
            lastMessageDirection: direction,
            lastMessageAt: timestamp,
        });
    }
    /**
     * Increment the unread message count.
     * Called when an inbound message is received.
     *
     * @param tenantId - The tenant ID for isolation
     * @param id - The conversation ID
     */
    async incrementUnreadCount(tenantId, id) {
        await this.repository.increment({ id, tenantId }, 'unreadCount', 1);
    }
    /**
     * Reset the unread message count to zero.
     * Called when an operator opens/reads the conversation.
     *
     * @param tenantId - The tenant ID for isolation
     * @param id - The conversation ID
     */
    async resetUnreadCount(tenantId, id) {
        await this.repository.update({ id, tenantId }, { unreadCount: 0 });
    }
    /**
     * Atomically assign a conversation to a user using pessimistic locking.
     * This prevents race conditions when multiple operators try to claim
     * the same conversation simultaneously.
     *
     * @param tenantId - The tenant ID for isolation
     * @param id - The conversation ID
     * @param assignedToId - The user ID to assign to, or null to unassign
     * @returns Object indicating if the update was applied
     */
    async assignAtomic(tenantId, id, assignedToId) {
        const queryRunner = database_config_1.AppDataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
            // Acquire pessimistic lock to prevent race conditions
            const conversation = await queryRunner.manager
                .createQueryBuilder(conversation_entity_1.Conversation, 'conversation')
                .setLock('pessimistic_write')
                .where('conversation.id = :id', { id })
                .andWhere('conversation.tenant_id = :tenantId', { tenantId })
                .getOne();
            if (!conversation) {
                await queryRunner.rollbackTransaction();
                return { wasUpdated: false, previousAssignedToId: null };
            }
            const previousAssignedToId = conversation.assignedToId;
            // Skip update if already assigned to the same user
            if (previousAssignedToId === assignedToId) {
                await queryRunner.rollbackTransaction();
                return { wasUpdated: false, previousAssignedToId };
            }
            // Update assignment and status
            const newStatus = assignedToId ? enums_1.ConversationStatus.ACTIVE : enums_1.ConversationStatus.UNASSIGNED;
            await queryRunner.manager.update(conversation_entity_1.Conversation, { id }, {
                assignedToId,
                status: newStatus,
            });
            await queryRunner.commitTransaction();
            return { wasUpdated: true, previousAssignedToId };
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
     * Count conversations by status for a tenant.
     * Useful for dashboard statistics.
     *
     * @param tenantId - The tenant ID
     * @returns Object with counts by status
     */
    async countByStatus(tenantId) {
        const results = await this.repository
            .createQueryBuilder('conversation')
            .select('conversation.status', 'status')
            .addSelect('COUNT(*)', 'count')
            .where('conversation.tenant_id = :tenantId', { tenantId })
            .groupBy('conversation.status')
            .getRawMany();
        // Initialize counts for all statuses
        const counts = {
            [enums_1.ConversationStatus.UNASSIGNED]: 0,
            [enums_1.ConversationStatus.ACTIVE]: 0,
            [enums_1.ConversationStatus.WAITING]: 0,
            [enums_1.ConversationStatus.RESOLVED]: 0,
            [enums_1.ConversationStatus.CLOSED]: 0,
        };
        // Populate from query results
        for (const result of results) {
            const status = result.status;
            counts[status] = parseInt(result.count, 10);
        }
        return counts;
    }
    /**
     * Update conversation status with tenant isolation.
     *
     * @param tenantId - The tenant ID for isolation
     * @param id - The conversation ID
     * @param status - The new status
     * @returns True if updated, false if not found
     */
    async updateStatus(tenantId, id, status) {
        const result = await this.repository.update({ id, tenantId }, { status });
        return (result.affected ?? 0) > 0;
    }
    /**
     * Update the last customer message timestamp.
     * Called when an inbound message is received from a customer.
     *
     * This timestamp is used for WhatsApp Cloud API 24-hour messaging window
     * compliance. Freeform messages can only be sent within 24 hours of this timestamp.
     *
     * @param tenantId - The tenant ID for isolation
     * @param id - The conversation ID
     * @param timestamp - The timestamp of the customer message
     */
    async updateLastCustomerMessageAt(tenantId, id, timestamp) {
        await this.repository.update({ id, tenantId }, { lastCustomerMessageAt: timestamp });
    }
};
exports.ConversationRepository = ConversationRepository;
exports.ConversationRepository = ConversationRepository = __decorate([
    (0, tsyringe_1.singleton)()
], ConversationRepository);
