"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConversationService = void 0;
const tsyringe_1 = require("tsyringe");
const conversation_repository_1 = require("../repositories/conversation.repository");
const conversation_assignment_repository_1 = require("../repositories/conversation-assignment.repository");
const inbox_sse_service_1 = require("./inbox-sse.service");
const team_service_1 = require("../../teams/services/team.service");
const user_repository_1 = require("../../users/user.repository");
const enums_1 = require("../enums");
const http_exceptions_1 = require("../../../shared/exceptions/http-exceptions");
const logger_config_1 = require("../../../config/logger.config");
/**
 * Valid status transitions for conversations.
 *
 * Maps current status to an array of valid target statuses.
 * This implements a state machine for conversation lifecycle.
 */
const VALID_STATUS_TRANSITIONS = {
    [enums_1.ConversationStatus.UNASSIGNED]: [
        enums_1.ConversationStatus.ACTIVE,
        enums_1.ConversationStatus.WAITING,
        enums_1.ConversationStatus.RESOLVED,
        enums_1.ConversationStatus.CLOSED,
    ],
    [enums_1.ConversationStatus.ACTIVE]: [
        enums_1.ConversationStatus.WAITING,
        enums_1.ConversationStatus.RESOLVED,
        enums_1.ConversationStatus.CLOSED,
        enums_1.ConversationStatus.UNASSIGNED,
    ],
    [enums_1.ConversationStatus.WAITING]: [
        enums_1.ConversationStatus.ACTIVE,
        enums_1.ConversationStatus.RESOLVED,
        enums_1.ConversationStatus.CLOSED,
    ],
    [enums_1.ConversationStatus.RESOLVED]: [
        enums_1.ConversationStatus.ACTIVE,
        enums_1.ConversationStatus.CLOSED,
    ],
    [enums_1.ConversationStatus.CLOSED]: [
        enums_1.ConversationStatus.ACTIVE,
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
let ConversationService = class ConversationService {
    conversationRepository;
    assignmentRepository;
    sseService;
    teamService;
    userRepository;
    constructor(conversationRepository, assignmentRepository, sseService, teamService, userRepository) {
        this.conversationRepository = conversationRepository;
        this.assignmentRepository = assignmentRepository;
        this.sseService = sseService;
        this.teamService = teamService;
        this.userRepository = userRepository;
    }
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
    async listConversations(tenantId, userId, query) {
        const accessibleChannelAccountIds = await this.teamService.getAccessibleChannelAccountIds(userId);
        return this.conversationRepository.findAllForOperator(tenantId, userId, accessibleChannelAccountIds, query);
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
    async getConversation(tenantId, userId, conversationId) {
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
    async getOperators(tenantId) {
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
    async pickupConversation(tenantId, conversationId, userId) {
        const conversation = await this.validateAccess(tenantId, userId, conversationId);
        // Already assigned to this user - no action needed
        if (conversation.assignedToId === userId) {
            return conversation;
        }
        // Cannot pick up a conversation assigned to someone else
        if (conversation.assignedToId !== null) {
            throw new http_exceptions_1.BadRequestException('Conversation is already assigned to another operator');
        }
        // Atomically assign the conversation
        const { wasUpdated, previousAssignedToId } = await this.conversationRepository.assignAtomic(tenantId, conversationId, userId);
        if (wasUpdated) {
            // Create assignment audit record
            await this.assignmentRepository.create({
                tenantId,
                conversationId,
                fromUserId: previousAssignedToId,
                toUserId: userId,
                action: enums_1.AssignmentAction.ASSIGNED,
                performedById: userId,
            });
            logger_config_1.auditLogger.info('Conversation picked up', {
                action: 'conversation.pickup',
                tenantId,
                conversationId,
                userId,
            });
        }
        // Return the updated conversation
        const updatedConversation = await this.conversationRepository.findById(tenantId, conversationId);
        if (!updatedConversation) {
            throw new http_exceptions_1.NotFoundException('Conversation not found');
        }
        // Emit SSE event for real-time updates
        this.sseService.emitConversationEvent(tenantId, conversationId, 'conversation:assigned', {
            assignedToId: userId,
            previousAssignedToId: null,
            action: 'pickup',
        });
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
    async releaseConversation(tenantId, conversationId, userId) {
        const conversation = await this.validateAccess(tenantId, userId, conversationId);
        // Can only release conversations assigned to you
        if (conversation.assignedToId !== userId) {
            throw new http_exceptions_1.BadRequestException('Can only release conversations assigned to you');
        }
        // Atomically release the conversation
        const { wasUpdated, previousAssignedToId } = await this.conversationRepository.assignAtomic(tenantId, conversationId, null);
        if (wasUpdated) {
            // Create release audit record
            await this.assignmentRepository.create({
                tenantId,
                conversationId,
                fromUserId: previousAssignedToId,
                toUserId: null,
                action: enums_1.AssignmentAction.RELEASED,
                performedById: userId,
            });
            logger_config_1.auditLogger.info('Conversation released', {
                action: 'conversation.release',
                tenantId,
                conversationId,
                userId,
            });
        }
        // Return the updated conversation
        const updatedConversation = await this.conversationRepository.findById(tenantId, conversationId);
        if (!updatedConversation) {
            throw new http_exceptions_1.NotFoundException('Conversation not found');
        }
        // Emit SSE event for real-time updates
        this.sseService.emitConversationEvent(tenantId, conversationId, 'conversation:assigned', {
            assignedToId: null,
            previousAssignedToId: userId,
            action: 'release',
        });
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
    async assignConversation(tenantId, conversationId, targetUserId, performedById) {
        const conversation = await this.validateAccess(tenantId, performedById, conversationId);
        // Validate target user has access to the channel account
        const targetHasAccess = await this.teamService.hasAccessToChannelAccount(targetUserId, conversation.channelAccountId);
        if (!targetHasAccess) {
            throw new http_exceptions_1.ForbiddenException('Target user does not have access to this channel account');
        }
        const previousAssignedToId = conversation.assignedToId;
        // Atomically assign the conversation
        const { wasUpdated } = await this.conversationRepository.assignAtomic(tenantId, conversationId, targetUserId);
        if (wasUpdated) {
            // Create transfer audit record
            await this.assignmentRepository.create({
                tenantId,
                conversationId,
                fromUserId: previousAssignedToId,
                toUserId: targetUserId,
                action: enums_1.AssignmentAction.TRANSFERRED,
                performedById,
            });
            logger_config_1.auditLogger.info('Conversation transferred', {
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
            throw new http_exceptions_1.NotFoundException('Conversation not found');
        }
        // Emit SSE event for real-time updates
        this.sseService.emitConversationEvent(tenantId, conversationId, 'conversation:assigned', {
            assignedToId: targetUserId,
            previousAssignedToId,
            action: 'transfer',
            performedById,
        });
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
    async updateStatus(tenantId, conversationId, userId, newStatus) {
        const conversation = await this.validateAccess(tenantId, userId, conversationId);
        // Validate status transition
        const validTargets = VALID_STATUS_TRANSITIONS[conversation.status];
        if (!validTargets.includes(newStatus)) {
            throw new http_exceptions_1.BadRequestException(`Invalid status transition from "${conversation.status}" to "${newStatus}". ` +
                `Valid transitions: ${validTargets.join(', ')}`);
        }
        await this.conversationRepository.updateStatus(tenantId, conversationId, newStatus);
        logger_config_1.auditLogger.info('Conversation status updated', {
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
            throw new http_exceptions_1.NotFoundException('Conversation not found');
        }
        // Emit SSE event for real-time updates
        this.sseService.emitConversationEvent(tenantId, conversationId, 'conversation:status:changed', {
            previousStatus: conversation.status,
            status: newStatus,
            updatedById: userId,
        });
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
    async markAsRead(tenantId, conversationId, userId) {
        await this.validateAccess(tenantId, userId, conversationId);
        await this.conversationRepository.resetUnreadCount(tenantId, conversationId);
        // Return the updated conversation
        const updatedConversation = await this.conversationRepository.findById(tenantId, conversationId);
        if (!updatedConversation) {
            throw new http_exceptions_1.NotFoundException('Conversation not found');
        }
        // Emit SSE event for real-time updates
        this.sseService.emitConversationEvent(tenantId, conversationId, 'conversation:unread:updated', {
            unreadCount: 0,
            markedByUserId: userId,
        });
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
    async validateAccess(tenantId, userId, conversationId) {
        const conversation = await this.conversationRepository.findById(tenantId, conversationId);
        if (!conversation) {
            throw new http_exceptions_1.NotFoundException('Conversation not found');
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
        throw new http_exceptions_1.ForbiddenException('You do not have access to this conversation');
    }
};
exports.ConversationService = ConversationService;
exports.ConversationService = ConversationService = __decorate([
    (0, tsyringe_1.singleton)(),
    __param(0, (0, tsyringe_1.inject)(conversation_repository_1.ConversationRepository)),
    __param(1, (0, tsyringe_1.inject)(conversation_assignment_repository_1.ConversationAssignmentRepository)),
    __param(2, (0, tsyringe_1.inject)(inbox_sse_service_1.InboxSseService)),
    __param(3, (0, tsyringe_1.inject)(team_service_1.TeamService)),
    __param(4, (0, tsyringe_1.inject)(user_repository_1.UserRepository)),
    __metadata("design:paramtypes", [conversation_repository_1.ConversationRepository,
        conversation_assignment_repository_1.ConversationAssignmentRepository,
        inbox_sse_service_1.InboxSseService,
        team_service_1.TeamService,
        user_repository_1.UserRepository])
], ConversationService);
