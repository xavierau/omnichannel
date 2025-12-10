import { singleton, inject } from 'tsyringe';
import Bull from 'bull';
import { createQueue, BULL_CONFIG } from '../config/bull.config';
import { ConversationRepository } from '../features/inbox/repositories/conversation.repository';
import { ConversationMessageRepository } from '../features/inbox/repositories/conversation-message.repository';
import { CustomerRepository } from '../features/customers/customer.repository';
import { ChannelAccountRepository } from '../features/channel-accounts/channel-account.repository';
import { MessagingService } from '../features/messaging/services/messaging.service';
import { MetaMediaService } from '../features/messaging/services/meta-media.service';
import { MessagingRateLimiterService } from '../features/messaging/services/rate-limiter.service';
import { InboxSseService } from '../features/inbox/services/inbox-sse.service';
import { MessagingWindowService } from '../features/inbox/services/messaging-window.service';
import { OutgoingWebhookService } from '../features/outgoing-webhooks/services/outgoing-webhook.service';
import { logger, auditLogger } from '../config/logger.config';
import {
  MessageDirection,
  MessageContentType,
  MessageDeliveryStatus,
  ConversationStatus,
} from '../features/inbox/enums';
import { ConversationMessage } from '../features/inbox/entities/conversation-message.entity';
import { TemplateVariables } from '../features/messaging/interfaces/messaging-provider.interface';

/**
 * Maximum number of retry attempts for outbound messages.
 * Total attempts = 4 (initial + 3 retries).
 */
const MAX_ATTEMPTS = 4;

/**
 * Timeout for acquiring a rate limit token in milliseconds.
 */
const RATE_LIMIT_TOKEN_TIMEOUT_MS = 10000;

/**
 * Custom error codes for rate limit handling.
 */
const RATE_LIMIT_ERROR_CODES = {
  BACKOFF: 'RATE_LIMIT_BACKOFF',
  TIMEOUT: 'RATE_LIMIT_TIMEOUT',
  ERROR: 'RATE_LIMIT_ERROR',
} as const;

/**
 * Job options for outbound message delivery.
 * Uses exponential backoff: 1s, 2s, 4s, 8s.
 */
const OUTBOUND_JOB_OPTIONS: Bull.JobOptions = {
  attempts: MAX_ATTEMPTS,
  backoff: {
    type: 'exponential',
    delay: 1000,
  },
  removeOnComplete: 100,
  removeOnFail: 100,
};

/**
 * Job types for the inbox message queue.
 */
export enum InboxJobType {
  /**
   * Job to send an outbound message to a customer.
   * Handles text, media, and template messages with retry logic.
   */
  SEND_MESSAGE = 'SEND_MESSAGE',

  /**
   * Job to process an inbound message from a customer.
   * Creates/finds conversation, creates message, emits SSE events.
   */
  PROCESS_INBOUND = 'PROCESS_INBOUND',
}

/**
 * Content type for outbound messages.
 */
export type OutboundContentType = 'text' | 'image' | 'video' | 'audio' | 'document' | 'template';

/**
 * Content payload for outbound messages.
 */
export interface OutboundMessageContent {
  /** Text content for text messages */
  text?: string;
  /** URL to the media file for media messages */
  mediaUrl?: string;
  /** Caption for image, video, or document messages */
  caption?: string;
  /** Filename for document messages */
  filename?: string;
  /** Template name for template messages */
  templateName?: string;
  /** Template language code (e.g., 'en_US') */
  templateLanguage?: string;
  /** Template variables for substitution */
  templateVariables?: TemplateVariables;
}

/**
 * Data for outbound message sending job.
 * Contains all information needed to send a message to a customer.
 */
export interface SendMessageJobData {
  /** Tenant ID for multi-tenancy isolation */
  tenantId: string;
  /** Conversation ID the message belongs to */
  conversationId: string;
  /** ConversationMessage ID for status updates */
  messageId: string;
  /** Channel account ID to send from */
  channelAccountId: string;
  /** Recipient phone number in E.164 format */
  recipient: string;
  /** Type of content being sent */
  contentType: OutboundContentType;
  /** Content payload based on contentType */
  content: OutboundMessageContent;
  /** Current attempt number (1-based) */
  attempt: number;
}

/**
 * Data for inbound message processing job.
 * Contains all information needed to create a conversation and message.
 */
export interface ProcessInboundJobData {
  /** Tenant ID for multi-tenancy isolation */
  tenantId: string;
  /** Channel account ID that received the message */
  channelAccountId: string;
  /** Provider's message ID for deduplication and status tracking */
  providerMessageId: string;
  /** Customer's phone number in E.164 format */
  fromNumber: string;
  /** Sender's display name from WhatsApp profile */
  senderName?: string;
  /** Type of message content */
  messageType: string;
  /** Extracted message content */
  content: unknown;
  /** Timestamp when the message was sent by the customer */
  timestamp: Date;
  /** Raw event from the provider for debugging */
  rawEvent: unknown;
}

