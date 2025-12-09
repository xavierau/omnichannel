"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConversationMessageRepository = void 0;
const tsyringe_1 = require("tsyringe");
const database_config_1 = require("../../../config/database.config");
const conversation_message_entity_1 = require("../entities/conversation-message.entity");
const enums_1 = require("../enums");
/**
 * Repository for ConversationMessage entity operations.
 * Handles message CRUD and delivery status tracking.
 *
 * Messages are the core data in conversations. This repository
 * provides efficient access patterns for:
 * - Paginated message history (newest first for chat UI)
 * - Delivery status updates from provider webhooks
 * - Provider message ID lookup for status correlation
 */
let ConversationMessageRepository = class ConversationMessageRepository {
    _repository = null;
    /**
     * Lazy initialization of the repository to ensure AppDataSource is initialized.
     */
    get repository() {
        if (!this._repository) {
            this._repository = database_config_1.AppDataSource.getRepository(conversation_message_entity_1.ConversationMessage);
        }
        return this._repository;
    }
    /**
     * Find messages for a conversation with pagination.
     * Returns messages in descending order by creation time (newest first),
     * which is the typical display order for chat interfaces.
     *
     * @param conversationId - The conversation ID
     * @param options - Pagination options
     * @returns Paginated result of messages
     */
    async findByConversation(conversationId, options = {}) {
        const { page = 1, limit = 50 } = options;
        const query = this.repository
            .createQueryBuilder('message')
            .leftJoinAndSelect('message.sentBy', 'sentBy')
            .where('message.conversation_id = :conversationId', { conversationId })
            .orderBy('message.created_at', 'DESC');
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
     * Find a message by its provider-assigned message ID.
     * Used to correlate webhook status updates with our messages.
     *
     * @param providerMessageId - The provider's message ID
     * @returns The message or null if not found
     */
    async findByProviderMessageId(providerMessageId) {
        return this.repository.findOne({
            where: { providerMessageId },
            relations: ['conversation'],
        });
    }
    /**
     * Find a message by ID.
     *
     * @param id - The message ID
     * @returns The message or null if not found
     */
    async findById(id) {
        return this.repository.findOne({
            where: { id },
            relations: ['sentBy', 'conversation'],
        });
    }
    /**
     * Create a new message.
     *
     * @param data - The message data to create
     * @returns The created message
     */
    async create(data) {
        const message = this.repository.create(data);
        return this.repository.save(message);
    }
    /**
     * Update the delivery status of a message.
     * Called when receiving webhook updates from the messaging provider.
     *
     * Status progression: PENDING -> SENT -> DELIVERED -> READ
     * Status FAILED can occur at any point.
     *
     * @param id - The message ID
     * @param status - The new delivery status
     * @param timestamps - Optional timestamps for sent, delivered, or read events
     */
    async updateDeliveryStatus(id, status, timestamps) {
        const updateData = {
            deliveryStatus: status,
        };
        if (timestamps?.sentAt) {
            updateData.sentAt = timestamps.sentAt;
        }
        if (timestamps?.deliveredAt) {
            updateData.deliveredAt = timestamps.deliveredAt;
        }
        if (timestamps?.readAt) {
            updateData.readAt = timestamps.readAt;
        }
        await this.repository.update({ id }, updateData);
    }
    /**
     * Update error information for a failed message.
     *
     * @param id - The message ID
     * @param errorCode - The error code from the provider
     * @param errorMessage - The human-readable error message
     */
    async updateError(id, errorCode, errorMessage) {
        await this.repository.update({ id }, {
            deliveryStatus: enums_1.MessageDeliveryStatus.FAILED,
            errorCode,
            errorMessage,
        });
    }
    /**
     * Increment the retry count for a message.
     * Returns the new retry count for decision making on whether to retry again.
     *
     * @param id - The message ID
     * @returns The new retry count after increment
     */
    async incrementRetryCount(id) {
        await this.repository.increment({ id }, 'retryCount', 1);
        const message = await this.repository.findOne({
            where: { id },
            select: ['retryCount'],
        });
        return message?.retryCount ?? 0;
    }
    /**
     * Get the count of messages in a conversation.
     *
     * @param conversationId - The conversation ID
     * @returns The message count
     */
    async countByConversation(conversationId) {
        return this.repository.count({ where: { conversationId } });
    }
    /**
     * Get the latest message in a conversation.
     *
     * @param conversationId - The conversation ID
     * @returns The latest message or null if no messages exist
     */
    async findLatestByConversation(conversationId) {
        return this.repository.findOne({
            where: { conversationId },
            order: { createdAt: 'DESC' },
            relations: ['sentBy'],
        });
    }
    /**
     * Find messages pending delivery for retry processing.
     * Used by background jobs to retry failed message deliveries.
     *
     * @param maxRetryCount - Maximum retry count to consider
     * @param limit - Maximum number of messages to return
     * @returns Array of messages eligible for retry
     */
    async findPendingForRetry(maxRetryCount, limit = 100) {
        return this.repository.find({
            where: {
                deliveryStatus: enums_1.MessageDeliveryStatus.FAILED,
            },
            order: { createdAt: 'ASC' },
            take: limit,
            relations: ['conversation'],
        });
    }
    /**
     * Bulk update delivery status for multiple messages.
     * Useful for batch processing webhook updates.
     *
     * @param providerMessageIds - Array of provider message IDs
     * @param status - The new delivery status
     * @param timestamp - Optional timestamp for the status change
     * @returns Number of messages updated
     */
    async bulkUpdateDeliveryStatus(providerMessageIds, status, timestamp) {
        if (providerMessageIds.length === 0) {
            return 0;
        }
        const updateData = {
            deliveryStatus: status,
        };
        // Set appropriate timestamp based on status
        if (timestamp) {
            switch (status) {
                case enums_1.MessageDeliveryStatus.SENT:
                    updateData.sentAt = timestamp;
                    break;
                case enums_1.MessageDeliveryStatus.DELIVERED:
                    updateData.deliveredAt = timestamp;
                    break;
                case enums_1.MessageDeliveryStatus.READ:
                    updateData.readAt = timestamp;
                    break;
            }
        }
        const result = await this.repository
            .createQueryBuilder()
            .update(conversation_message_entity_1.ConversationMessage)
            .set(updateData)
            .where('provider_message_id IN (:...providerMessageIds)', { providerMessageIds })
            .execute();
        return result.affected ?? 0;
    }
};
exports.ConversationMessageRepository = ConversationMessageRepository;
exports.ConversationMessageRepository = ConversationMessageRepository = __decorate([
    (0, tsyringe_1.singleton)()
], ConversationMessageRepository);
