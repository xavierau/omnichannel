import { singleton, inject } from 'tsyringe';
import { ProviderFactory } from '../provider-factory';
import { MessageLogRepository, CreateMessageLogData } from '../../message-logs/message-log.repository';
import { ChannelAccountRepository } from '../../channel-accounts/channel-account.repository';
import {
  SendTemplateRequest,
  TemplateVariables,
  IMessagingProvider,
} from '../interfaces/messaging-provider.interface';
import { MessageLog, MessageStatus } from '../../message-logs/message-log.entity';
import { ChannelAccount } from '../../channel-accounts/channel-account.entity';
import { logger } from '../../../config/logger.config';

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
@singleton()
export class MessagingService {
  constructor(
    @inject(ProviderFactory) private providerFactory: ProviderFactory,
    @inject(MessageLogRepository) private messageLogRepo: MessageLogRepository,
    @inject(ChannelAccountRepository) private channelAccountRepo: ChannelAccountRepository
  ) {}

  /**
   * Send a single template message.
   *
   * @param request - Message request details
   * @returns Result with message log ID and status
   */
  async sendTemplateMessage(
    request: SendTemplateMessageRequest
  ): Promise<SendTemplateMessageResult> {
    // 1. Validate channel account exists and belongs to tenant
    const channelAccount = await this.channelAccountRepo.findByIdAndTenant(
      request.channelAccountId,
      request.tenantId
    );

    if (!channelAccount) {
      return {
        success: false,
        messageLogId: '',
        error: {
          code: 'CHANNEL_ACCOUNT_NOT_FOUND',
          message: `Channel account '${request.channelAccountId}' not found for tenant`,
          retryable: false,
        },
      };
    }

    if (!channelAccount.isActive) {
      return {
        success: false,
        messageLogId: '',
        error: {
          code: 'CHANNEL_ACCOUNT_INACTIVE',
          message: `Channel account '${channelAccount.name}' is not active`,
          retryable: false,
        },
      };
    }

    // 2. Create message log entry
    const messageLog = await this.createMessageLog(request, channelAccount);

    // 3. Get initialized provider
    let provider: IMessagingProvider;
    try {
      provider = await this.providerFactory.createProviderForChannelAccount(
        request.channelAccountId
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.messageLogRepo.updateStatus(messageLog.id, MessageStatus.FAILED, {
        errorMessage,
        errorCode: 'PROVIDER_INIT_FAILED',
      });

      logger.error('Failed to initialize provider', {
        channelAccountId: request.channelAccountId,
        error: errorMessage,
        messageLogId: messageLog.id,
      });

      return {
        success: false,
        messageLogId: messageLog.id,
        error: {
          code: 'PROVIDER_INIT_FAILED',
          message: errorMessage,
          retryable: false,
        },
      };
    }

    // 4. Update status to queued
    await this.messageLogRepo.updateStatus(messageLog.id, MessageStatus.QUEUED);

    // 5. Send message via provider
    const providerRequest: SendTemplateRequest = {
      recipient: request.recipient,
      templateName: request.templateName,
      language: request.language,
      variables: request.variables,
      mediaUrl: request.mediaUrl,
      messageLogId: messageLog.id,
    };

    const response = await provider.sendTemplateMessage(providerRequest);

    // 6. Update message log based on response
    if (response.success) {
      await this.messageLogRepo.updateStatus(messageLog.id, MessageStatus.SENT, {
        providerMessageId: response.providerMessageId,
        providerResponse: response.rawResponse as Record<string, unknown>,
      });

      logger.info('Template message sent successfully', {
        messageLogId: messageLog.id,
        providerMessageId: response.providerMessageId,
        recipient: request.recipient,
        templateName: request.templateName,
      });

      return {
        success: true,
        messageLogId: messageLog.id,
        providerMessageId: response.providerMessageId,
      };
    } else {
      await this.messageLogRepo.updateStatus(messageLog.id, MessageStatus.FAILED, {
        errorMessage: response.error?.message,
        errorCode: response.error?.code,
        providerResponse: response.rawResponse as Record<string, unknown>,
      });

      logger.error('Template message failed', {
        messageLogId: messageLog.id,
        errorCode: response.error?.code,
        errorMessage: response.error?.message,
        recipient: request.recipient,
        templateName: request.templateName,
      });

      return {
        success: false,
        messageLogId: messageLog.id,
        error: response.error,
      };
    }
  }

  /**
   * Send a batch of template messages.
   *
   * Note: This sends messages sequentially. For high-volume broadcasts,
   * use the BroadcastQueue which processes messages in parallel workers.
   *
   * @param request - Batch request with recipients
   * @returns Aggregated results
   */
  async sendBatch(request: SendBatchRequest): Promise<SendBatchResult> {
    const results: SendTemplateMessageResult[] = [];
    let successful = 0;
    let failed = 0;

    for (const recipient of request.recipients) {
      const result = await this.sendTemplateMessage({
        tenantId: request.tenantId,
        channelAccountId: request.channelAccountId,
        templateName: request.templateName,
        language: request.language,
        broadcastId: request.broadcastId,
        recipient: recipient.recipient,
        customerId: recipient.customerId,
        variables: recipient.variables,
      });

      results.push(result);

      if (result.success) {
        successful++;
      } else {
        failed++;
      }
    }

    return {
      totalRequested: request.recipients.length,
      successful,
      failed,
      results,
    };
  }

  /**
   * Verify credentials for a channel account.
   *
   * @param channelAccountId - Channel account to verify
   * @param tenantId - Tenant ID for authorization
   * @returns Verification result
   */
  async verifyChannelAccountCredentials(
    channelAccountId: string,
    tenantId: string
  ): Promise<{ valid: boolean; error?: string; accountInfo?: Record<string, unknown> }> {
    const channelAccount = await this.channelAccountRepo.findByIdAndTenant(
      channelAccountId,
      tenantId
    );

    if (!channelAccount) {
      return {
        valid: false,
        error: 'Channel account not found',
      };
    }

    try {
      const provider = await this.providerFactory.createProviderForChannelAccount(
        channelAccountId
      );

      const result = await provider.verifyCredentials();

      return {
        valid: result.valid,
        error: result.error,
        accountInfo: result.accountInfo as Record<string, unknown>,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        valid: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Get templates from provider for a channel account.
   *
   * @param channelAccountId - Channel account ID
   * @param tenantId - Tenant ID for authorization
   * @returns List of templates from provider
   */
  async getProviderTemplates(
    channelAccountId: string,
    tenantId: string
  ): Promise<{ success: boolean; templates?: unknown[]; error?: string }> {
    const channelAccount = await this.channelAccountRepo.findByIdAndTenant(
      channelAccountId,
      tenantId
    );

    if (!channelAccount) {
      return {
        success: false,
        error: 'Channel account not found',
      };
    }

    try {
      const provider = await this.providerFactory.createProviderForChannelAccount(
        channelAccountId
      );

      if (!provider.getTemplates) {
        return {
          success: false,
          error: 'Provider does not support template listing',
        };
      }

      const templates = await provider.getTemplates();

      return {
        success: true,
        templates,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Get a provider instance for a channel account (for advanced use cases).
   *
   * @param channelAccountId - Channel account ID
   * @returns Initialized provider instance
   */
  async getProviderForChannelAccount(
    channelAccountId: string
  ): Promise<IMessagingProvider> {
    return this.providerFactory.createProviderForChannelAccount(channelAccountId);
  }

  /**
   * Get a provider instance for a tenant's default channel account.
   *
   * @param tenantId - Tenant ID
   * @param channelCode - Channel code (e.g., 'whatsapp')
   * @returns Initialized provider instance
   */
  async getProviderForTenantChannel(
    tenantId: string,
    channelCode: string
  ): Promise<IMessagingProvider> {
    return this.providerFactory.createProviderForTenantChannel(tenantId, channelCode);
  }

  // Private helper methods

  /**
   * Create a message log entry for tracking.
   */
  private async createMessageLog(
    request: SendTemplateMessageRequest,
    channelAccount: ChannelAccount
  ): Promise<MessageLog> {
    const logData: CreateMessageLogData = {
      tenantId: request.tenantId,
      broadcastId: request.broadcastId || null,
      customerId: request.customerId || null,
      channelAccountId: request.channelAccountId,
      channelId: channelAccount.channelId,
      providerId: channelAccount.providerId,
      recipient: request.recipient,
      templateData: {
        templateName: request.templateName,
        language: request.language,
        variables: request.variables,
        mediaUrl: request.mediaUrl,
      },
    };

    return this.messageLogRepo.create(logData);
  }
}