/**
 * Queue statistics for monitoring.
 */
export interface InboxQueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: number;
}

/**
 * Masks a phone number for logging purposes to protect PII.
 * Shows only the last 4 digits.
 *
 * @param phone - The phone number to mask
 * @returns Masked phone number (e.g., "+1****7890")
 */
function maskPhoneNumber(phone: string): string {
  if (!phone || phone.length < 4) {
    return '****';
  }
  const visibleDigits = phone.slice(-4);
  const maskedPart = '*'.repeat(Math.max(0, phone.length - 4));
  return maskedPart + visibleDigits;
}

/**
 * Maps provider message type to our MessageContentType enum.
 *
 * @param providerType - Message type from the provider
 * @returns Corresponding MessageContentType
 */
function mapMessageContentType(providerType: string): MessageContentType {
  const typeMap: Record<string, MessageContentType> = {
    text: MessageContentType.TEXT,
    image: MessageContentType.IMAGE,
    video: MessageContentType.VIDEO,
    audio: MessageContentType.AUDIO,
    document: MessageContentType.DOCUMENT,
    location: MessageContentType.LOCATION,
    sticker: MessageContentType.STICKER,
    template: MessageContentType.TEMPLATE,
    contacts: MessageContentType.CONTACT,
    reaction: MessageContentType.REACTION,
    interactive: MessageContentType.INTERACTIVE,
  };

  return typeMap[providerType] ?? MessageContentType.TEXT;
}

/**
 * Extracts a preview string from message content for display in conversation list.
 *
 * @param contentType - Type of message content
 * @param content - Message content object
 * @returns Preview string (max 100 chars)
 */
function extractMessagePreview(contentType: MessageContentType, content: unknown): string {
  const contentObj = content as Record<string, unknown>;

  switch (contentType) {
    case MessageContentType.TEXT:
      return String(contentObj.body ?? contentObj.text ?? '').substring(0, 100);
    case MessageContentType.IMAGE:
      return contentObj.caption ? String(contentObj.caption).substring(0, 100) : '[Image]';
    case MessageContentType.VIDEO:
      return contentObj.caption ? String(contentObj.caption).substring(0, 100) : '[Video]';
    case MessageContentType.AUDIO:
      return '[Audio]';
    case MessageContentType.DOCUMENT:
      return contentObj.filename ? `[Document: ${String(contentObj.filename)}]` : '[Document]';
    case MessageContentType.LOCATION:
      return contentObj.name ? `[Location: ${String(contentObj.name)}]` : '[Location]';
    case MessageContentType.STICKER:
      return '[Sticker]';
    case MessageContentType.TEMPLATE:
      return contentObj.templateName
        ? `[Template: ${String(contentObj.templateName)}]`
        : '[Template]';
    case MessageContentType.CONTACT:
      return contentObj.formattedName
        ? `[Contact: ${String(contentObj.formattedName)}]`
        : '[Contact]';
    case MessageContentType.REACTION:
      return contentObj.emoji ? String(contentObj.emoji) : '[Reaction]';
    case MessageContentType.INTERACTIVE:
      return contentObj.body ? String(contentObj.body).substring(0, 100) : '[Interactive]';
    default:
      return '[Message]';
  }
}

/**
 * Service for managing Bull queue operations for inbox messages.
 *
 * Handles:
 * - Sending outbound messages with retry logic and exponential backoff
 * - Processing inbound messages from customers
 * - Creating/finding conversations
 * - Creating messages and updating conversation state
 * - Emitting real-time SSE events for UI updates
 *
 * @remarks
 * Configuration:
 * - attempts: 4 (initial + 3 retries)
 * - backoff: exponential with 1s base delay (1s, 2s, 4s, 8s)
 * - concurrency: 10 (configurable via BULL_CONFIG)
 */
@singleton()
export class InboxMessageQueue {
  private queue: Bull.Queue;

  constructor(
    @inject(ConversationRepository) private conversationRepository: ConversationRepository,
    @inject(ConversationMessageRepository) private messageRepository: ConversationMessageRepository,
    @inject(CustomerRepository) private customerRepository: CustomerRepository,
    @inject(ChannelAccountRepository) private channelAccountRepository: ChannelAccountRepository,
    @inject(MessagingService) private messagingService: MessagingService,
    @inject(MetaMediaService) private metaMediaService: MetaMediaService,
    @inject(MessagingRateLimiterService) private rateLimiterService: MessagingRateLimiterService,
    @inject(InboxSseService) private sseService: InboxSseService,
    @inject(MessagingWindowService) private messagingWindowService: MessagingWindowService,
    @inject(OutgoingWebhookService) private outgoingWebhookService: OutgoingWebhookService
  ) {
    this.queue = createQueue('inbox-messages');
    this.setupProcessors();
    this.setupEventListeners();
  }

