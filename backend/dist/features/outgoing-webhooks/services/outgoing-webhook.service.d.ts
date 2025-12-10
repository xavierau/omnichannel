import { ChannelAccountRepository } from '../../channel-accounts/channel-account.repository';
import { OutgoingWebhookQueue } from '../../../jobs/outgoing-webhook.queue';
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
export declare class OutgoingWebhookService {
    private readonly channelAccountRepository;
    private readonly webhookQueue;
    constructor(channelAccountRepository: ChannelAccountRepository, webhookQueue: OutgoingWebhookQueue);
    /**
     * Maybe dispatch a webhook for an unassigned message event.
     *
     * Checks if the channel account has webhook configuration and queues
     * a dispatch job if so. Does nothing if webhook is not configured.
     *
     * @param params - Message, conversation, customer, and channel account
     * @returns The job ID if queued, undefined if skipped
     */
    maybeDispatchWebhook(params: MaybeDispatchWebhookParams): Promise<string | undefined>;
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
    dispatchUnassignedMessageWebhook(message: ConversationMessage, conversation: Conversation, customer: Customer, channelAccountId: string): Promise<string | undefined>;
    /**
     * Build the webhook payload from domain entities.
     */
    private buildPayload;
}
