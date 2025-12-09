import { Repository } from 'typeorm';
import { singleton } from 'tsyringe';
import { AppDataSource } from '@config/database.config';
import { ConversationMessage } from '../entities/conversation-message.entity';
import { MessageDeliveryStatus } from '../enums';

/**
 * Pagination options for listing messages.
 */
export interface PaginationOptions {
  page?: number;
  limit?: number;
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
 * Timestamps for delivery status updates.
 */
export interface DeliveryStatusTimestamps {
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
}

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
@singleton()
export class ConversationMessageRepository {
  private _repository: Repository<ConversationMessage> | null = null;

  /**
   * Lazy initialization of the repository to ensure AppDataSource is initialized.
   */
  private get repository(): Repository<ConversationMessage> {
    if (!this._repository) {
      this._repository = AppDataSource.getRepository(ConversationMessage);
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
  async findByConversation(
    conversationId: string,
    options: PaginationOptions = {}
  ): Promise<PaginatedResult<ConversationMessage>> {
    const { page = 1, limit = 50 } = options;

    const query = this.repository
      .createQueryBuilder('message')
      .leftJoinAndSelect('message.sentBy', 'sentBy')
      .where('message.conversationId = :conversationId', { conversationId })
      .orderBy('message.createdAt', 'DESC');

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
  async findByProviderMessageId(
    providerMessageId: string
  ): Promise<ConversationMessage | null> {
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
  async findById(id: string): Promise<ConversationMessage | null> {
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
  async create(data: Partial<ConversationMessage>): Promise<ConversationMessage> {
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
  async updateDeliveryStatus(
    id: string,
    status: MessageDeliveryStatus,
    timestamps?: DeliveryStatusTimestamps
  ): Promise<void> {
    const updateData: Record<string, unknown> = {
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
  async updateError(
    id: string,
    errorCode: string,
    errorMessage: string
  ): Promise<void> {
    await this.repository.update(
      { id },
      {
        deliveryStatus: MessageDeliveryStatus.FAILED,
        errorCode,
        errorMessage,
      }
    );
  }

  /**
   * Increment the retry count for a message.
   * Returns the new retry count for decision making on whether to retry again.
   *
   * @param id - The message ID
   * @returns The new retry count after increment
   */
  async incrementRetryCount(id: string): Promise<number> {
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
  async countByConversation(conversationId: string): Promise<number> {
    return this.repository.count({ where: { conversationId } });
  }

  /**
   * Get the latest message in a conversation.
   *
   * @param conversationId - The conversation ID
   * @returns The latest message or null if no messages exist
   */
  async findLatestByConversation(
    conversationId: string
  ): Promise<ConversationMessage | null> {
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
  async findPendingForRetry(
    maxRetryCount: number,
    limit: number = 100
  ): Promise<ConversationMessage[]> {
    return this.repository.find({
      where: {
        deliveryStatus: MessageDeliveryStatus.FAILED,
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
  async bulkUpdateDeliveryStatus(
    providerMessageIds: string[],
    status: MessageDeliveryStatus,
    timestamp?: Date
  ): Promise<number> {
    if (providerMessageIds.length === 0) {
      return 0;
    }

    const updateData: Record<string, unknown> = {
      deliveryStatus: status,
    };

    // Set appropriate timestamp based on status
    if (timestamp) {
      switch (status) {
        case MessageDeliveryStatus.SENT:
          updateData.sentAt = timestamp;
          break;
        case MessageDeliveryStatus.DELIVERED:
          updateData.deliveredAt = timestamp;
          break;
        case MessageDeliveryStatus.READ:
          updateData.readAt = timestamp;
          break;
      }
    }

    const result = await this.repository
      .createQueryBuilder()
      .update(ConversationMessage)
      .set(updateData)
      .where('providerMessageId IN (:...providerMessageIds)', { providerMessageIds })
      .execute();

    return result.affected ?? 0;
  }
}
