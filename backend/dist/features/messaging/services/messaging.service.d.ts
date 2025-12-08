import { ProviderFactory } from '../provider-factory';
import { MessageLogRepository } from '../../message-logs/message-log.repository';
import { ChannelAccountRepository } from '../../channel-accounts/channel-account.repository';
import { TemplateVariables, IMessagingProvider } from '../interfaces/messaging-provider.interface';
/**
 * Request to send a template message via MessagingService.
 */
export interface SendTemplateMessageRequest {
    tenantId: string;
    channelAccountId: string;
    recipient: string;
    templateName: string;
    language: string;
    variables: TemplateVariables;
    broadcastId?: string;
    customerId?: string;
    mediaUrl?: string;
}
/**
 * Result of sending a template message.
 */
export interface SendTemplateMessageResult {
    success: boolean;
    messageLogId: string;
    providerMessageId?: string;
    error?: {
        code: string;
        message: string;
        retryable: boolean;
    };
}
/**
 * Request to send a batch of template messages.
 */
export interface SendBatchRequest {
    tenantId: string;
    channelAccountId: string;
    templateName: string;
    language: string;
    broadcastId?: string;
    recipients: Array<{
        recipient: string;
        customerId?: string;
        variables: TemplateVariables;
    }>;
}
/**
 * Result of sending a batch.
 */
export interface SendBatchResult {
    totalRequested: number;
    successful: number;
    failed: number;
    results: SendTemplateMessageResult[];
}
/**
 * MessagingService orchestrates message sending through providers.
 *
 * This is the main entry point for sending messages. It:
 * 1. Creates message log entries for tracking
 * 2. Resolves the appropriate provider via ProviderFactory
 * 3. Sends messages through the provider
 * 4. Updates message log with results
 */
export declare class MessagingService {
    private providerFactory;
    private messageLogRepo;
    private channelAccountRepo;
    constructor(providerFactory: ProviderFactory, messageLogRepo: MessageLogRepository, channelAccountRepo: ChannelAccountRepository);
    /**
     * Send a single template message.
     *
     * @param request - Message request details
     * @returns Result with message log ID and status
     */
    sendTemplateMessage(request: SendTemplateMessageRequest): Promise<SendTemplateMessageResult>;
    /**
     * Send a batch of template messages.
     *
     * Note: This sends messages sequentially. For high-volume broadcasts,
     * use the BroadcastQueue which processes messages in parallel workers.
     *
     * @param request - Batch request with recipients
     * @returns Aggregated results
     */
    sendBatch(request: SendBatchRequest): Promise<SendBatchResult>;
    /**
     * Verify credentials for a channel account.
     *
     * @param channelAccountId - Channel account to verify
     * @param tenantId - Tenant ID for authorization
     * @returns Verification result
     */
    verifyChannelAccountCredentials(channelAccountId: string, tenantId: string): Promise<{
        valid: boolean;
        error?: string;
        accountInfo?: Record<string, unknown>;
    }>;
    /**
     * Get templates from provider for a channel account.
     *
     * @param channelAccountId - Channel account ID
     * @param tenantId - Tenant ID for authorization
     * @returns List of templates from provider
     */
    getProviderTemplates(channelAccountId: string, tenantId: string): Promise<{
        success: boolean;
        templates?: unknown[];
        error?: string;
    }>;
    /**
     * Get a provider instance for a channel account (for advanced use cases).
     *
     * @param channelAccountId - Channel account ID
     * @returns Initialized provider instance
     */
    getProviderForChannelAccount(channelAccountId: string): Promise<IMessagingProvider>;
    /**
     * Get a provider instance for a tenant's default channel account.
     *
     * @param tenantId - Tenant ID
     * @param channelCode - Channel code (e.g., 'whatsapp')
     * @returns Initialized provider instance
     */
    getProviderForTenantChannel(tenantId: string, channelCode: string): Promise<IMessagingProvider>;
    /**
     * Create a message log entry for tracking.
     */
    private createMessageLog;
}
