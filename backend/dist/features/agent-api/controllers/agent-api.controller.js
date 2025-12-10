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
exports.AgentApiController = void 0;
const tsyringe_1 = require("tsyringe");
const conversation_service_1 = require("../../inbox/services/conversation.service");
const conversation_repository_1 = require("../../inbox/repositories/conversation.repository");
const conversation_message_repository_1 = require("../../inbox/repositories/conversation-message.repository");
const user_repository_1 = require("../../users/user.repository");
const inbox_message_queue_1 = require("../../../jobs/inbox-message.queue");
const async_handler_1 = require("../../../middleware/async-handler");
const http_exceptions_1 = require("../../../shared/exceptions/http-exceptions");
const enums_1 = require("../../inbox/enums");
const logger_config_1 = require("../../../config/logger.config");
/**
 * Controller for Agent API operations.
 *
 * Provides endpoints for AI agents to:
 * - Read conversation details
 * - Update conversation status
 * - Assign conversations to operators
 * - Send messages
 *
 * All operations are authenticated via API keys and scoped to
 * the tenant and optionally channel account of the API key.
 *
 * Unlike the Inbox API (used by human operators), the Agent API:
 * - Uses API key authentication instead of JWT
 * - Has separate permission model (ApiKeyPermission)
 * - May be scoped to specific channel accounts
 * - Does not enforce team-based access control
 */