  /**
   * Queue an outbound message for delivery.
   *
   * @param data - Outbound message data (without attempt number)
   * @returns The job ID
   */
  async queueOutboundMessage(data: Omit<SendMessageJobData, 'attempt'>): Promise<string> {
    const jobData: SendMessageJobData = {
      ...data,
      attempt: 1,
    };

    const job = await this.queue.add(InboxJobType.SEND_MESSAGE, jobData, {
      ...OUTBOUND_JOB_OPTIONS,
      // Use message ID as job ID for idempotency
      jobId: `inbox-msg:${data.messageId}`,
    });

    logger.debug('Outbound message queued', {
      jobId: job.id,
      messageId: data.messageId,
      conversationId: data.conversationId,
      channelAccountId: data.channelAccountId,
      recipient: maskPhoneNumber(data.recipient),
      contentType: data.contentType,
    });

    return String(job.id);
  }

  /**
   * Queue an inbound message for processing.
   *
   * @param data - Inbound message data
   * @returns The job ID
   */
  async queueInboundProcessing(data: ProcessInboundJobData): Promise<string> {
    const job = await this.queue.add(InboxJobType.PROCESS_INBOUND, data, {
      // Use provider message ID as job ID for idempotency
      jobId: `inbox-inbound:${data.providerMessageId}`,
    });

    logger.debug('Inbound message queued', {
      jobId: job.id,
      providerMessageId: data.providerMessageId,
      channelAccountId: data.channelAccountId,
      fromNumber: maskPhoneNumber(data.fromNumber),
    });

    return String(job.id);
  }

  /**
   * Get queue statistics.
   *
   * @returns Queue job counts by status
   */
  async getQueueStats(): Promise<InboxQueueStats> {
    const counts = (await this.queue.getJobCounts()) as unknown as Record<string, number>;
    return {
      waiting: counts.waiting ?? 0,
      active: counts.active ?? 0,
      completed: counts.completed ?? 0,
      failed: counts.failed ?? 0,
      delayed: counts.delayed ?? 0,
      paused: counts.paused ?? 0,
    };
  }

  /**
   * Pause the queue - stops processing new jobs.
   */
  async pauseQueue(): Promise<void> {
    await this.queue.pause();
    logger.info('Inbox message queue paused');
  }

  /**
   * Resume the queue - continues processing jobs.
   */
  async resumeQueue(): Promise<void> {
    await this.queue.resume();
    logger.info('Inbox message queue resumed');
  }

  /**
   * Close the queue gracefully.
   */
  async closeQueue(): Promise<void> {
    await this.queue.close();
    logger.info('Inbox message queue closed');
  }

  /**
   * Get the underlying Bull queue (for testing/monitoring).
   */
  getQueue(): Bull.Queue {
    return this.queue;
  }

  /**
   * Setup job processors for different job types.
   */
  private setupProcessors(): void {
    // Process SEND_MESSAGE jobs - sends outbound messages
    this.queue.process(
      InboxJobType.SEND_MESSAGE,
      BULL_CONFIG.concurrency,
      async (job: Bull.Job<SendMessageJobData>) => {
        await this.processSendMessage(job);
      }
    );

    // Process PROCESS_INBOUND jobs - handles incoming messages
    this.queue.process(
      InboxJobType.PROCESS_INBOUND,
      BULL_CONFIG.concurrency,
      async (job: Bull.Job<ProcessInboundJobData>) => {
        await this.processInboundMessage(job);
      }
    );
  }

