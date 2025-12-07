import { singleton, inject } from 'tsyringe';
import {
  ConversationRepository,
  ConversationQueryOptions,
  PaginatedResult,
} from '../repositories/conversation.repository';
import { ConversationAssignmentRepository } from '../repositories/conversation-assignment.repository';
import { InboxSseService } from './inbox-sse.service';
import { TeamService } from '../../teams/services/team.service';
import { UserRepository } from '../../users/user.repository';
import { Conversation } from '../entities/conversation.entity';
import { User } from '../../users/user.entity';
import { ConversationStatus, AssignmentAction } from '../enums';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '../../../shared/exceptions/http-exceptions';
import { auditLogger } from '../../../config/logger.config';

/**
 * Data transfer object for operator list response.
 */
export interface OperatorDto {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

/**
 * Valid status transitions for conversations.
 *
 * Maps current status to an array of valid target statuses.
 * This implements a state machine for conversation lifecycle.
 */
const VALID_STATUS_TRANSITIONS: Record<ConversationStatus, ConversationStatus[]> = {
  [ConversationStatus.UNASSIGNED]: [
    ConversationStatus.ACTIVE,
    ConversationStatus.WAITING,
    ConversationStatus.RESOLVED,
    ConversationStatus.CLOSED,
  ],
  [ConversationStatus.ACTIVE]: [
    ConversationStatus.WAITING,
    ConversationStatus.RESOLVED,
    ConversationStatus.CLOSED,
    ConversationStatus.UNASSIGNED,
  ],
  [ConversationStatus.WAITING]: [
    ConversationStatus.ACTIVE,
    ConversationStatus.RESOLVED,
    ConversationStatus.CLOSED,
  ],
  [ConversationStatus.RESOLVED]: [
    ConversationStatus.ACTIVE,
    ConversationStatus.CLOSED,
  ],
  [ConversationStatus.CLOSED]: [
    ConversationStatus.ACTIVE,
  ],
};

/**
 * Service layer for conversation operations with team-based access control.
 *
 * Access Control Model:
 * 1. Channel Account Access: Users can only see conversations from channel accounts
 *    that their team has been granted access to.
 * 2. Assignment Visibility: Users can see conversations assigned to them OR unassigned.
 *
 * The combination ensures operators only work on conversations they should handle,
 * while still allowing them to pick up unassigned conversations from their channels.
 */
@singleton()
export class ConversationService {
  constructor(
    @inject(ConversationRepository) private conversationRepository: ConversationRepository,
    @inject(ConversationAssignmentRepository) private assignmentRepository: ConversationAssignmentRepository,
    @inject(InboxSseService) private sseService: InboxSseService,
    @inject(TeamService) private teamService: TeamService,
    @inject(UserRepository) private userRepository: UserRepository
  ) {}

  // ============================================================================
  // Listing & Retrieval
  // ============================================================================

  /**
   * Lists conversations accessible to an operator.
   *
   * Access control enforces:
   * 1. Only conversations from channel accounts the user's team has access to
   * 2. Only conversations assigned to the user OR unassigned
   *
   * @param tenantId - The tenant ID for isolation
   * @param userId - The operator's user ID
   * @param query - Query options for filtering, pagination, and sorting
   * @returns Paginated list of accessible conversations
   */
  async listConversations(
    tenantId: string,
    userId: string,
    query: ConversationQueryOptions
  ): Promise<PaginatedResult<Conversation>> {
    const accessibleChannelAccountIds = await this.teamService.getAccessibleChannelAccountIds(userId);

    return this.conversationRepository.findAllForOperator(
      tenantId,
      userId,
      accessibleChannelAccountIds,
      query
    );
  }

  /**
   * Retrieves a single conversation by ID with access validation.
   *
   * @param tenantId - The tenant ID for isolation
   * @param userId - The operator's user ID
   * @param conversationId - The conversation ID
   * @returns The conversation with relations
   * @throws NotFoundException if conversation not found
   * @throws ForbiddenException if user lacks access
   */
  async getConversation(
    tenantId: string,
    userId: string,
    conversationId: string
  ): Promise<Conversation> {
    return this.validateAccess(tenantId, userId, conversationId);
  }