let AgentApiController = class AgentApiController {
    conversationService;
    conversationRepository;
    messageRepository;
    userRepository;
    inboxMessageQueue;
    constructor(conversationService, conversationRepository, messageRepository, userRepository, inboxMessageQueue) {
        this.conversationService = conversationService;
        this.conversationRepository = conversationRepository;
        this.messageRepository = messageRepository;
        this.userRepository = userRepository;
        this.inboxMessageQueue = inboxMessageQueue;
    }
    /**
     * GET /operators
     * Get list of operators (users) available for conversation assignment.
     *
     * Returns users who belong to active teams within the tenant.
     * Useful for dynamic assignment logic in automation workflows.
     */
    getOperators = (0, async_handler_1.asyncHandler)(async (req, res) => {
        const tenantId = req.tenantId;
        const apiKey = req.apiKey;
        const operators = await this.conversationService.getOperators(tenantId);
        logger_config_1.auditLogger.info('Agent API: Operators retrieved', {
            action: 'agent_api.operators.list',
            tenantId,
            count: operators.length,
            apiKeyId: apiKey.id,
        });
        res.json({
            data: operators,
        });
    });
    /**
     * GET /conversations/:id
     * Get a single conversation by ID with access validation.
     *
     * Validates:
     * - Conversation exists in the tenant
     * - API key has access to the conversation's channel account (if scoped)
     *
     * Returns the conversation with customer info.
     */
    getConversation = (0, async_handler_1.asyncHandler)(async (req, res) => {
        const tenantId = req.tenantId;
        const apiKey = req.apiKey;
        const { id } = req.params;
        const conversation = await this.conversationRepository.findById(tenantId, id);
        if (!conversation) {
            throw new http_exceptions_1.NotFoundException('Conversation not found');
        }
        // Validate channel account scope
        this.validateChannelAccountScope(apiKey, conversation.channelAccountId);
        logger_config_1.auditLogger.info('Agent API: Conversation retrieved', {
            action: 'agent_api.conversation.get',
            tenantId,
            conversationId: id,
            apiKeyId: apiKey.id,
        });
        res.json({
            data: conversation,
        });
    });
    /**
     * GET /conversations/:id/messages
     * Get paginated messages for a conversation.
     *
     * Validates:
     * - Conversation exists in the tenant
     * - API key has access to the conversation's channel account (if scoped)
     *
     * Returns messages in descending order (newest first).
     * Supports pagination via query parameters: page (default: 1), limit (default: 50).
     */
    getMessages = (0, async_handler_1.asyncHandler)(async (req, res) => {
        const tenantId = req.tenantId;
        const apiKey = req.apiKey;
        const { id: conversationId } = req.params;
        const validatedQuery = req.validatedQuery;
        // Validate conversation exists and check scope
        const conversation = await this.conversationRepository.findById(tenantId, conversationId);
        if (!conversation) {
            throw new http_exceptions_1.NotFoundException('Conversation not found');
        }
        this.validateChannelAccountScope(apiKey, conversation.channelAccountId);
        // Get messages with pagination
        const result = await this.messageRepository.findByConversation(conversationId, {
            page: validatedQuery?.page || 1,
            limit: validatedQuery?.limit || 50,
        });
        logger_config_1.auditLogger.info('Agent API: Messages retrieved', {
            action: 'agent_api.messages.get',
            tenantId,
            conversationId,
            page: result.page,
            limit: result.limit,
            total: result.total,
            apiKeyId: apiKey.id,
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
     * PATCH /conversations/:id/status
     * Update the status of a conversation.
     *
     * Status transitions are validated by the ConversationService
     * according to the conversation state machine.
     *
     * Validates:
     * - Conversation exists in the tenant
     * - API key has access to the conversation's channel account (if scoped)
     * - Status transition is valid
     */
    updateStatus = (0, async_handler_1.asyncHandler)(async (req, res) => {
        const tenantId = req.tenantId;
        const apiKey = req.apiKey;
        const { id: conversationId } = req.params;
        const { status } = req.body;
        // First check if conversation exists and validate scope
        const conversation = await this.conversationRepository.findById(tenantId, conversationId);
        if (!conversation) {
            throw new http_exceptions_1.NotFoundException('Conversation not found');
        }
        this.validateChannelAccountScope(apiKey, conversation.channelAccountId);
        // Use ConversationService for status transition validation
        // Note: ConversationService.updateStatus requires a userId for access validation,
        // but agents don't have a user. We use a dummy user ID for the audit trail.
        // The actual validation is done above.
        const updatedConversation = await this.conversationService.updateStatus(tenantId, conversationId, apiKey.id, // Use API key ID as the actor for audit purposes
        status);
        logger_config_1.auditLogger.info('Agent API: Conversation status updated', {
            action: 'agent_api.conversation.status_update',
            tenantId,
            conversationId,
            previousStatus: conversation.status,
            newStatus: status,
            apiKeyId: apiKey.id,
        });
        res.json({
            data: updatedConversation,
        });
    });
    /**
     * POST /conversations/:id/assign
     * Assign a conversation to an operator.
     *
     * Validates:
     * - Conversation exists in the tenant
     * - API key has access to the conversation's channel account (if scoped)
     * - Target operator exists in the tenant
     *
     * Uses atomic assignment to prevent race conditions.
     */
    assignConversation = (0, async_handler_1.asyncHandler)(async (req, res) => {
        const tenantId = req.tenantId;
        const apiKey = req.apiKey;
        const { id: conversationId } = req.params;
        const { operatorId } = req.body;
        // Validate conversation exists and check scope
        const conversation = await this.conversationRepository.findById(tenantId, conversationId);
        if (!conversation) {
            throw new http_exceptions_1.NotFoundException('Conversation not found');
        }
        this.validateChannelAccountScope(apiKey, conversation.channelAccountId);
        // Validate operator exists in tenant
        const operator = await this.userRepository.findById(operatorId);
        if (!operator || operator.tenantId !== tenantId) {
            throw new http_exceptions_1.BadRequestException('Operator not found in tenant');
        }
        // Use atomic assignment for race-safe operation
        const { wasUpdated, previousAssignedToId } = await this.conversationRepository.assignAtomic(tenantId, conversationId, operatorId);
        if (!wasUpdated) {
            // Already assigned to this operator
            const currentConversation = await this.conversationRepository.findById(tenantId, conversationId);
            return res.json({
                data: currentConversation,
            });
        }
        const updatedConversation = await this.conversationRepository.findById(tenantId, conversationId);
        logger_config_1.auditLogger.info('Agent API: Conversation assigned', {
            action: 'agent_api.conversation.assign',
            tenantId,
            conversationId,
            previousAssignedToId,
            newAssignedToId: operatorId,
            apiKeyId: apiKey.id,
        });
        res.json({
            data: updatedConversation,
        });
    });
    /**
     * POST /conversations/:id/messages
     * Send a new message in a conversation.
     *
     * Supports content types: text, image, document, audio, template.
     * Creates the message record and queues it for delivery.
     *
     * Validates:
     * - Conversation exists in the tenant
     * - API key has access to the conversation's channel account (if scoped)
     * - Conversation has an associated customer
     * - Content is valid for the specified content type
     */
    sendMessage = (0, async_handler_1.asyncHandler)(async (req, res) => {
        const tenantId = req.tenantId;
        const apiKey = req.apiKey;
        const { id: conversationId } = req.params;
        const { contentType, text, media, template } = req.body;
        // Get conversation with customer info
        const conversation = await this.conversationRepository.findById(tenantId, conversationId);
        if (!conversation) {
            throw new http_exceptions_1.NotFoundException('Conversation not found');
        }
        this.validateChannelAccountScope(apiKey, conversation.channelAccountId);
        if (!conversation.customer) {
            throw new http_exceptions_1.BadRequestException('Cannot send message: conversation has no associated customer');
        }
        // Build message content based on type
        const content = this.buildMessageContent(contentType, text, media, template);
        // Create the message record
        const message = await this.messageRepository.create({
            tenantId,
            conversationId,
            direction: enums_1.MessageDirection.OUTBOUND,
            contentType,
            content,
            // sentById is null for agent-sent messages
            deliveryStatus: enums_1.MessageDeliveryStatus.PENDING,
            metadata: {
                sentByApiKeyId: apiKey.id,
            },
        });
        // Build outbound content for the queue
        const outboundContent = this.buildOutboundContent(contentType, content);
        // Queue message for delivery
        await this.inboxMessageQueue.queueOutboundMessage({
            tenantId,
            conversationId,
            messageId: message.id,
            channelAccountId: conversation.channelAccountId,
            recipient: conversation.customer.whatsappNumber,
            contentType: contentType,
            content: outboundContent,
        });
        logger_config_1.auditLogger.info('Agent API: Message sent', {
            action: 'agent_api.message.send',
            tenantId,
            conversationId,
            messageId: message.id,
            contentType,
            apiKeyId: apiKey.id,
        });
        res.status(201).json({
            data: message,
        });
    });
    // ============================================================================
    // Private Helper Methods
    // ============================================================================
    /**
     * Validates that the API key has access to the target channel account.
     *
     * If the API key is scoped to a specific channel account, the target
     * must match. If the API key is not scoped (channelAccountId is null),
     * it has access to all channel accounts in the tenant.
     *
     * @param apiKey - The authenticated API key
     * @param channelAccountId - The target channel account ID
     * @throws ForbiddenException if the API key lacks access
     */
    validateChannelAccountScope(apiKey, channelAccountId) {
        if (apiKey.channelAccountId && apiKey.channelAccountId !== channelAccountId) {
            throw new http_exceptions_1.ForbiddenException('API key is not authorized for this channel account');
        }
    }
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
    /**
     * Transforms the message content to the format expected by the queue.
     *
     * @param contentType - The type of message content
     * @param content - The message content from buildMessageContent
     * @returns The outbound content for the queue
     */
    buildOutboundContent(contentType, content) {
        switch (contentType) {
            case enums_1.MessageContentType.TEXT:
                return { text: content.body };
            case enums_1.MessageContentType.IMAGE:
            case enums_1.MessageContentType.VIDEO:
            case enums_1.MessageContentType.AUDIO:
            case enums_1.MessageContentType.DOCUMENT:
                return {
                    mediaUrl: content.url,
                    caption: content.caption,
                    filename: content.filename,
                };
            case enums_1.MessageContentType.TEMPLATE:
                return {
                    templateName: content.name,
                    templateLanguage: content.language,
                    templateVariables: content.variables,
                };
            default:
                return {};
        }
    }
};
exports.AgentApiController = AgentApiController;
exports.AgentApiController = AgentApiController = __decorate([
    (0, tsyringe_1.singleton)(),
    __param(0, (0, tsyringe_1.inject)(conversation_service_1.ConversationService)),
    __param(1, (0, tsyringe_1.inject)(conversation_repository_1.ConversationRepository)),
    __param(2, (0, tsyringe_1.inject)(conversation_message_repository_1.ConversationMessageRepository)),
    __param(3, (0, tsyringe_1.inject)(user_repository_1.UserRepository)),
    __param(4, (0, tsyringe_1.inject)(inbox_message_queue_1.InboxMessageQueue)),
    __metadata("design:paramtypes", [conversation_service_1.ConversationService,
        conversation_repository_1.ConversationRepository,
        conversation_message_repository_1.ConversationMessageRepository,
        user_repository_1.UserRepository,
        inbox_message_queue_1.InboxMessageQueue])
], AgentApiController);
