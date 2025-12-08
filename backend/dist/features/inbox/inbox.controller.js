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
exports.InboxController = void 0;
const tsyringe_1 = require("tsyringe");
const conversation_service_1 = require("./services/conversation.service");
const inbox_note_service_1 = require("./services/inbox-note.service");
const conversation_message_repository_1 = require("./repositories/conversation-message.repository");
const async_handler_1 = require("@middleware/async-handler");
const http_exceptions_1 = require("@shared/exceptions/http-exceptions");
const enums_1 = require("./enums");
/**
 * Controller for inbox (conversation) operations.
 *
 * Handles HTTP request/response mapping for:
 * - Conversation listing and retrieval
 * - Message listing and sending
 * - Conversation assignment (pickup, release, transfer)
 * - Status management
 * - Internal notes CRUD
 *
 * All operations enforce team-based access control through the ConversationService.
 */
let InboxController = class InboxController {
    conversationService;
    noteService;
    messageRepository;
    constructor(conversationService, noteService, messageRepository) {
        this.conversationService = conversationService;
        this.noteService = noteService;
        this.messageRepository = messageRepository;
    }
    // ============================================================================
    // Operator Listing
    // ============================================================================
    /**
     * GET /operators
     * List operators (users) available for conversation assignment.
     * Returns users who belong to active teams within the tenant.
     */
    listOperators = (0, async_handler_1.asyncHandler)(async (req, res) => {
        const tenantId = req.tenantId;
        const operators = await this.conversationService.getOperators(tenantId);
        res.json({
            data: operators,
        });
    });
    // ============================================================================
    // Conversation Listing & Retrieval
    // ============================================================================
    /**
     * GET /conversations
     * List conversations accessible to the current user.
     * Supports filtering, searching, pagination, and sorting.
     */
    listConversations = (0, async_handler_1.asyncHandler)(async (req, res) => {
        const tenantId = req.tenantId;
        const user = req.user;
        const validatedQuery = req.validatedQuery;
        const options = {
            statuses: validatedQuery?.status,
            search: validatedQuery?.search,
            page: validatedQuery?.page || 1,
            limit: validatedQuery?.limit || 20,
            sortBy: validatedQuery?.sortBy || 'lastMessageAt',
            sortOrder: validatedQuery?.sortOrder || 'desc',
        };
        const result = await this.conversationService.listConversations(tenantId, user.id, options);
        res.json({
            data: result.data,
            pagination: {
                total: result.total,
                page: result.page,
                limit: result.limit,
                totalPages: result.totalPages,
            },
        });
    });
    /**
     * GET /conversations/:id
     * Get a single conversation by ID with access validation.
     */
    getConversation = (0, async_handler_1.asyncHandler)(async (req, res) => {
        const tenantId = req.tenantId;
        const user = req.user;
        const { id } = req.params;
        const conversation = await this.conversationService.getConversation(tenantId, user.id, id);
        res.json({
            data: conversation,
        });
    });
    // ============================================================================
    // Message Operations
    // ============================================================================
    /**
     * GET /conversations/:id/messages
     * Get paginated messages for a conversation.
     * Returns messages in descending order (newest first).
     */
    getMessages = (0, async_handler_1.asyncHandler)(async (req, res) => {
        const tenantId = req.tenantId;
        const user = req.user;
        const { id: conversationId } = req.params;
        const validatedQuery = req.validatedQuery;
        // Validate access to the conversation
        await this.conversationService.validateAccess(tenantId, user.id, conversationId);
        const result = await this.messageRepository.findByConversation(conversationId, {
            page: validatedQuery?.page || 1,
            limit: validatedQuery?.limit || 50,
        });
        res.json({
            data: result.data,
            pagination: {
                total: result.total,
                page: result.page,
                limit: result.limit,
                totalPages: result.totalPages,
            },
        });
    });
    /**
     * POST /conversations/:id/messages
     * Send a new message in a conversation.
     *
     * Supports content types: text, image, document, audio, template.
     * Creates the message record and queues it for delivery.
     */
    sendMessage = (0, async_handler_1.asyncHandler)(async (req, res) => {
        const tenantId = req.tenantId;
        const user = req.user;
        const { id: conversationId } = req.params;
        const { contentType, text, media, template } = req.body;
        // Validate access to the conversation
        await this.conversationService.validateAccess(tenantId, user.id, conversationId);
        // Validate content based on type
        const content = this.buildMessageContent(contentType, text, media, template);
        // Create the message record
        const message = await this.messageRepository.create({
            tenantId,
            conversationId,
            direction: enums_1.MessageDirection.OUTBOUND,
            contentType,
            content,
            sentById: user.id,
            deliveryStatus: enums_1.MessageDeliveryStatus.PENDING,
        });
        // TODO: Queue message for delivery to the messaging provider
        // This would be handled by a message queue (e.g., BullMQ) in production
        res.status(201).json({
            data: message,
        });
    });
    // ============================================================================
    // Assignment Operations
    // ============================================================================
    /**
     * POST /conversations/:id/pickup
     * Pick up an unassigned conversation.
     * Assigns the conversation to the current user.
     */
    pickupConversation = (0, async_handler_1.asyncHandler)(async (req, res) => {
        const tenantId = req.tenantId;
        const user = req.user;
        const { id: conversationId } = req.params;
        const conversation = await this.conversationService.pickupConversation(tenantId, conversationId, user.id);
        res.json({
            data: conversation,
        });
    });
    /**
     * POST /conversations/:id/release
     * Release a conversation back to the unassigned pool.
     * Only the assigned operator can release a conversation.
     */
    releaseConversation = (0, async_handler_1.asyncHandler)(async (req, res) => {
        const tenantId = req.tenantId;
        const user = req.user;
        const { id: conversationId } = req.params;
        const conversation = await this.conversationService.releaseConversation(tenantId, conversationId, user.id);
        res.json({
            data: conversation,
        });
    });
    /**
     * POST /conversations/:id/assign
     * Assign a conversation to another user.
     * Requires inbox:assign:all permission.
     */
    assignConversation = (0, async_handler_1.asyncHandler)(async (req, res) => {
        const tenantId = req.tenantId;
        const user = req.user;
        const { id: conversationId } = req.params;
        const { userId: targetUserId } = req.body;
        const conversation = await this.conversationService.assignConversation(tenantId, conversationId, targetUserId, user.id);
        res.json({
            data: conversation,
        });
    });
    // ============================================================================
    // Status Management
    // ============================================================================
    /**
     * PATCH /conversations/:id/status
     * Update the status of a conversation.
     * Status transitions are validated by the service layer.
     */
    updateStatus = (0, async_handler_1.asyncHandler)(async (req, res) => {
        const tenantId = req.tenantId;
        const user = req.user;
        const { id: conversationId } = req.params;
        const { status } = req.body;
        const conversation = await this.conversationService.updateStatus(tenantId, conversationId, user.id, status);
        res.json({
            data: conversation,
        });
    });
    /**
     * PATCH /conversations/:id/mark-read
     * Mark a conversation as read by resetting the unread count.
     */
    markAsRead = (0, async_handler_1.asyncHandler)(async (req, res) => {
        const tenantId = req.tenantId;
        const user = req.user;
        const { id: conversationId } = req.params;
        const conversation = await this.conversationService.markAsRead(tenantId, conversationId, user.id);
        res.json({
            data: conversation,
        });
    });
    // ============================================================================
    // Note Operations
    // ============================================================================
    /**
     * GET /conversations/:id/notes
     * Get all notes for a conversation.
     * Returns notes in descending order (newest first).
     *
     * Optional query parameter:
     * - scope: Filter by note scope ('conversation' | 'customer')
     */
    getNotes = (0, async_handler_1.asyncHandler)(async (req, res) => {
        const tenantId = req.tenantId;
        const user = req.user;
        const { id: conversationId } = req.params;
        const scope = req.query.scope;
        const notes = await this.noteService.getNotes(tenantId, conversationId, user.id, scope);
        res.json({
            data: notes,
        });
    });
    /**
     * POST /conversations/:id/notes
     * Create a new note on a conversation.
     *
     * Request body:
     * - content: string (required) - Note content
     * - scope: 'conversation' | 'customer' (optional, defaults to 'conversation')
     * - mentions: string[] (optional) - Array of user IDs to mention
     */
    createNote = (0, async_handler_1.asyncHandler)(async (req, res) => {
        const tenantId = req.tenantId;
        const user = req.user;
        const { id: conversationId } = req.params;
        const { content, scope, mentions } = req.body;
        const note = await this.noteService.createNote(tenantId, conversationId, user.id, { content, scope, mentions });
        res.status(201).json({
            data: note,
        });
    });
    /**
     * PATCH /notes/:id
     * Update an existing note.
     * Only the note creator can update their notes.
     *
     * Request body:
     * - content: string (optional) - Updated note content
     * - mentions: string[] (optional) - Updated array of user IDs to mention
     */
    updateNote = (0, async_handler_1.asyncHandler)(async (req, res) => {
        const tenantId = req.tenantId;
        const user = req.user;
        const { id: noteId } = req.params;
        const { content, mentions } = req.body;
        const note = await this.noteService.updateNote(tenantId, noteId, user.id, { content, mentions });
        res.json({
            data: note,
        });
    });
    /**
     * DELETE /notes/:id
     * Delete a note.
     * Only the note creator can delete their notes.
     */
    deleteNote = (0, async_handler_1.asyncHandler)(async (req, res) => {
        const tenantId = req.tenantId;
        const user = req.user;
        const { id: noteId } = req.params;
        await this.noteService.deleteNote(tenantId, noteId, user.id);
        res.status(204).send();
    });
    // ============================================================================
    // Private Helper Methods
    // ============================================================================
    /**
     * Builds the message content object based on content type.
     * Validates that the required content field is present for the given type.
     *
     * @param contentType - The type of message content
     * @param text - Text content (required for TEXT type)
     * @param media - Media content (required for IMAGE, DOCUMENT, AUDIO types)
     * @param template - Template content (required for TEMPLATE type)
     * @returns The message content object
     * @throws BadRequestException if required content is missing
     */
    buildMessageContent(contentType, text, media, template) {
        switch (contentType) {
            case enums_1.MessageContentType.TEXT:
                if (!text?.content) {
                    throw new http_exceptions_1.BadRequestException('text.content is required for text messages');
                }
                return { body: text.content };
            case enums_1.MessageContentType.IMAGE:
            case enums_1.MessageContentType.DOCUMENT:
            case enums_1.MessageContentType.AUDIO:
                if (!media?.url) {
                    throw new http_exceptions_1.BadRequestException('media.url is required for media messages');
                }
                return {
                    url: media.url,
                    mimeType: media.mimeType,
                    caption: media.caption,
                    filename: media.filename,
                };
            case enums_1.MessageContentType.TEMPLATE:
                if (!template?.name || !template?.language) {
                    throw new http_exceptions_1.BadRequestException('template.name and template.language are required for template messages');
                }
                return {
                    name: template.name,
                    language: template.language,
                    variables: template.variables || {},
                };
            default:
                throw new http_exceptions_1.BadRequestException(`Unsupported content type: ${contentType}`);
        }
    }
};
exports.InboxController = InboxController;
exports.InboxController = InboxController = __decorate([
    (0, tsyringe_1.singleton)(),
    __param(0, (0, tsyringe_1.inject)(conversation_service_1.ConversationService)),
    __param(1, (0, tsyringe_1.inject)(inbox_note_service_1.InboxNoteService)),
    __param(2, (0, tsyringe_1.inject)(conversation_message_repository_1.ConversationMessageRepository)),
    __metadata("design:paramtypes", [conversation_service_1.ConversationService,
        inbox_note_service_1.InboxNoteService,
        conversation_message_repository_1.ConversationMessageRepository])
], InboxController);