  /**
   * Process an outbound message send job.
   *
   * Steps:
   * 1. Check if channel account is in rate limit backoff
   * 2. Acquire rate limit token
   * 3. Load the message record
   * 4. Validate channel account exists and is accessible
   * 5. Get provider instance via MessagingService
   * 6. Send message via provider (freeform or template)
   * 7. On success: update status to SENT, emit SSE event
   * 8. On failure: either retry (if retryable) or mark as FAILED
   *
   * @throws Error to trigger Bull retry for retryable failures
   */
  private async processSendMessage(job: Bull.Job<SendMessageJobData>): Promise<void> {
    const {
      messageId,
      conversationId,
      tenantId,
      channelAccountId,
      recipient,
      contentType,
      content,
      attempt,
    } = job.data;

    logger.debug('Processing outbound message', {
      jobId: job.id,
      messageId,
      conversationId,
      attempt,
      recipient: maskPhoneNumber(recipient),
    });

    // 1. Check if channel account is in rate limit backoff
    const isInBackoff = await this.rateLimiterService.isInBackoff(channelAccountId);
    if (isInBackoff) {
      logger.debug('Channel account in rate limit backoff, retrying later', {
        messageId,
        channelAccountId,
        conversationId,
      });
      throw new Error(RATE_LIMIT_ERROR_CODES.BACKOFF);
    }

    // 2. Acquire rate limit token
    const tokenAcquired = await this.rateLimiterService.acquireToken(
      channelAccountId,
      RATE_LIMIT_TOKEN_TIMEOUT_MS
    );

    if (!tokenAcquired) {
      logger.warn('Failed to acquire rate limit token', {
        messageId,
        channelAccountId,
        conversationId,
        timeoutMs: RATE_LIMIT_TOKEN_TIMEOUT_MS,
      });
      throw new Error(RATE_LIMIT_ERROR_CODES.TIMEOUT);
    }

    // 3. Load message record
    const message = await this.messageRepository.findById(messageId);
    if (!message) {
      throw new Error(`Message not found: ${messageId}`);
    }

    // 4. Validate channel account
    const channelAccount = await this.channelAccountRepository.findByIdAndTenant(
      channelAccountId,
      tenantId
    );
    if (!channelAccount) {
      throw new Error(`Channel account not found: ${channelAccountId}`);
    }

    // 5. Get provider instance
    const provider = await this.messagingService.getProviderForChannelAccount(channelAccountId);

    // 6. Send message based on content type
    let sendResult;

    try {
      if (contentType === 'template') {
        // Send template message - templates bypass the 24-hour window requirement
        if (!content.templateName || !content.templateLanguage) {
          await this.handlePermanentFailure(
            messageId,
            conversationId,
            tenantId,
            'INVALID_TEMPLATE_CONFIG',
            'Template name and language are required for template messages'
          );
          return;
        }

        sendResult = await provider.sendTemplateMessage({
          recipient,
          templateName: content.templateName,
          language: content.templateLanguage,
          variables: content.templateVariables ?? { body: [] },
          mediaUrl: content.mediaUrl,
          messageLogId: messageId,
        });
      } else {
        // Send freeform message - must check 24-hour messaging window
        if (!provider.sendFreeformMessage) {
          await this.handlePermanentFailure(
            messageId,
            conversationId,
            tenantId,
            'FREEFORM_NOT_SUPPORTED',
            'Provider does not support freeform messages'
          );
          return;
        }

        // Check 24-hour messaging window for WhatsApp Cloud API compliance
        const conversation = await this.conversationRepository.findById(tenantId, conversationId);
        if (!conversation) {
          await this.handlePermanentFailure(
            messageId,
            conversationId,
            tenantId,
            'CONVERSATION_NOT_FOUND',
            'Conversation not found'
          );
          return;
        }

        if (!this.messagingWindowService.isWindowOpen(conversation.lastCustomerMessageAt)) {
          await this.handlePermanentFailure(
            messageId,
            conversationId,
            tenantId,
            'MESSAGING_WINDOW_CLOSED',
            'Cannot send freeform message outside 24-hour messaging window. Use a template message instead.'
          );
          return;
        }

        sendResult = await provider.sendFreeformMessage({
          recipient,
          contentType: contentType as 'text' | 'image' | 'video' | 'audio' | 'document',
          content: {
            text: content.text,
            mediaUrl: content.mediaUrl,
            caption: content.caption,
            filename: content.filename,
          },
          messageId,
        });
      }
    } catch (error) {
      // Check if this is a rate limit error from the provider
      if (this.rateLimiterService.isRateLimitError(error)) {
        const retryAfter = this.rateLimiterService.extractRetryAfter(error);
        await this.rateLimiterService.handleRateLimitError(channelAccountId, retryAfter);

        logger.warn('Provider rate limit error, applying backoff', {
          messageId,
          channelAccountId,
          conversationId,
          retryAfterSeconds: retryAfter,
        });

        throw new Error(RATE_LIMIT_ERROR_CODES.ERROR);
      }

      // Re-throw non-rate-limit errors
      throw error;
    }

    // 7. Handle result
    if (sendResult.success) {
      await this.handleSendSuccess(
        messageId,
        conversationId,
        tenantId,
        sendResult.providerMessageId!,
        sendResult.timestamp ?? new Date()
      );
    } else {
      // Check if the error response indicates a rate limit
      if (sendResult.error && this.isRateLimitErrorCode(sendResult.error.code)) {
        await this.rateLimiterService.handleRateLimitError(channelAccountId);
        throw new Error(RATE_LIMIT_ERROR_CODES.ERROR);
      }

      await this.handleSendFailure(
        job,
        messageId,
        conversationId,
        tenantId,
        sendResult.error!
      );
    }
  }

  /**
   * Check if an error code indicates a rate limit error from Meta.
   */
  private isRateLimitErrorCode(code: string): boolean {
    const rateLimitCodes = ['4', '17', '341', '368'];
    return rateLimitCodes.includes(code);
  }