  /**
   * Lists operators (users) available for conversation assignment.
   *
   * Returns users who:
   * - Belong to the same tenant
   * - Are members of active teams
   * - Have active user status
   *
   * @param tenantId - The tenant ID for isolation
   * @returns Array of operator DTOs
   */
  async getOperators(tenantId: string): Promise<OperatorDto[]> {
    const users = await this.userRepository.findOperatorsByTenant(tenantId);

    return users.map((user) => ({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
    }));
  }

  // ============================================================================
  // Assignment Operations
  // ============================================================================

  /**
   * Picks up an unassigned conversation for the user.
   *
   * Business rules:
   * - Conversation must be unassigned OR already assigned to this user
   * - Updates status to ACTIVE if was UNASSIGNED
   * - Creates an assignment audit record
   *
   * Uses pessimistic locking to prevent race conditions when multiple
   * operators try to claim the same conversation.
   *
   * @param tenantId - The tenant ID for isolation
   * @param conversationId - The conversation ID
   * @param userId - The user picking up the conversation
   * @returns The updated conversation
   * @throws NotFoundException if conversation not found
   * @throws ForbiddenException if user lacks channel access
   * @throws BadRequestException if conversation is assigned to another user
   */
  async pickupConversation(
    tenantId: string,
    conversationId: string,
    userId: string
  ): Promise<Conversation> {
    const conversation = await this.validateAccess(tenantId, userId, conversationId);

    // Already assigned to this user - no action needed
    if (conversation.assignedToId === userId) {
      return conversation;
    }

    // Cannot pick up a conversation assigned to someone else
    if (conversation.assignedToId !== null) {
      throw new BadRequestException(
        'Conversation is already assigned to another operator'
      );
    }

    // Atomically assign the conversation
    const { wasUpdated, previousAssignedToId } = await this.conversationRepository.assignAtomic(
      tenantId,
      conversationId,
      userId
    );

    if (wasUpdated) {
      // Create assignment audit record
      await this.assignmentRepository.create({
        tenantId,
        conversationId,
        fromUserId: previousAssignedToId,
        toUserId: userId,
        action: AssignmentAction.ASSIGNED,
        performedById: userId,
      });

      auditLogger.info('Conversation picked up', {
        action: 'conversation.pickup',
        tenantId,
        conversationId,
        userId,
      });
    }

    // Return the updated conversation
    const updatedConversation = await this.conversationRepository.findById(tenantId, conversationId);
    if (!updatedConversation) {
      throw new NotFoundException('Conversation not found');
    }

    // Emit SSE event for real-time updates
    this.sseService.emitConversationEvent(
      tenantId,
      conversationId,
      'conversation:assigned',
      {
        assignedToId: userId,
        previousAssignedToId: null,
        action: 'pickup',
      }
    );

    return updatedConversation;
  }

