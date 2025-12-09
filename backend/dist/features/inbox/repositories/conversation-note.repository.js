"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConversationNoteRepository = void 0;
const tsyringe_1 = require("tsyringe");
const database_config_1 = require("../../../config/database.config");
const conversation_note_entity_1 = require("../entities/conversation-note.entity");
const enums_1 = require("../enums");
/**
 * Repository for ConversationNote entity operations.
 * Handles internal notes attached to conversations or customers.
 *
 * Notes are internal-only content visible to operators but not customers.
 * They support:
 * - Scoped visibility (conversation-specific vs customer-wide)
 * - @mentions for team collaboration
 * - Edit history (via updated_at tracking)
 */
let ConversationNoteRepository = class ConversationNoteRepository {
    _repository = null;
    /**
     * Lazy initialization of the repository to ensure AppDataSource is initialized.
     */
    get repository() {
        if (!this._repository) {
            this._repository = database_config_1.AppDataSource.getRepository(conversation_note_entity_1.ConversationNote);
        }
        return this._repository;
    }
    /**
     * Find all notes for a conversation.
     * Optionally filter by scope to get conversation-specific or customer-wide notes.
     *
     * @param conversationId - The conversation ID
     * @param scope - Optional scope filter
     * @returns Array of notes ordered by creation time (newest first)
     */
    async findByConversation(conversationId, scope) {
        const query = this.repository
            .createQueryBuilder('note')
            .leftJoinAndSelect('note.createdBy', 'createdBy')
            .where('note.conversationId = :conversationId', { conversationId })
            .orderBy('note.createdAt', 'DESC');
        if (scope) {
            query.andWhere('note.scope = :scope', { scope });
        }
        return query.getMany();
    }
    /**
     * Find all notes associated with a customer.
     * Returns notes with customer scope that are visible across all conversations.
     *
     * @param tenantId - The tenant ID for isolation
     * @param customerId - The customer ID
     * @returns Array of customer-scoped notes ordered by creation time
     */
    async findByCustomer(tenantId, customerId) {
        return this.repository.find({
            where: {
                tenantId,
                customerId,
                scope: enums_1.NoteScope.CUSTOMER,
            },
            relations: ['createdBy', 'conversation'],
            order: { createdAt: 'DESC' },
        });
    }
    /**
     * Find a note by ID with tenant isolation.
     *
     * @param tenantId - The tenant ID for isolation
     * @param id - The note ID
     * @returns The note or null if not found
     */
    async findById(tenantId, id) {
        return this.repository.findOne({
            where: { id, tenantId },
            relations: ['createdBy', 'conversation', 'customer'],
        });
    }
    /**
     * Create a new note.
     *
     * @param data - The note data to create
     * @returns The created note
     */
    async create(data) {
        const note = this.repository.create(data);
        return this.repository.save(note);
    }
    /**
     * Update an existing note with tenant isolation.
     * Only the content and mentions can be updated.
     *
     * @param tenantId - The tenant ID for isolation
     * @param id - The note ID
     * @param data - The data to update (content and/or mentions)
     * @returns The updated note or null if not found
     */
    async update(tenantId, id, data) {
        const note = await this.findById(tenantId, id);
        if (!note) {
            return null;
        }
        if (data.content !== undefined) {
            note.content = data.content;
        }
        if (data.mentions !== undefined) {
            note.mentions = data.mentions;
        }
        return this.repository.save(note);
    }
    /**
     * Delete a note with tenant isolation.
     *
     * @param tenantId - The tenant ID for isolation
     * @param id - The note ID
     * @returns True if deleted, false if not found
     */
    async delete(tenantId, id) {
        const result = await this.repository.delete({ id, tenantId });
        return (result.affected ?? 0) > 0;
    }
    /**
     * Count notes for a conversation.
     *
     * @param conversationId - The conversation ID
     * @returns The note count
     */
    async countByConversation(conversationId) {
        return this.repository.count({ where: { conversationId } });
    }
    /**
     * Find notes that mention a specific user.
     * Useful for notifications and activity feeds.
     *
     * @param tenantId - The tenant ID for isolation
     * @param userId - The user ID to search for in mentions
     * @param limit - Maximum number of notes to return
     * @returns Array of notes mentioning the user
     */
    async findByMentionedUser(tenantId, userId, limit = 50) {
        // PostgreSQL JSONB query for mentions array containing user
        return this.repository
            .createQueryBuilder('note')
            .leftJoinAndSelect('note.createdBy', 'createdBy')
            .leftJoinAndSelect('note.conversation', 'conversation')
            .where('note.tenantId = :tenantId', { tenantId })
            .andWhere(`note.mentions @> :mention::jsonb`, {
            mention: JSON.stringify([{ userId }]),
        })
            .orderBy('note.createdAt', 'DESC')
            .take(limit)
            .getMany();
    }
    /**
     * Bulk delete notes for a conversation.
     * Used when cleaning up after conversation deletion.
     *
     * @param conversationId - The conversation ID
     * @returns Number of notes deleted
     */
    async bulkDeleteByConversation(conversationId) {
        const result = await this.repository.delete({ conversationId });
        return result.affected ?? 0;
    }
};
exports.ConversationNoteRepository = ConversationNoteRepository;
exports.ConversationNoteRepository = ConversationNoteRepository = __decorate([
    (0, tsyringe_1.singleton)()
], ConversationNoteRepository);