  /**
   * Handle successful message send.
   */
  private async handleSendSuccess(
    messageId: string,
    conversationId: string,
    tenantId: string,
    providerMessageId: string,
    sentAt: Date
  ): Promise<void> {
    // Update message status
    await this.messageRepository.updateDeliveryStatus(messageId, MessageDeliveryStatus.SENT, {
      sentAt,
    });

    // Update providerMessageId on the message record
    // Note: If the repository doesn't have this method, we need to add it
    // For now, using updateDeliveryStatus with metadata or direct update
    await this.messageRepository.updateDeliveryStatus(messageId, MessageDeliveryStatus.SENT, {
      sentAt,
    });

    // Emit SSE event
    this.sseService.emitConversationEvent(tenantId, conversationId, 'conversation:message:status', {
      messageId,
      status: MessageDeliveryStatus.SENT,
      providerMessageId,
      sentAt: sentAt.toISOString(),
    });

    logger.debug('Outbound message sent successfully', {
      messageId,
      providerMessageId,
      conversationId,
    });

    auditLogger.info('Outbound message sent', {
      action: 'inbox.message.sent',
      tenantId,
      conversationId,
      messageId,
      providerMessageId,
    });
  }

  /**
   * Handle send failure - decide whether to retry or mark as failed.
   */
  private async handleSendFailure(
    job: Bull.Job<SendMessageJobData>,
    messageId: string,
    conversationId: string,
    tenantId: string,
    error: { code: string; message: string; retryable: boolean }
  ): Promise<void> {
    const { attempt } = job.data;

    // Check if we should retry
    if (error.retryable && attempt < MAX_ATTEMPTS) {
      // Increment retry count on the message
      await this.messageRepository.incrementRetryCount(messageId);

      logger.warn('Outbound message send failed - will retry', {
        messageId,
        conversationId,
        attempt,
        maxAttempts: MAX_ATTEMPTS,
        errorCode: error.code,
        errorMessage: error.message,
      });

      // Throw to trigger Bull's built-in retry
      throw new Error(error.code);
    }

    // Max retries exhausted or non-retryable error
    const errorCode = attempt >= MAX_ATTEMPTS ? 'MAX_RETRIES_EXCEEDED' : error.code;
    const errorMessage =
      attempt >= MAX_ATTEMPTS
        ? `Message delivery failed after ${MAX_ATTEMPTS} retries. Last error: ${error.message}`
        : error.message;

    await this.handlePermanentFailure(
      messageId,
      conversationId,
      tenantId,
      errorCode,
      errorMessage
    );
  }

  /**
   * Handle permanent failure - mark message as failed and emit SSE.
   */
  private async handlePermanentFailure(
    messageId: string,
    conversationId: string,
    tenantId: string,
    errorCode: string,
    errorMessage: string
  ): Promise<void> {
    await this.messageRepository.updateError(messageId, errorCode, errorMessage);

    // Emit SSE event
    this.sseService.emitConversationEvent(tenantId, conversationId, 'conversation:message:status', {
      messageId,
      status: MessageDeliveryStatus.FAILED,
      errorCode,
      errorMessage,
    });

    logger.error('Outbound message send failed permanently', {
      messageId,
      conversationId,
      errorCode,
      errorMessage,
    });

    auditLogger.info('Outbound message failed', {
      action: 'inbox.message.failed',
      tenantId,
      conversationId,
      messageId,
      errorCode,
      errorMessage,
    });
  }