  /**
   * Releases a conversation back to the unassigned pool.
   *
   * Business rules:
   * - Conversation must be currently assigned to this user
   * - Updates assignedToId to null
   * - Updates status to UNASSIGNED
   * - Creates a release audit record
   *
   * @param tenantId - The tenant ID for isolation
   * @param conversationId - The conversation ID
   * @param userId - The user releasing the conversation
   * @returns The updated conversation
   * @throws NotFoundException if conversation not found
   * @throws ForbiddenException if user lacks access
   * @throws BadRequestException if conversation is not assigned to this user
   */
  async releaseConversation(
    tenantId: string,
    conversationId: string,
    userId: string
  ): Promise<Conversation> {
    const conversation = await this.validateAccess(tenantId, userId, conversationId);

    // Can only release conversations assigned to you
    if (conversation.assignedToId !== userId) {
      throw new BadRequestException(
        'Can only release conversations assigned to you'
      );
    }

    // Atomically release the conversation
    const { wasUpdated, previousAssignedToId } = await this.conversationRepository.assignAtomic(
      tenantId,
      conversationId,
      null
    );

    if (wasUpdated) {
      // Create release audit record
      await this.assignmentRepository.create({
        tenantId,
        conversationId,
        fromUserId: previousAssignedToId,
        toUserId: null,
        action: AssignmentAction.RELEASED,
        performedById: userId,
      });

      auditLogger.info('Conversation released', {
        action: 'conversation.release',
        tenantId,
        conversationId,
        userId,
      });
    }

    // Return the updated conversation
    const updatedConversation = await this.conversationRepository.findById(tenantId, conversationId);
    if (!updatedConversation) {
      throw new NotFoundException('Conversation not found');
    }

    // Emit SSE event for real-time updates
    this.sseService.emitConversationEvent(
      tenantId,
      conversationId,
      'conversation:assigned',
      {
        assignedToId: null,
        previousAssignedToId: userId,
        action: 'release',
      }
    );

    return updatedConversation;
  }

  /**
   * Assigns/transfers a conversation to a different user.
   *
   * Business rules:
   * - Target user must have access to the conversation's channel account
   * - Updates assignedToId to targetUserId
   * - Updates status to ACTIVE
   * - Creates a transfer audit record
   *
   * @param tenantId - The tenant ID for isolation
   * @param conversationId - The conversation ID
   * @param targetUserId - The user to assign the conversation to
   * @param performedById - The user performing the assignment
   * @returns The updated conversation
   * @throws NotFoundException if conversation not found
   * @throws ForbiddenException if performing user lacks access or target user lacks channel access
   */
  async assignConversation(
    tenantId: string,
    conversationId: string,
    targetUserId: string,
    performedById: string
  ): Promise<Conversation> {
    const conversation = await this.validateAccess(tenantId, performedById, conversationId);

    // Validate target user has access to the channel account
    const targetHasAccess = await this.teamService.hasAccessToChannelAccount(
      targetUserId,
      conversation.channelAccountId
    );

    if (!targetHasAccess) {
      throw new ForbiddenException(
        'Target user does not have access to this channel account'
      );
    }

    const previousAssignedToId = conversation.assignedToId;

    // Atomically assign the conversation
    const { wasUpdated } = await this.conversationRepository.assignAtomic(
      tenantId,
      conversationId,
      targetUserId
    );

    if (wasUpdated) {
      // Create transfer audit record
      await this.assignmentRepository.create({
        tenantId,
        conversationId,
        fromUserId: previousAssignedToId,
        toUserId: targetUserId,
        action: AssignmentAction.TRANSFERRED,
        performedById,
      });

      auditLogger.info('Conversation transferred', {
        action: 'conversation.transfer',
        tenantId,
        conversationId,
        fromUserId: previousAssignedToId,
        toUserId: targetUserId,
        performedById,
      });
    }

    // Return the updated conversation
    const updatedConversation = await this.conversationRepository.findById(tenantId, conversationId);
    if (!updatedConversation) {
      throw new NotFoundException('Conversation not found');
    }

    // Emit SSE event for real-time updates
    this.sseService.emitConversationEvent(
      tenantId,
      conversationId,
      'conversation:assigned',
      {
        assignedToId: targetUserId,
        previousAssignedToId,
        action: 'transfer',
        performedById,
      }
    );

    return updatedConversation;
  }

  // ============================================================================
  // Status Management
  // ============================================================================

