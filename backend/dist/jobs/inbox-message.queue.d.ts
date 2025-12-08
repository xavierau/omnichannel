import Bull from 'bull';
import { ConversationRepository } from '../features/inbox/repositories/conversation.repository';
import { ConversationMessageRepository } from '../features/inbox/repositories/conversation-message.repository';
import { CustomerRepository } from '../features/customers/customer.repository';
import { ChannelAccountRepository } from '../features/channel-accounts/channel-account.repository';
import { MessagingService } from '../features/messaging/services/messaging.service';
import { MetaMediaService } from '../features/messaging/services/meta-media.service';
import { MessagingRateLimiterService } from '../features/messaging/services/rate-limiter.service';
import { InboxSseService } from '../features/inbox/services/inbox-sse.service';
import { MessagingWindowService } from '../features/inbox/services/messaging-window.service';
import { TemplateVariables } from '../features/messaging/interfaces/messaging-provider.interface';
/**
 * Job types for the inbox message queue.
 */
export declare enum InboxJobType {
    /**
     * Job to send an outbound message to a customer.
     * Handles text, media, and template messages with retry logic.
     */
    SEND_MESSAGE = "SEND_MESSAGE",
    /**
     * Job to process an inbound message from a customer.
     * Creates/finds conversation, creates message, emits SSE events.
     */
    PROCESS_INBOUND = "PROCESS_INBOUND"
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
export declare class InboxMessageQueue {
    private conversationRepository;
    private messageRepository;
    private customerRepository;
    private channelAccountRepository;
    private messagingService;
    private metaMediaService;
    private rateLimiterService;
    private sseService;
    private messagingWindowService;
    private queue;
    constructor(conversationRepository: ConversationRepository, messageRepository: ConversationMessageRepository, customerRepository: CustomerRepository, channelAccountRepository: ChannelAccountRepository, messagingService: MessagingService, metaMediaService: MetaMediaService, rateLimiterService: MessagingRateLimiterService, sseService: InboxSseService, messagingWindowService: MessagingWindowService);
    /**
     * Queue an outbound message for delivery.
     *
     * @param data - Outbound message data (without attempt number)
     * @returns The job ID
     */
    queueOutboundMessage(data: Omit<SendMessageJobData, 'attempt'>): Promise<string>;
    /**
     * Queue an inbound message for processing.
     *
     * @param data - Inbound message data
     * @returns The job ID
     */
    queueInboundProcessing(data: ProcessInboundJobData): Promise<string>;
    /**
     * Get queue statistics.
     *
     * @returns Queue job counts by status
     */
    getQueueStats(): Promise<InboxQueueStats>;
    /**
     * Pause the queue - stops processing new jobs.
     */
    pauseQueue(): Promise<void>;
    /**
     * Resume the queue - continues processing jobs.
     */
    resumeQueue(): Promise<void>;
    /**
     * Close the queue gracefully.
     */
    closeQueue(): Promise<void>;
    /**
     * Get the underlying Bull queue (for testing/monitoring).
     */
    getQueue(): Bull.Queue;
    /**
     * Setup job processors for different job types.
     */
    private setupProcessors;
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
    private processSendMessage;
    /**
     * Check if an error code indicates a rate limit error from Meta.
     */
    private isRateLimitErrorCode;
    /**
     * Handle successful message send.
     */
    private handleSendSuccess;
    /**
     * Handle send failure - decide whether to retry or mark as failed.
     */
    private handleSendFailure;
    /**
     * Handle permanent failure - mark message as failed and emit SSE.
     */
    private handlePermanentFailure;
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
    private processInboundMessage;
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
    private processMediaContent;
    /**
     * Normalize message content into a consistent structure.
     *
     * @param contentType - Type of message content
     * @param rawContent - Raw content from provider
     * @returns Normalized content object
     */
    private normalizeMessageContent;
    /**
     * Format a message for SSE transmission.
     *
     * @param message - The message entity
     * @param customer - The customer who sent the message
     * @returns Formatted message object
     */
    private formatMessageForSse;
    /**
     * Setup event listeners for queue events.
     */
    private setupEventListeners;
}