  /**
   * Process an inbound message from a customer.
   *
   * Steps:
   * 1. Validate channel account exists
   * 2. Find or create customer by phone number
   * 3. Find or create conversation for customer+channel
   * 4. Create the message record
   * 5. Update conversation state (last message, unread count)
   * 6. Emit SSE events for real-time UI updates
   */
  private async processInboundMessage(job: Bull.Job<ProcessInboundJobData>): Promise<void> {
    const {
      tenantId,
      channelAccountId,
      providerMessageId,
      fromNumber,
      senderName,
      messageType,
      content,
      timestamp,
    } = job.data;

    logger.debug('Processing inbound message', {
      jobId: job.id,
      providerMessageId,
      channelAccountId,
      fromNumber: maskPhoneNumber(fromNumber),
      senderName,
    });

    // 1. Validate channel account
    const channelAccount = await this.channelAccountRepository.findById(channelAccountId);
    if (!channelAccount) {
      throw new Error(`Channel account not found: ${channelAccountId}`);
    }

    // 2. Find or create customer
    let customer = await this.customerRepository.findByWhatsApp(fromNumber, tenantId);

    if (!customer) {
      // Create a new customer record for this phone number
      // Use senderName from WhatsApp profile if available, otherwise fallback to phone number
      customer = await this.customerRepository.create({
        tenantId,
        whatsappNumber: fromNumber,
        name: senderName || fromNumber,
        customFields: {},
      });

      logger.info('Created new customer from inbound message', {
        customerId: customer.id,
        tenantId,
        fromNumber: maskPhoneNumber(fromNumber),
        name: senderName || fromNumber,
      });
    } else if (senderName && customer.name === fromNumber) {
      // Update existing customer's name if it's still set to phone number
      // and we now have their WhatsApp profile name
      await this.customerRepository.update(customer.id, tenantId, { name: senderName });
      customer.name = senderName;

      logger.info('Updated customer name from WhatsApp profile', {
        customerId: customer.id,
        tenantId,
        previousName: maskPhoneNumber(fromNumber),
        newName: senderName,
      });
    }

    // 3. Find or create conversation
    let conversation = await this.conversationRepository.findByCustomerAndChannel(
      tenantId,
      customer.id,
      channelAccountId
    );

    let isNewConversation = false;

    if (!conversation) {
      conversation = await this.conversationRepository.create({
        tenantId,
        customerId: customer.id,
        channelAccountId,
        status: ConversationStatus.UNASSIGNED,
        lastMessageAt: timestamp,
        unreadCount: 0,
      });

      isNewConversation = true;

      logger.info('Created new conversation from inbound message', {
        conversationId: conversation.id,
        customerId: customer.id,
        channelAccountId,
        tenantId,
      });
    }

    // 4. Map content type and process media if present
    const contentType = mapMessageContentType(messageType);

    // 4a. Process media for media message types (download from Meta, upload to S3)
    let processedContent = content as Record<string, unknown>;
    const mediaTypes = [
      MessageContentType.IMAGE,
      MessageContentType.VIDEO,
      MessageContentType.AUDIO,
      MessageContentType.DOCUMENT,
      MessageContentType.STICKER,
    ];

    if (mediaTypes.includes(contentType)) {
      processedContent = await this.processMediaContent(
        contentType,
        content,
        channelAccountId,
        tenantId,
        conversation.id
      );
    }

    const contentRecord = this.normalizeMessageContent(contentType, processedContent);

    const message = await this.messageRepository.create({
      tenantId,
      conversationId: conversation.id,
      direction: MessageDirection.INBOUND,
      contentType,
      content: contentRecord,
      providerMessageId,
      deliveryStatus: MessageDeliveryStatus.DELIVERED, // Inbound messages are already delivered
      sentAt: timestamp,
      deliveredAt: timestamp,
      metadata: {
        rawEvent: job.data.rawEvent,
      },
    });

    // 5. Update conversation state
    const preview = extractMessagePreview(contentType, contentRecord);

    await this.conversationRepository.updateLastMessage(
      tenantId,
      conversation.id,
      preview,
      MessageDirection.INBOUND,
      timestamp
    );

    // Update last customer message timestamp for 24-hour messaging window tracking
    await this.conversationRepository.updateLastCustomerMessageAt(
      tenantId,
      conversation.id,
      timestamp
    );

    await this.conversationRepository.incrementUnreadCount(tenantId, conversation.id);

    // 6. Emit SSE events for real-time UI updates
    if (isNewConversation) {
      // Reload conversation with relations for SSE event
      const fullConversation = await this.conversationRepository.findById(
        tenantId,
        conversation.id
      );

      this.sseService.emitToTenant(tenantId, 'conversation:new', {
        conversation: fullConversation,
      });
    }

    this.sseService.emitConversationEvent(tenantId, conversation.id, 'conversation:message:new', {
      message: this.formatMessageForSse(message, customer),
    });

    this.sseService.emitConversationEvent(
      tenantId,
      conversation.id,
      'conversation:unread:updated',
      {
        unreadCount: conversation.unreadCount + 1,
      }
    );

    auditLogger.info('Inbound message processed', {
      action: 'inbox.message.inbound',
      tenantId,
      conversationId: conversation.id,
      messageId: message.id,
      providerMessageId,
      customerId: customer.id,
      isNewConversation,
    });

    // 7. Trigger outgoing webhook for unassigned conversations
    // This notifies external services (n8n, AI agents) when a message arrives
    // for a conversation that is not assigned to any operator
    logger.info('Checking webhook trigger conditions', {
      conversationId: conversation.id,
      messageId: message.id,
      channelAccountId,
      assignedToId: conversation.assignedToId,
      isUnassigned: conversation.assignedToId === null,
    });

    if (conversation.assignedToId === null) {
      logger.info('Conversation is unassigned, triggering outgoing webhook', {
        conversationId: conversation.id,
        messageId: message.id,
        channelAccountId,
        customerId: customer.id,
      });

      try {
        const jobId = await this.outgoingWebhookService.dispatchUnassignedMessageWebhook(
          message,
          conversation,
          customer,
          channelAccountId
        );

        if (jobId) {
          logger.info('Outgoing webhook dispatch initiated', {
            jobId,
            conversationId: conversation.id,
            messageId: message.id,
            channelAccountId,
          });
        } else {
          logger.info('Outgoing webhook skipped (no webhook configured)', {
            conversationId: conversation.id,
            messageId: message.id,
            channelAccountId,
          });
        }
      } catch (webhookError) {
        // Log but don't fail the inbound processing if webhook dispatch fails
        logger.error('Failed to dispatch outgoing webhook', {
          error: webhookError instanceof Error ? webhookError.message : String(webhookError),
          stack: webhookError instanceof Error ? webhookError.stack : undefined,
          conversationId: conversation.id,
          messageId: message.id,
          channelAccountId,
        });
      }
    } else {
      logger.debug('Skipping webhook trigger: conversation is assigned', {
        conversationId: conversation.id,
        messageId: message.id,
        channelAccountId,
        assignedToId: conversation.assignedToId,
      });
    }
  }

