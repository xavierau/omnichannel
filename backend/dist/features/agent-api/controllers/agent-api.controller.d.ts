import { Request, Response } from 'express';
import { ConversationService } from '../../inbox/services/conversation.service';
import { ConversationRepository } from '../../inbox/repositories/conversation.repository';
import { ConversationMessageRepository } from '../../inbox/repositories/conversation-message.repository';
import { UserRepository } from '../../users/user.repository';
import { InboxMessageQueue } from '../../../jobs/inbox-message.queue';
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
export declare class AgentApiController {
    private conversationService;
    private conversationRepository;
    private messageRepository;
    private userRepository;
    private inboxMessageQueue;
    constructor(conversationService: ConversationService, conversationRepository: ConversationRepository, messageRepository: ConversationMessageRepository, userRepository: UserRepository, inboxMessageQueue: InboxMessageQueue);
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
    getConversation: (req: Request, res: Response, next: import("express").NextFunction) => void;
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
    updateStatus: (req: Request, res: Response, next: import("express").NextFunction) => void;
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
    assignConversation: (req: Request, res: Response, next: import("express").NextFunction) => void;
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
    sendMessage: (req: Request, res: Response, next: import("express").NextFunction) => void;
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
    private validateChannelAccountScope;
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
    private buildMessageContent;
    /**
     * Transforms the message content to the format expected by the queue.
     *
     * @param contentType - The type of message content
     * @param content - The message content from buildMessageContent
     * @returns The outbound content for the queue
     */
    private buildOutboundContent;
}
