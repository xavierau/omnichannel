import { Request, Response } from 'express';
import { inject, singleton } from 'tsyringe';
import { ConversationService } from '@features/inbox/services/conversation.service';
import { ConversationRepository } from '@features/inbox/repositories/conversation.repository';
import { ConversationMessageRepository } from '@features/inbox/repositories/conversation-message.repository';
import { UserRepository } from '@features/users/user.repository';
import {
  InboxMessageQueue,
  OutboundMessageContent,
  OutboundContentType,
} from '../../../jobs/inbox-message.queue';
import { asyncHandler } from '@middleware/async-handler';
import { ApiKey } from '@features/api-keys/entities/api-key.entity';
import {
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@shared/exceptions/http-exceptions';
import { MessageContentType, MessageDirection, MessageDeliveryStatus } from '@features/inbox/enums';
import { TemplateVariables } from '@features/messaging/interfaces/messaging-provider.interface';
import { auditLogger } from '@config/logger.config';

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
@singleton()
export class AgentApiController {
  constructor(
    @inject(ConversationService) private conversationService: ConversationService,
    @inject(ConversationRepository) private conversationRepository: ConversationRepository,
    @inject(ConversationMessageRepository) private messageRepository: ConversationMessageRepository,
    @inject(UserRepository) private userRepository: UserRepository,
    @inject(InboxMessageQueue) private inboxMessageQueue: InboxMessageQueue
  ) {}

  /**
   * GET /operators
   * Get list of operators (users) available for conversation assignment.
   *
   * Returns users who belong to active teams within the tenant.
   * Useful for dynamic assignment logic in automation workflows.
   */
  getOperators = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const apiKey = req.apiKey as ApiKey;

    const operators = await this.conversationService.getOperators(tenantId);

    auditLogger.info('Agent API: Operators retrieved', {
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
  getConversation = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const apiKey = req.apiKey as ApiKey;
    const { id } = req.params;

    const conversation = await this.conversationRepository.findById(tenantId, id);

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    // Validate channel account scope
    this.validateChannelAccountScope(apiKey, conversation.channelAccountId);

    auditLogger.info('Agent API: Conversation retrieved', {
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
  getMessages = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const apiKey = req.apiKey as ApiKey;
    const { id: conversationId } = req.params;
    const validatedQuery = (req as Request & { validatedQuery?: Record<string, unknown> }).validatedQuery;

    // Validate conversation exists and check scope
    const conversation = await this.conversationRepository.findById(tenantId, conversationId);

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    this.validateChannelAccountScope(apiKey, conversation.channelAccountId);

    // Get messages with pagination
    const result = await this.messageRepository.findByConversation(conversationId, {
      page: (validatedQuery?.page as number) || 1,
      limit: (validatedQuery?.limit as number) || 50,
    });

    auditLogger.info('Agent API: Messages retrieved', {
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
  updateStatus = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const apiKey = req.apiKey as ApiKey;
    const { id: conversationId } = req.params;
    const { status } = req.body;

    // First check if conversation exists and validate scope
    const conversation = await this.conversationRepository.findById(tenantId, conversationId);

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    this.validateChannelAccountScope(apiKey, conversation.channelAccountId);

    // Use ConversationService for status transition validation
    // Note: ConversationService.updateStatus requires a userId for access validation,
    // but agents don't have a user. We use a dummy user ID for the audit trail.
    // The actual validation is done above.
    const updatedConversation = await this.conversationService.updateStatus(
      tenantId,
      conversationId,
      apiKey.id, // Use API key ID as the actor for audit purposes
      status
    );

    auditLogger.info('Agent API: Conversation status updated', {
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
  assignConversation = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const apiKey = req.apiKey as ApiKey;
    const { id: conversationId } = req.params;
    const { operatorId } = req.body;

    // Validate conversation exists and check scope
    const conversation = await this.conversationRepository.findById(tenantId, conversationId);

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    this.validateChannelAccountScope(apiKey, conversation.channelAccountId);

    // Validate operator exists in tenant
    const operator = await this.userRepository.findById(operatorId);

    if (!operator || operator.tenantId !== tenantId) {
      throw new BadRequestException('Operator not found in tenant');
    }

    // Use atomic assignment for race-safe operation
    const { wasUpdated, previousAssignedToId } = await this.conversationRepository.assignAtomic(
      tenantId,
      conversationId,
      operatorId
    );

    if (!wasUpdated) {
      // Already assigned to this operator
      const currentConversation = await this.conversationRepository.findById(tenantId, conversationId);
      return res.json({
        data: currentConversation,
      });
    }

    const updatedConversation = await this.conversationRepository.findById(tenantId, conversationId);

    auditLogger.info('Agent API: Conversation assigned', {
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
  sendMessage = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const apiKey = req.apiKey as ApiKey;
    const { id: conversationId } = req.params;
    const { contentType, text, media, template } = req.body;

    // Get conversation with customer info
    const conversation = await this.conversationRepository.findById(tenantId, conversationId);

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    this.validateChannelAccountScope(apiKey, conversation.channelAccountId);

    if (!conversation.customer) {
      throw new BadRequestException('Cannot send message: conversation has no associated customer');
    }

    // Build message content based on type
    const content = this.buildMessageContent(contentType, text, media, template);

    // Create the message record
    const message = await this.messageRepository.create({
      tenantId,
      conversationId,
      direction: MessageDirection.OUTBOUND,
      contentType,
      content,
      // sentById is null for agent-sent messages
      deliveryStatus: MessageDeliveryStatus.PENDING,
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
      contentType: contentType as OutboundContentType,
      content: outboundContent,
    });

    auditLogger.info('Agent API: Message sent', {
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
  private validateChannelAccountScope(apiKey: ApiKey, channelAccountId: string): void {
    if (apiKey.channelAccountId && apiKey.channelAccountId !== channelAccountId) {
      throw new ForbiddenException(
        'API key is not authorized for this channel account'
      );
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
  private buildMessageContent(
    contentType: MessageContentType,
    text?: { content: string },
    media?: { url: string; mimeType?: string; caption?: string; filename?: string },
    template?: { name: string; language: string; variables?: Record<string, unknown> }
  ): Record<string, unknown> {
    switch (contentType) {
      case MessageContentType.TEXT:
        if (!text?.content) {
          throw new BadRequestException('text.content is required for text messages');
        }
        return { body: text.content };

      case MessageContentType.IMAGE:
      case MessageContentType.DOCUMENT:
      case MessageContentType.AUDIO:
        if (!media?.url) {
          throw new BadRequestException('media.url is required for media messages');
        }
        return {
          url: media.url,
          mimeType: media.mimeType,
          caption: media.caption,
          filename: media.filename,
        };

      case MessageContentType.TEMPLATE:
        if (!template?.name || !template?.language) {
          throw new BadRequestException(
            'template.name and template.language are required for template messages'
          );
        }
        return {
          name: template.name,
          language: template.language,
          variables: template.variables || {},
        };

      default:
        throw new BadRequestException(`Unsupported content type: ${contentType}`);
    }
  }

  /**
   * Transforms the message content to the format expected by the queue.
   *
   * @param contentType - The type of message content
   * @param content - The message content from buildMessageContent
   * @returns The outbound content for the queue
   */
  private buildOutboundContent(
    contentType: MessageContentType,
    content: Record<string, unknown>
  ): OutboundMessageContent {
    switch (contentType) {
      case MessageContentType.TEXT:
        return { text: content.body as string };

      case MessageContentType.IMAGE:
      case MessageContentType.VIDEO:
      case MessageContentType.AUDIO:
      case MessageContentType.DOCUMENT:
        return {
          mediaUrl: content.url as string,
          caption: content.caption as string | undefined,
          filename: content.filename as string | undefined,
        };

      case MessageContentType.TEMPLATE:
        return {
          templateName: content.name as string,
          templateLanguage: content.language as string,
          templateVariables: content.variables as TemplateVariables | undefined,
        };

      default:
        return {};
    }
  }
}