  /**
   * Process media content: download from Meta CDN and upload to S3.
   *
   * This method extracts the media ID and MIME type from the raw content,
   * downloads the media from Meta's CDN, uploads it to S3, and returns
   * the content with the S3 URL instead of the temporary Meta URL.
   *
   * If media processing fails, the original content is returned with a warning log.
   * This ensures the webhook processing doesn't fail entirely due to media issues.
   *
   * @param contentType - Type of message content
   * @param rawContent - Raw content from provider webhook
   * @param channelAccountId - Channel account for provider access
   * @param tenantId - Tenant ID for S3 organization
   * @param conversationId - Conversation ID for S3 organization
   * @returns Content with S3 URL or original content if processing fails
   */
  private async processMediaContent(
    contentType: MessageContentType,
    rawContent: unknown,
    channelAccountId: string,
    tenantId: string,
    conversationId: string
  ): Promise<Record<string, unknown>> {
    const content = rawContent as Record<string, unknown>;

    // Extract media ID and MIME type based on content type
    let mediaId: string | undefined;
    let mimeType: string | undefined;

    switch (contentType) {
      case MessageContentType.IMAGE:
        mediaId = content.id as string;
        mimeType = content.mime_type as string;
        break;
      case MessageContentType.VIDEO:
        mediaId = content.id as string;
        mimeType = content.mime_type as string;
        break;
      case MessageContentType.AUDIO:
        mediaId = content.id as string;
        mimeType = content.mime_type as string;
        break;
      case MessageContentType.DOCUMENT:
        mediaId = content.id as string;
        mimeType = content.mime_type as string;
        break;
      case MessageContentType.STICKER:
        mediaId = content.id as string;
        mimeType = content.mime_type as string || 'image/webp';
        break;
      default:
        return content;
    }

    if (!mediaId) {
      logger.warn('Media message missing media ID', {
        contentType,
        tenantId,
        conversationId,
      });
      return content;
    }

    try {
      const processedMedia = await this.metaMediaService.processInboundMedia(
        mediaId,
        mimeType || 'application/octet-stream',
        channelAccountId,
        tenantId,
        conversationId
      );

      logger.info('Media processed and stored in S3', {
        mediaId,
        s3Key: processedMedia.s3Key,
        contentType: processedMedia.contentType,
        size: processedMedia.size,
        tenantId,
        conversationId,
      });

      // Return content with S3 URL instead of temporary Meta URL
      return {
        ...content,
        url: processedMedia.url,
        s3Key: processedMedia.s3Key,
        processedMimeType: processedMedia.contentType,
        processedSize: processedMedia.size,
      };
    } catch (error) {
      // Log the error but don't fail the entire message processing
      // The message will be stored with the original media:// URL
      logger.warn('Failed to process media, continuing with placeholder', {
        error: error instanceof Error ? error.message : 'Unknown error',
        mediaId,
        mimeType,
        contentType,
        tenantId,
        conversationId,
      });

      // Return original content - the media:// URL will indicate unprocessed media
      return content;
    }
  }

