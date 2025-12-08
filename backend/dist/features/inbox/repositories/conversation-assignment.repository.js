"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConversationAssignmentRepository = void 0;
const tsyringe_1 = require("tsyringe");
const database_config_1 = require("@config/database.config");
const conversation_assignment_entity_1 = require("../entities/conversation-assignment.entity");
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
let ConversationAssignmentRepository = class ConversationAssignmentRepository {
    _repository = null;
    /**
     * Lazy initialization of the repository to ensure AppDataSource is initialized.
     */
    get repository() {
        if (!this._repository) {
            this._repository = database_config_1.AppDataSource.getRepository(conversation_assignment_entity_1.ConversationAssignment);
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
    async findByConversation(conversationId) {
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
    async create(data) {
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
    async getLatestAssignment(conversationId) {
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
    async findByPerformedBy(tenantId, performedById, limit = 100) {
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
    async findByToUser(tenantId, toUserId, limit = 100) {
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
    async countByConversation(conversationId) {
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
    async getStatsByUser(tenantId, userId, startDate, endDate) {
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
    async findRecent(tenantId, limit = 50) {
        return this.repository.find({
            where: { tenantId },
            relations: ['fromUser', 'toUser', 'performedBy', 'conversation'],
            order: { createdAt: 'DESC' },
            take: limit,
        });
    }
};
exports.ConversationAssignmentRepository = ConversationAssignmentRepository;
exports.ConversationAssignmentRepository = ConversationAssignmentRepository = __decorate([
    (0, tsyringe_1.singleton)()
], ConversationAssignmentRepository);
