import { singleton, inject } from 'tsyringe';
import { ChannelAccountRepository } from '../../channel-accounts/channel-account.repository';
import { OutgoingWebhookQueue } from '../../../jobs/outgoing-webhook.queue';
import { logger } from '../../../config/logger.config';
import {
  OutgoingWebhookPayload,
  WebhookDispatchJobData,
} from '../interfaces/webhook-payload.interface';
import { ConversationMessage } from '../../inbox/entities/conversation-message.entity';
import { Conversation } from '../../inbox/entities/conversation.entity';
import { Customer } from '../../customers/customer.entity';
import { ChannelAccount } from '../../channel-accounts/channel-account.entity';

/**
 * Parameters for webhook dispatch.
 */
export interface MaybeDispatchWebhookParams {
  /** The message that triggered the event */
  message: ConversationMessage;
  /** The conversation the message belongs to */
  conversation: Conversation;
  /** The customer who sent the message */
  customer: Customer;
  /** The channel account that received the message */
  channelAccount: ChannelAccount;
}

/**
 * Service for managing outgoing webhook notifications.
 *
 * Handles the business logic for determining when to dispatch webhooks
 * and building the payload from domain entities.
 *
 * @remarks
 * Webhooks are only dispatched when:
 * 1. The channel account has a configured webhookUrl
 * 2. The channel account has encrypted webhook secret configured
 * 3. The conversation is unassigned (status = 'unassigned')
 */
@singleton()
export class OutgoingWebhookService {
  constructor(
    @inject(ChannelAccountRepository)
    private readonly channelAccountRepository: ChannelAccountRepository,
    @inject(OutgoingWebhookQueue)
    private readonly webhookQueue: OutgoingWebhookQueue
  ) {}

  /**
   * Maybe dispatch a webhook for an unassigned message event.
   *
   * Checks if the channel account has webhook configuration and queues
   * a dispatch job if so. Does nothing if webhook is not configured.
   *
   * @param params - Message, conversation, customer, and channel account
   * @returns The job ID if queued, undefined if skipped
   */
  async maybeDispatchWebhook(params: MaybeDispatchWebhookParams): Promise<string | undefined> {
    const { message, conversation, customer, channelAccount } = params;

    // Check if webhook URL is configured
    if (!channelAccount.webhookUrl) {
      logger.debug('Skipping webhook dispatch: no webhook URL configured', {
        channelAccountId: channelAccount.id,
        messageId: message.id,
      });
      return undefined;
    }

    // Check if webhook secret is configured
    if (!channelAccount.webhookSecretEncrypted || !channelAccount.webhookSecretIv) {
      logger.warn('Skipping webhook dispatch: webhook URL configured but no secret', {
        channelAccountId: channelAccount.id,
        messageId: message.id,
      });
      return undefined;
    }

    // Build payload
    const payload = this.buildPayload(message, conversation, customer, channelAccount);

    // Build job data
    const jobData: WebhookDispatchJobData = {
      webhookUrl: channelAccount.webhookUrl,
      payload,
      secretEncrypted: channelAccount.webhookSecretEncrypted,
      secretIv: channelAccount.webhookSecretIv,
      channelAccountId: channelAccount.id,
      tenantId: channelAccount.tenantId,
    };

    // Queue the dispatch
    const jobId = await this.webhookQueue.queueDispatch(jobData);

    logger.info('Queued outgoing webhook dispatch', {
      jobId,
      event: payload.event,
      messageId: message.id,
      conversationId: conversation.id,
      channelAccountId: channelAccount.id,
    });

    return jobId;
  }

  /**
   * Dispatch webhook for a message received on an unassigned conversation.
   *
   * This is the main entry point for inbound message webhook dispatch.
   * Fetches the full channel account and delegates to maybeDispatchWebhook.
   *
   * @param message - The inbound message
   * @param conversation - The conversation
   * @param customer - The customer
   * @param channelAccountId - ID of the channel account
   * @returns The job ID if queued, undefined if skipped
   */
  async dispatchUnassignedMessageWebhook(
    message: ConversationMessage,
    conversation: Conversation,
    customer: Customer,
    channelAccountId: string
  ): Promise<string | undefined> {
    // Fetch channel account with all fields
    const channelAccount = await this.channelAccountRepository.findById(channelAccountId);

    if (!channelAccount) {
      logger.error('Channel account not found for webhook dispatch', {
        channelAccountId,
        messageId: message.id,
      });
      return undefined;
    }

    return this.maybeDispatchWebhook({
      message,
      conversation,
      customer,
      channelAccount,
    });
  }

  /**
   * Build the webhook payload from domain entities.
   */
  private buildPayload(
    message: ConversationMessage,
    conversation: Conversation,
    customer: Customer,
    channelAccount: ChannelAccount
  ): OutgoingWebhookPayload {
    return {
      event: 'message.received.unassigned',
      timestamp: new Date().toISOString(),
      message: {
        id: message.id,
        providerMessageId: message.providerMessageId || '',
        contentType: message.contentType,
        content: message.content,
        receivedAt: message.sentAt?.toISOString() || message.createdAt.toISOString(),
      },
      conversation: {
        id: conversation.id,
        status: conversation.status,
        createdAt: conversation.createdAt.toISOString(),
        lastMessageAt: conversation.lastMessageAt?.toISOString() || null,
      },
      customer: {
        id: customer.id,
        name: customer.name,
        whatsappNumber: customer.whatsappNumber,
        customFields: customer.customFields || {},
      },
      channelAccount: {
        id: channelAccount.id,
        name: channelAccount.name,
        phoneNumber: channelAccount.phoneNumber,
      },
      tenantId: channelAccount.tenantId,
    };
  }
}