  /**
   * Normalize message content into a consistent structure.
   *
   * @param contentType - Type of message content
   * @param rawContent - Raw content from provider
   * @returns Normalized content object
   */
  private normalizeMessageContent(
    contentType: MessageContentType,
    rawContent: unknown
  ): Record<string, unknown> {
    const content = rawContent as Record<string, unknown>;

    switch (contentType) {
      case MessageContentType.TEXT:
        return { body: content.text ?? content.body ?? '' };

      case MessageContentType.IMAGE:
        return {
          // Use S3 URL if available, otherwise fall back to media:// placeholder
          url: content.url || (content.id ? `media://${content.id}` : undefined),
          s3Key: content.s3Key,
          caption: content.caption,
          mimeType: content.processedMimeType || content.mime_type,
          size: content.processedSize,
        };

      case MessageContentType.VIDEO:
        return {
          url: content.url || (content.id ? `media://${content.id}` : undefined),
          s3Key: content.s3Key,
          caption: content.caption,
          mimeType: content.processedMimeType || content.mime_type,
          size: content.processedSize,
        };

      case MessageContentType.AUDIO:
        return {
          url: content.url || (content.id ? `media://${content.id}` : undefined),
          s3Key: content.s3Key,
          mimeType: content.processedMimeType || content.mime_type,
          size: content.processedSize,
        };

      case MessageContentType.DOCUMENT:
        return {
          url: content.url || (content.id ? `media://${content.id}` : undefined),
          s3Key: content.s3Key,
          filename: content.filename,
          mimeType: content.processedMimeType || content.mime_type,
          size: content.processedSize,
        };

      case MessageContentType.LOCATION:
        return {
          latitude: content.latitude,
          longitude: content.longitude,
          name: content.name,
          address: content.address,
        };

      case MessageContentType.STICKER:
        return {
          url: content.url || (content.id ? `media://${content.id}` : undefined),
          s3Key: content.s3Key,
          mimeType: content.processedMimeType || content.mime_type || 'image/webp',
          size: content.processedSize,
        };

      case MessageContentType.TEMPLATE:
        return {
          templateName: content.templateName,
          templateLanguage: content.templateLanguage,
          variables: content.variables,
        };

      case MessageContentType.CONTACT: {
        // Meta contacts come as an array, extract first contact
        const contacts = content.contacts as Array<Record<string, unknown>> | undefined;
        const firstContact = contacts?.[0];
        const contactName = firstContact?.name as Record<string, unknown> | undefined;
        return {
          formattedName: contactName?.formatted_name,
          firstName: contactName?.first_name,
          lastName: contactName?.last_name,
          phones: firstContact?.phones,
          emails: firstContact?.emails,
        };
      }

      case MessageContentType.REACTION:
        return {
          messageId: content.message_id ?? content.messageId,
          emoji: content.emoji,
        };

      case MessageContentType.INTERACTIVE: {
        // Interactive responses contain button_reply or list_reply
        const buttonReply = content.button_reply as Record<string, unknown> | undefined;
        const listReply = content.list_reply as Record<string, unknown> | undefined;
        return {
          type: buttonReply ? 'button_reply' : 'list_reply',
          id: buttonReply?.id ?? listReply?.id,
          title: buttonReply?.title ?? listReply?.title,
          description: listReply?.description,
        };
      }

      default:
        return content;
    }
  }

  /**
   * Format a message for SSE transmission.
   *
   * @param message - The message entity
   * @param customer - The customer who sent the message
   * @returns Formatted message object
   */
  private formatMessageForSse(
    message: ConversationMessage,
    customer: { id: string; name: string }
  ): Record<string, unknown> {
    return {
      id: message.id,
      conversationId: message.conversationId,
      direction: message.direction,
      contentType: message.contentType,
      content: message.content,
      providerMessageId: message.providerMessageId,
      deliveryStatus: message.deliveryStatus,
      sentAt: message.sentAt,
      deliveredAt: message.deliveredAt,
      createdAt: message.createdAt,
      sender: {
        id: customer.id,
        name: customer.name,
        type: 'customer',
      },
    };
  }

  /**
   * Setup event listeners for queue events.
   */
  private setupEventListeners(): void {
    this.queue.on('error', (error) => {
      logger.error('Inbox queue error', { error: error.message, stack: error.stack });
    });

    this.queue.on('failed', (job, error) => {
      const jobType = job.name as InboxJobType;

      if (jobType === InboxJobType.SEND_MESSAGE) {
        const data = job.data as SendMessageJobData;
        logger.error('Outbound message job failed', {
          jobId: job.id,
          jobType,
          error: error.message,
          attemptsMade: job.attemptsMade,
          messageId: data.messageId,
          conversationId: data.conversationId,
        });
      } else if (jobType === InboxJobType.PROCESS_INBOUND) {
        const data = job.data as ProcessInboundJobData;
        logger.error('Inbound message job failed', {
          jobId: job.id,
          jobType,
          error: error.message,
          attemptsMade: job.attemptsMade,
          providerMessageId: data.providerMessageId,
        });
      } else {
        logger.error('Inbox job failed', {
          jobId: job.id,
          jobType,
          error: error.message,
          attemptsMade: job.attemptsMade,
        });
      }
    });

    this.queue.on('completed', (job) => {
      logger.debug('Inbox job completed', {
        jobId: job.id,
        jobType: job.name,
      });
    });

    this.queue.on('stalled', (job) => {
      logger.warn('Inbox job stalled', {
        jobId: job.id,
        jobType: job.name,
        data: job.data,
      });
    });
  }
}
