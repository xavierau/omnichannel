import { Repository } from 'typeorm';
import { singleton } from 'tsyringe';
import { AppDataSource } from '@config/database.config';
import { ConversationAssignment } from '../entities/conversation-assignment.entity';

/**
 * Repository for ConversationAssignment entity operations.
 * Provides an audit trail for conversation assignment changes.
 *
 * This repository follows an append-only pattern:
 * - Assignments are created but never updated or deleted
 * - The assignment history provides a complete audit trail
 * - The latest assignment reflects the current state
 *
 * Use cases:
 * - Track who handled a conversation over time
 * - Audit trail for compliance/quality assurance
 * - Workload analysis and reporting
 */
@singleton()
export class ConversationAssignmentRepository {
  private _repository: Repository<ConversationAssignment> | null = null;

  /**
   * Lazy initialization of the repository to ensure AppDataSource is initialized.
   */
  private get repository(): Repository<ConversationAssignment> {
    if (!this._repository) {
      this._repository = AppDataSource.getRepository(ConversationAssignment);
    }
    return this._repository;
  }

  /**
   * Find all assignments for a conversation.
   * Returns the complete assignment history in chronological order.
   *
   * @param conversationId - The conversation ID
   * @returns Array of assignments ordered by creation time (oldest first)
   */
  async findByConversation(
    conversationId: string
  ): Promise<ConversationAssignment[]> {
    return this.repository.find({
      where: { conversationId },
      relations: ['fromUser', 'toUser', 'performedBy'],
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Create a new assignment record.
   * This is an append-only operation - assignments are never updated.
   *
   * @param data - The assignment data to create
   * @returns The created assignment record
   */
  async create(
    data: Partial<ConversationAssignment>
  ): Promise<ConversationAssignment> {
    const assignment = this.repository.create(data);
    return this.repository.save(assignment);
  }

  /**
   * Get the most recent assignment for a conversation.
   * This reflects the current assignment state.
   *
   * @param conversationId - The conversation ID
   * @returns The latest assignment or null if never assigned
   */
  async getLatestAssignment(
    conversationId: string
  ): Promise<ConversationAssignment | null> {
    return this.repository.findOne({
      where: { conversationId },
      relations: ['fromUser', 'toUser', 'performedBy'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Find all assignments performed by a specific user.
   * Useful for auditing and activity tracking.
   *
   * @param tenantId - The tenant ID for isolation
   * @param performedById - The user ID who performed the assignments
   * @param limit - Maximum number of assignments to return
   * @returns Array of assignments performed by the user
   */
  async findByPerformedBy(
    tenantId: string,
    performedById: string,
    limit: number = 100
  ): Promise<ConversationAssignment[]> {
    return this.repository.find({
      where: { tenantId, performedById },
      relations: ['fromUser', 'toUser', 'conversation'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Find all assignments where a user was assigned to (received).
   * Useful for user activity and workload analysis.
   *
   * @param tenantId - The tenant ID for isolation
   * @param toUserId - The user ID who received assignments
   * @param limit - Maximum number of assignments to return
   * @returns Array of assignments where the user was the target
   */
  async findByToUser(
    tenantId: string,
    toUserId: string,
    limit: number = 100
  ): Promise<ConversationAssignment[]> {
    return this.repository.find({
      where: { tenantId, toUserId },
      relations: ['fromUser', 'performedBy', 'conversation'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Count assignments for a conversation.
   * Indicates how many times a conversation was reassigned.
   *
   * @param conversationId - The conversation ID
   * @returns The assignment count
   */
  async countByConversation(conversationId: string): Promise<number> {
    return this.repository.count({ where: { conversationId } });
  }

  /**
   * Get assignment statistics for a user within a date range.
   * Useful for workload reports and performance metrics.
   *
   * @param tenantId - The tenant ID for isolation
   * @param userId - The user ID to get statistics for
   * @param startDate - Start of the date range
   * @param endDate - End of the date range
   * @returns Object with assignment counts
   */
  async getStatsByUser(
    tenantId: string,
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{ assignedTo: number; assignedFrom: number; performed: number }> {
    const assignedToCount = await this.repository
      .createQueryBuilder('assignment')
      .where('assignment.tenant_id = :tenantId', { tenantId })
      .andWhere('assignment.to_user_id = :userId', { userId })
      .andWhere('assignment.created_at >= :startDate', { startDate })
      .andWhere('assignment.created_at <= :endDate', { endDate })
      .getCount();

    const assignedFromCount = await this.repository
      .createQueryBuilder('assignment')
      .where('assignment.tenant_id = :tenantId', { tenantId })
      .andWhere('assignment.from_user_id = :userId', { userId })
      .andWhere('assignment.created_at >= :startDate', { startDate })
      .andWhere('assignment.created_at <= :endDate', { endDate })
      .getCount();

    const performedCount = await this.repository
      .createQueryBuilder('assignment')
      .where('assignment.tenant_id = :tenantId', { tenantId })
      .andWhere('assignment.performed_by_id = :userId', { userId })
      .andWhere('assignment.created_at >= :startDate', { startDate })
      .andWhere('assignment.created_at <= :endDate', { endDate })
      .getCount();

    return {
      assignedTo: assignedToCount,
      assignedFrom: assignedFromCount,
      performed: performedCount,
    };
  }

  /**
   * Find the most recent assignments across all conversations for a tenant.
   * Useful for activity feeds and dashboards.
   *
   * @param tenantId - The tenant ID for isolation
   * @param limit - Maximum number of assignments to return
   * @returns Array of recent assignments
   */
  async findRecent(
    tenantId: string,
    limit: number = 50
  ): Promise<ConversationAssignment[]> {
    return this.repository.find({
      where: { tenantId },
      relations: ['fromUser', 'toUser', 'performedBy', 'conversation'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }
}
