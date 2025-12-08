import { ConversationRepository, ConversationQueryOptions, PaginatedResult } from '../repositories/conversation.repository';
import { ConversationAssignmentRepository } from '../repositories/conversation-assignment.repository';
import { InboxSseService } from './inbox-sse.service';
import { TeamService } from '../../teams/services/team.service';
import { UserRepository } from '../../users/user.repository';
import { Conversation } from '../entities/conversation.entity';
import { ConversationStatus } from '../enums';
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
export declare class ConversationService {
    private conversationRepository;
    private assignmentRepository;
    private sseService;
    private teamService;
    private userRepository;
    constructor(conversationRepository: ConversationRepository, assignmentRepository: ConversationAssignmentRepository, sseService: InboxSseService, teamService: TeamService, userRepository: UserRepository);
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
    listConversations(tenantId: string, userId: string, query: ConversationQueryOptions): Promise<PaginatedResult<Conversation>>;
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
    getConversation(tenantId: string, userId: string, conversationId: string): Promise<Conversation>;
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
    getOperators(tenantId: string): Promise<OperatorDto[]>;
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
    pickupConversation(tenantId: string, conversationId: string, userId: string): Promise<Conversation>;
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
    releaseConversation(tenantId: string, conversationId: string, userId: string): Promise<Conversation>;
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
    assignConversation(tenantId: string, conversationId: string, targetUserId: string, performedById: string): Promise<Conversation>;
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
    updateStatus(tenantId: string, conversationId: string, userId: string, newStatus: ConversationStatus): Promise<Conversation>;
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
    markAsRead(tenantId: string, conversationId: string, userId: string): Promise<Conversation>;
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
    validateAccess(tenantId: string, userId: string, conversationId: string): Promise<Conversation>;
}