  /**
   * Updates the status of a conversation.
   *
   * Validates that the status transition is allowed according to the
   * state machine defined in VALID_STATUS_TRANSITIONS.
   *
   * @param tenantId - The tenant ID for isolation
   * @param conversationId - The conversation ID
   * @param userId - The user performing the update
   * @param newStatus - The target status
   * @returns The updated conversation
   * @throws NotFoundException if conversation not found
   * @throws ForbiddenException if user lacks access
   * @throws BadRequestException if status transition is invalid
   */
  async updateStatus(
    tenantId: string,
    conversationId: string,
    userId: string,
    newStatus: ConversationStatus
  ): Promise<Conversation> {
    const conversation = await this.validateAccess(tenantId, userId, conversationId);

    // Validate status transition
    const validTargets = VALID_STATUS_TRANSITIONS[conversation.status];
    if (!validTargets.includes(newStatus)) {
      throw new BadRequestException(
        `Invalid status transition from "${conversation.status}" to "${newStatus}". ` +
        `Valid transitions: ${validTargets.join(', ')}`
      );
    }

    await this.conversationRepository.updateStatus(tenantId, conversationId, newStatus);

    auditLogger.info('Conversation status updated', {
      action: 'conversation.status_update',
      tenantId,
      conversationId,
      userId,
      fromStatus: conversation.status,
      toStatus: newStatus,
    });

    // Return the updated conversation
    const updatedConversation = await this.conversationRepository.findById(tenantId, conversationId);
    if (!updatedConversation) {
      throw new NotFoundException('Conversation not found');
    }

    // Emit SSE event for real-time updates
    this.sseService.emitConversationEvent(
      tenantId,
      conversationId,
      'conversation:status:changed',
      {
        previousStatus: conversation.status,
        status: newStatus,
        updatedById: userId,
      }
    );

    return updatedConversation;
  }

  /**
   * Marks a conversation as read by resetting the unread count.
   *
   * @param tenantId - The tenant ID for isolation
   * @param conversationId - The conversation ID
   * @param userId - The user marking as read
   * @returns The updated conversation
   * @throws NotFoundException if conversation not found
   * @throws ForbiddenException if user lacks access
   */
  async markAsRead(
    tenantId: string,
    conversationId: string,
    userId: string
  ): Promise<Conversation> {
    await this.validateAccess(tenantId, userId, conversationId);

    await this.conversationRepository.resetUnreadCount(tenantId, conversationId);

    // Return the updated conversation
    const updatedConversation = await this.conversationRepository.findById(tenantId, conversationId);
    if (!updatedConversation) {
      throw new NotFoundException('Conversation not found');
    }

    // Emit SSE event for real-time updates
    this.sseService.emitConversationEvent(
      tenantId,
      conversationId,
      'conversation:unread:updated',
      {
        unreadCount: 0,
        markedByUserId: userId,
      }
    );

    return updatedConversation;
  }

  // ============================================================================
  // Access Validation
  // ============================================================================

  /**
   * Validates that a user has access to a conversation.
   *
   * Access is granted if EITHER:
   * 1. The conversation's channel account is in the user's accessible channels
   * 2. The conversation is assigned to the user
   *
   * This allows:
   * - Operators to see all conversations from their team's channels
   * - Operators to continue working on conversations assigned to them,
   *   even if their team's channel access changes
   *
   * @param tenantId - The tenant ID for isolation
   * @param userId - The user ID to validate access for
   * @param conversationId - The conversation ID
   * @returns The conversation if access is valid
   * @throws NotFoundException if conversation not found
   * @throws ForbiddenException if user lacks access
   */
  async validateAccess(
    tenantId: string,
    userId: string,
    conversationId: string
  ): Promise<Conversation> {
    const conversation = await this.conversationRepository.findById(tenantId, conversationId);

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    // Check 1: Is the conversation assigned to this user?
    if (conversation.assignedToId === userId) {
      return conversation;
    }

    // Check 2: Does the user have access to the channel account?
    const accessibleChannelAccountIds = await this.teamService.getAccessibleChannelAccountIds(userId);

    if (accessibleChannelAccountIds.includes(conversation.channelAccountId)) {
      return conversation;
    }

    throw new ForbiddenException(
      'You do not have access to this conversation'
    );
  }
}
