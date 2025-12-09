import { Request, Response } from 'express';
import { inject, singleton } from 'tsyringe';
import { ConversationService } from './services/conversation.service';
import { InboxNoteService } from './services/inbox-note.service';
import { ConversationMessageRepository } from './repositories/conversation-message.repository';
import { asyncHandler } from '@middleware/async-handler';
import { BadRequestException } from '@shared/exceptions/http-exceptions';
import { User } from '@features/users/user.entity';
import { ConversationQueryOptions } from './repositories/conversation.repository';
import { MessageContentType, MessageDirection, MessageDeliveryStatus, NoteScope } from './enums';
import {
  InboxMessageQueue,
  OutboundMessageContent,
  OutboundContentType,
} from '../../jobs/inbox-message.queue';
import { TemplateVariables } from '../messaging/interfaces/messaging-provider.interface';

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
@singleton()
export class InboxController {
  constructor(
    @inject(ConversationService) private conversationService: ConversationService,
    @inject(InboxNoteService) private noteService: InboxNoteService,
    @inject(ConversationMessageRepository) private messageRepository: ConversationMessageRepository,
    @inject(InboxMessageQueue) private inboxMessageQueue: InboxMessageQueue
  ) {}

  // ============================================================================
  // Operator Listing
  // ============================================================================

  /**
   * GET /operators
   * List operators (users) available for conversation assignment.
   * Returns users who belong to active teams within the tenant.
   */
  listOperators = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;

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
  listConversations = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const user = req.user as User;
    const validatedQuery = (req as Request & { validatedQuery?: Record<string, unknown> }).validatedQuery;

    const options: ConversationQueryOptions = {
      statuses: validatedQuery?.status as ConversationQueryOptions['statuses'],
      search: validatedQuery?.search as string | undefined,
      page: (validatedQuery?.page as number) || 1,
      limit: (validatedQuery?.limit as number) || 20,
      sortBy: (validatedQuery?.sortBy as string) || 'lastMessageAt',
      sortOrder: (validatedQuery?.sortOrder as 'asc' | 'desc') || 'desc',
    };

    const result = await this.conversationService.listConversations(
      tenantId,
      user.id,
      options
    );

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
  getConversation = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const user = req.user as User;
    const { id } = req.params;

    const conversation = await this.conversationService.getConversation(
      tenantId,
      user.id,
      id
    );

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
  getMessages = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const user = req.user as User;
    const { id: conversationId } = req.params;
    const validatedQuery = (req as Request & { validatedQuery?: Record<string, unknown> }).validatedQuery;

    // Validate access to the conversation
    await this.conversationService.validateAccess(tenantId, user.id, conversationId);

    const result = await this.messageRepository.findByConversation(conversationId, {
      page: (validatedQuery?.page as number) || 1,
      limit: (validatedQuery?.limit as number) || 50,
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
  sendMessage = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const user = req.user as User;
    const { id: conversationId } = req.params;
    const { contentType, text, media, template } = req.body;

    // Get conversation with customer info (also validates access)
    const conversation = await this.conversationService.getConversation(tenantId, user.id, conversationId);

    if (!conversation.customer) {
      throw new BadRequestException('Cannot send message: conversation has no associated customer');
    }

    // Validate content based on type
    const content = this.buildMessageContent(contentType, text, media, template);

    // Create the message record
    const message = await this.messageRepository.create({
      tenantId,
      conversationId,
      direction: MessageDirection.OUTBOUND,
      contentType,
      content,
      sentById: user.id,
      deliveryStatus: MessageDeliveryStatus.PENDING,
    });

    // Build outbound content for the queue
    const outboundContent = this.buildOutboundContent(contentType, content);

    // Queue message for delivery to the messaging provider
    await this.inboxMessageQueue.queueOutboundMessage({
      tenantId,
      conversationId,
      messageId: message.id,
      channelAccountId: conversation.channelAccountId,
      recipient: conversation.customer.whatsappNumber,
      contentType: contentType as OutboundContentType,
      content: outboundContent,
    });

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
  pickupConversation = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const user = req.user as User;
    const { id: conversationId } = req.params;

    const conversation = await this.conversationService.pickupConversation(
      tenantId,
      conversationId,
      user.id
    );

    res.json({
      data: conversation,
    });
  });

  /**
   * POST /conversations/:id/release
   * Release a conversation back to the unassigned pool.
   * Only the assigned operator can release a conversation.
   */
  releaseConversation = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const user = req.user as User;
    const { id: conversationId } = req.params;

    const conversation = await this.conversationService.releaseConversation(
      tenantId,
      conversationId,
      user.id
    );

    res.json({
      data: conversation,
    });
  });

  /**
   * POST /conversations/:id/assign
   * Assign a conversation to another user.
   * Requires inbox:assign:all permission.
   */
  assignConversation = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const user = req.user as User;
    const { id: conversationId } = req.params;
    const { userId: targetUserId } = req.body;

    const conversation = await this.conversationService.assignConversation(
      tenantId,
      conversationId,
      targetUserId,
      user.id
    );

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
  updateStatus = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const user = req.user as User;
    const { id: conversationId } = req.params;
    const { status } = req.body;

    const conversation = await this.conversationService.updateStatus(
      tenantId,
      conversationId,
      user.id,
      status
    );

    res.json({
      data: conversation,
    });
  });

  /**
   * PATCH /conversations/:id/mark-read
   * Mark a conversation as read by resetting the unread count.
   */
  markAsRead = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const user = req.user as User;
    const { id: conversationId } = req.params;

    const conversation = await this.conversationService.markAsRead(
      tenantId,
      conversationId,
      user.id
    );

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
  getNotes = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const user = req.user as User;
    const { id: conversationId } = req.params;
    const scope = req.query.scope as NoteScope | undefined;

    const notes = await this.noteService.getNotes(
      tenantId,
      conversationId,
      user.id,
      scope
    );

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
  createNote = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const user = req.user as User;
    const { id: conversationId } = req.params;
    const { content, scope, mentions } = req.body;

    const note = await this.noteService.createNote(
      tenantId,
      conversationId,
      user.id,
      { content, scope, mentions }
    );

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
  updateNote = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const user = req.user as User;
    const { id: noteId } = req.params;
    const { content, mentions } = req.body;

    const note = await this.noteService.updateNote(
      tenantId,
      noteId,
      user.id,
      { content, mentions }
    );

    res.json({
      data: note,
    });
  });

  /**
   * DELETE /notes/:id
   * Delete a note.
   * Only the note creator can delete their notes.
   */
  deleteNote = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const user = req.user as User;
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
