import { singleton, inject } from 'tsyringe';
import { ProviderFactory } from '../messaging/provider-factory';
import { MessageLogRepository } from '../message-logs/message-log.repository';
import { ChannelAccountRepository } from '../channel-accounts/channel-account.repository';
import { TemplateRepository } from '../templates/template.repository';
import { TemplateSseService } from '../templates/template-sse.service';
import { InboxMessageQueue } from '../../jobs/inbox-message.queue';
import {
  WebhookEvent,
  MetaTemplateStatus,
} from '../messaging/interfaces/messaging-provider.interface';
import { MessageStatus } from '../message-logs/message-log.entity';
import { TemplateStatus } from '../templates/enums';
import { CredentialService } from '../messaging/services/credential.service';
import { logger } from '../../config/logger.config';

/**
 * Result of webhook verification.
 */
export interface WebhookVerificationResult {
  valid: boolean;
  challenge?: string;
  error?: string;
}

/**
 * Result of webhook processing.
 */
export interface WebhookProcessingResult {
  success: boolean;
  eventsProcessed: number;
  errors: string[];
}

/**
 * Meta webhook verification query parameters.
 */
export interface MetaWebhookVerifyQuery {
  'hub.mode'?: string;
  'hub.verify_token'?: string;
  'hub.challenge'?: string;
}

/**
 * WebhookService handles incoming webhooks from messaging providers.
 *
 * Responsibilities:
 * 1. Verify webhook signatures
 * 2. Parse webhook payloads into standardized events
 * 3. Update message logs based on status events
 * 4. Handle webhook verification challenges (Meta)
 */
@singleton()
export class WebhookService {
  constructor(
    @inject(ProviderFactory) private providerFactory: ProviderFactory,
    @inject(MessageLogRepository) private messageLogRepo: MessageLogRepository,
    @inject(ChannelAccountRepository) private channelAccountRepo: ChannelAccountRepository,
    @inject(TemplateRepository) private templateRepo: TemplateRepository,
    @inject(TemplateSseService) private templateSseService: TemplateSseService,
    @inject(CredentialService) private credentialService: CredentialService,
    @inject(InboxMessageQueue) private inboxMessageQueue: InboxMessageQueue
  ) {}

  /**
   * Verify Meta webhook subscription.
   *
   * Meta sends a verification request when setting up webhooks.
   * We must return the challenge to complete verification.
   *
   * Checks the provided token against all stored per-channel verify tokens.
   * Falls back to META_WEBHOOK_VERIFY_TOKEN env var for backward compatibility.
   *
   * @param query - Query parameters from the request
   * @returns Verification result with challenge if valid
   */
  async verifyMetaWebhook(query: MetaWebhookVerifyQuery): Promise<WebhookVerificationResult> {
    const mode = query['hub.mode'];
    const token = query['hub.verify_token'];
    const challenge = query['hub.challenge'];

    // Log incoming verification request for debugging
    logger.info('Meta webhook verification request received', {
      mode,
      hasToken: !!token,
      tokenLength: token?.length,
      tokenPreview: token ? `${token.substring(0, 8)}...` : null,
      challenge: challenge ? `${challenge.substring(0, 10)}...` : null,
    });

    if (mode !== 'subscribe') {
      logger.warn('Meta webhook verification failed: invalid mode', { mode });
      return {
        valid: false,
        error: 'Invalid mode',
      };
    }

    if (!token) {
      logger.warn('Meta webhook verification failed: missing token');
      return {
        valid: false,
        error: 'Missing verify token',
      };
    }

    // Check against per-channel stored verify tokens
    const channelAccounts = await this.channelAccountRepo.findAllWithWebhookConfig();

    logger.info('Checking verify token against channel accounts', {
      channelAccountCount: channelAccounts.length,
    });

    for (const account of channelAccounts) {
      if (account.webhookSecretEncrypted && account.webhookSecretIv) {
        try {
          const decrypted = await this.credentialService.decryptCredentials(
            account.webhookSecretEncrypted,
            account.webhookSecretIv
          );

          const storedToken = decrypted.verifyToken as string;
          logger.debug('Comparing tokens for channel account', {
            channelAccountId: account.id,
            storedTokenPreview: storedToken ? `${storedToken.substring(0, 8)}...` : null,
            storedTokenLength: storedToken?.length,
            tokensMatch: storedToken === token,
          });

          if (storedToken === token) {
            logger.info('Meta webhook verified successfully', {
              channelAccountId: account.id,
            });
            return {
              valid: true,
              challenge,
            };
          }
        } catch (error) {
          logger.warn('Failed to decrypt verify token for channel account', {
            channelAccountId: account.id,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    }

    // Fallback: Check global env var for backward compatibility
    const globalToken = process.env.META_WEBHOOK_VERIFY_TOKEN;
    logger.debug('Checking global token fallback', {
      hasGlobalToken: !!globalToken,
      globalTokenPreview: globalToken ? `${globalToken.substring(0, 8)}...` : null,
    });

    if (globalToken && token === globalToken) {
      logger.info('Meta webhook verified using global token');
      return {
        valid: true,
        challenge,
      };
    }

    logger.warn('Meta webhook verification failed: no matching token found', {
      checkedChannelAccounts: channelAccounts.length,
      hasGlobalToken: !!globalToken,
    });
    return {
      valid: false,
      error: 'Invalid verify token',
    };
  }

  /**
   * Process a Meta webhook payload.
   *
   * @param payload - Raw webhook payload
   * @param signature - X-Hub-Signature-256 header value
   * @returns Processing result
   */
  async processMetaWebhook(
    payload: string | Buffer,
    signature: string
  ): Promise<WebhookProcessingResult> {
    // 1. Get provider for signature validation
    const provider = this.providerFactory.createProviderForWebhook('meta_cloud_api');

    // 2. Parse payload first to extract phone_number_id for channel lookup
    const payloadString = Buffer.isBuffer(payload) ? payload.toString('utf8') : payload;
    let parsedPayload: unknown;

    try {
      parsedPayload = JSON.parse(payloadString);
    } catch (error) {
      logger.error('Failed to parse Meta webhook payload', { error });
      return {
        success: false,
        eventsProcessed: 0,
        errors: ['Invalid JSON payload'],
      };
    }

    // 3. Extract phone_number_id from webhook payload to find channel account
    const phoneNumberId = this.extractPhoneNumberIdFromPayload(parsedPayload);

    logger.info('Processing Meta webhook', {
      phoneNumberId,
      hasSignature: !!signature,
      payloadPreview: payloadString.substring(0, 200),
    });

    if (!phoneNumberId) {
      logger.error('Could not extract phone_number_id from webhook payload', {
        payloadStructure: JSON.stringify(parsedPayload).substring(0, 500),
      });
      return {
        success: false,
        eventsProcessed: 0,
        errors: ['Missing phone_number_id in webhook payload'],
      };
    }

    // 4. Find channel account and get appSecret from credentials
    const channelAccount = await this.channelAccountRepo.findByPhoneNumberId(phoneNumberId);

    if (!channelAccount) {
      logger.error('Channel account not found for phone_number_id', { phoneNumberId });
      return {
        success: false,
        eventsProcessed: 0,
        errors: ['Channel account not found'],
      };
    }

    logger.debug('Found channel account', {
      channelAccountId: channelAccount.id,
      phoneNumberId: channelAccount.phoneNumberId,
      hasEncryptedCredentials: !!channelAccount.encryptedCredentials,
      hasCredentialsIv: !!channelAccount.credentialsIv,
    });

    let appSecret: string;
    try {
      const credentials = await this.credentialService.decryptCredentials(
        channelAccount.encryptedCredentials,
        channelAccount.credentialsIv
      );

      logger.debug('Decrypted credentials', {
        channelAccountId: channelAccount.id,
        hasAppSecret: !!credentials.appSecret,
        credentialKeys: Object.keys(credentials),
      });

      appSecret = credentials.appSecret as string;

      if (!appSecret) {
        logger.error('appSecret not found in channel account credentials', {
          channelAccountId: channelAccount.id,
          availableKeys: Object.keys(credentials),
        });
        return {
          success: false,
          eventsProcessed: 0,
          errors: ['Channel account missing appSecret in credentials'],
        };
      }
    } catch (error) {
      logger.error('Failed to decrypt channel account credentials', {
        channelAccountId: channelAccount.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return {
        success: false,
        eventsProcessed: 0,
        errors: ['Failed to decrypt channel credentials'],
      };
    }

    // 5. Validate signature using appSecret from channel account
    const isValid = provider.validateWebhookSignature(payload, signature, appSecret);

    if (!isValid) {
      logger.warn('Meta webhook signature validation failed');
      return {
        success: false,
        eventsProcessed: 0,
        errors: ['Invalid webhook signature'],
      };
    }

    // 6. Parse into standardized events
    const events = provider.parseWebhookPayload(parsedPayload);

    if (events.length === 0) {
      logger.debug('No events to process in Meta webhook');
      return {
        success: true,
        eventsProcessed: 0,
        errors: [],
      };
    }

    // 7. Process each event
    const errors: string[] = [];
    let eventsProcessed = 0;

    for (const event of events) {
      try {
        await this.processWebhookEvent(event);
        eventsProcessed++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Failed to process event ${event.providerMessageId}: ${errorMessage}`);
        logger.error('Failed to process webhook event', {
          event,
          error: errorMessage,
        });
      }
    }

    logger.info('Meta webhook processed', {
      eventsProcessed,
      errors: errors.length,
    });

    return {
      success: errors.length === 0,
      eventsProcessed,
      errors,
    };
  }

  /**
   * Process a webhook event from any provider.
   *
   * @param providerCode - Provider code (e.g., 'meta_cloud_api')
   * @param payload - Raw webhook payload
   * @param signature - Signature header value
   * @param secret - Secret for signature validation
   * @returns Processing result
   */
  async processProviderWebhook(
    providerCode: string,
    payload: string | Buffer,
    signature: string,
    secret: string
  ): Promise<WebhookProcessingResult> {
    // 1. Get provider for parsing
    const provider = this.providerFactory.createProviderForWebhook(providerCode);

    // 2. Validate signature
    const isValid = provider.validateWebhookSignature(payload, signature, secret);

    if (!isValid) {
      logger.warn('Webhook signature validation failed', { providerCode });
      return {
        success: false,
        eventsProcessed: 0,
        errors: ['Invalid webhook signature'],
      };
    }

    // 3. Parse payload
    const payloadString = Buffer.isBuffer(payload) ? payload.toString('utf8') : payload;
    let parsedPayload: unknown;

    try {
      parsedPayload = JSON.parse(payloadString);
    } catch (error) {
      logger.error('Failed to parse webhook payload', { providerCode, error });
      return {
        success: false,
        eventsProcessed: 0,
        errors: ['Invalid JSON payload'],
      };
    }

    // 4. Parse into standardized events
    const events = provider.parseWebhookPayload(parsedPayload);

    // 5. Process each event
    const errors: string[] = [];
    let eventsProcessed = 0;

    for (const event of events) {
      try {
        await this.processWebhookEvent(event);
        eventsProcessed++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Failed to process event ${event.providerMessageId}: ${errorMessage}`);
      }
    }

    return {
      success: errors.length === 0,
      eventsProcessed,
      errors,
    };
  }

  // Private helper methods

  /**
   * Process a single webhook event.
   *
   * @param event - Standardized webhook event
   */
  private async processWebhookEvent(event: WebhookEvent): Promise<void> {
    logger.debug('Processing webhook event', {
      type: event.type,
      providerMessageId: event.providerMessageId,
      status: event.status,
    });

    switch (event.type) {
      case 'status_update':
        await this.processStatusUpdate(event);
        break;
      case 'error':
        await this.processErrorEvent(event);
        break;
      case 'message_received':
        await this.processInboundMessage(event);
        break;
      case 'template_status_update':
        await this.processTemplateStatusUpdate(event);
        break;
      default:
        logger.warn('Unknown webhook event type', { event });
    }
  }

  /**
   * Process a message status update.
   *
   * @param event - Status update event
   */
  private async processStatusUpdate(event: WebhookEvent): Promise<void> {
    if (!event.status) {
      logger.warn('Status update missing status field', { event });
      return;
    }

    const messageLog = await this.messageLogRepo.findByProviderMessageId(
      event.providerMessageId
    );

    if (!messageLog) {
      logger.warn('Message log not found for status update', {
        providerMessageId: event.providerMessageId,
      });
      return;
    }

    // Only update if the new status is "higher" than current
    // (prevent delivered → sent rollback due to out-of-order webhooks)
    if (!this.shouldUpdateStatus(messageLog.status, event.status)) {
      logger.debug('Skipping status update - current status is same or higher', {
        messageLogId: messageLog.id,
        currentStatus: messageLog.status,
        newStatus: event.status,
      });
      return;
    }

    await this.messageLogRepo.updateStatus(messageLog.id, event.status);

    logger.info('Message status updated', {
      messageLogId: messageLog.id,
      providerMessageId: event.providerMessageId,
      previousStatus: messageLog.status,
      newStatus: event.status,
    });

    // TODO: Update broadcast metrics if broadcastId is present
    // This will be added in Phase 6 integration
  }

  /**
   * Process an error event.
   *
   * @param event - Error event
   */
  private async processErrorEvent(event: WebhookEvent): Promise<void> {
    const messageLog = await this.messageLogRepo.findByProviderMessageId(
      event.providerMessageId
    );

    if (!messageLog) {
      logger.warn('Message log not found for error event', {
        providerMessageId: event.providerMessageId,
      });
      return;
    }

    await this.messageLogRepo.updateStatus(messageLog.id, MessageStatus.FAILED, {
      errorMessage: event.error?.message,
      errorCode: event.error?.code,
    });

    logger.error('Message delivery failed', {
      messageLogId: messageLog.id,
      providerMessageId: event.providerMessageId,
      errorCode: event.error?.code,
      errorMessage: event.error?.message,
    });

    // TODO: Update broadcast metrics if broadcastId is present
    // This will be added in Phase 6 integration
  }

  /**
   * Determine if status should be updated based on status hierarchy.
   *
   * Status hierarchy: pending < queued < sent < delivered < read
   * Failed is final and should not be overwritten except by read.
   *
   * @param currentStatus - Current message status
   * @param newStatus - New status from webhook
   * @returns true if status should be updated
   */
  private shouldUpdateStatus(
    currentStatus: MessageStatus,
    newStatus: MessageStatus
  ): boolean {
    const statusOrder: Record<MessageStatus, number> = {
      [MessageStatus.PENDING]: 0,
      [MessageStatus.QUEUED]: 1,
      [MessageStatus.SENT]: 2,
      [MessageStatus.DELIVERED]: 3,
      [MessageStatus.READ]: 4,
      [MessageStatus.FAILED]: 5, // Failed is typically final
    };

    // Allow update if new status is higher
    // Special case: Failed can be updated to Read (edge case where read comes after failed webhook)
    if (currentStatus === MessageStatus.FAILED && newStatus === MessageStatus.READ) {
      return true;
    }

    return statusOrder[newStatus] > statusOrder[currentStatus];
  }

  /**
   * Process an inbound message received event.
   *
   * Routes the message to the inbox queue for conversation creation/update.
   *
   * @param event - The message_received webhook event
   */
  private async processInboundMessage(event: WebhookEvent): Promise<void> {
    // Extract phone_number_id from rawEvent metadata
    const rawMessage = event.rawEvent as {
      from: string;
      type: string;
      text?: { body: string };
      image?: { id: string; mime_type: string; caption?: string };
      document?: { id: string; mime_type: string; filename?: string; caption?: string };
      audio?: { id: string; mime_type: string };
      video?: { id: string; mime_type: string; caption?: string };
      metadata?: { phone_number_id: string };
      senderName?: string;
    };

    const phoneNumberId = rawMessage.metadata?.phone_number_id;
    if (!phoneNumberId) {
      logger.warn('Inbound message missing phone_number_id', {
        providerMessageId: event.providerMessageId,
      });
      return;
    }

    // Find channel account by phone_number_id
    const channelAccount = await this.channelAccountRepo.findByPhoneNumberId(phoneNumberId);
    if (!channelAccount) {
      logger.warn('Channel account not found for phone_number_id', {
        phoneNumberId,
        providerMessageId: event.providerMessageId,
      });
      return;
    }

    // Queue for inbox processing
    await this.inboxMessageQueue.queueInboundProcessing({
      tenantId: channelAccount.tenantId,
      channelAccountId: channelAccount.id,
      providerMessageId: event.providerMessageId,
      fromNumber: rawMessage.from,
      senderName: rawMessage.senderName,
      messageType: rawMessage.type,
      content: this.extractMessageContent(rawMessage),
      timestamp: event.timestamp,
      rawEvent: event.rawEvent,
    });

    logger.info('Inbound message queued for processing', {
      providerMessageId: event.providerMessageId,
      channelAccountId: channelAccount.id,
      phoneNumberId,
      senderName: rawMessage.senderName,
    });
  }

  /**
   * Extract phone_number_id from Meta webhook payload.
   *
   * Meta webhooks have the structure:
   * { entry: [{ changes: [{ value: { metadata: { phone_number_id: "..." } } }] }] }
   *
   * @param payload - Parsed webhook payload
   * @returns phone_number_id or undefined if not found
   */
  private extractPhoneNumberIdFromPayload(payload: unknown): string | undefined {
    try {
      const p = payload as {
        entry?: Array<{
          changes?: Array<{
            value?: {
              metadata?: {
                phone_number_id?: string;
              };
            };
          }>;
        }>;
      };

      return p.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id;
    } catch {
      return undefined;
    }
  }

  /**
   * Extract the message content based on message type.
   *
   * Returns the content object appropriate for the message type
   * (text body, image/video/audio/document object, etc.)
   *
   * @param rawMessage - The raw message from the webhook
   * @returns The extracted content object
   */
  private extractMessageContent(rawMessage: unknown): unknown {
    const msg = rawMessage as Record<string, unknown>;
    const type = msg.type as string;

    switch (type) {
      case 'text':
        return { text: (msg.text as { body: string })?.body };
      case 'image':
        return msg.image;
      case 'document':
        return msg.document;
      case 'audio':
        return msg.audio;
      case 'video':
        return msg.video;
      default:
        return msg;
    }
  }

  /**
   * Process a template status update webhook.
   *
   * Meta sends template status webhooks when templates are approved, rejected,
   * disabled, etc. This method finds the matching template in the database
   * and updates its status, then emits an SSE event to notify the frontend.
   *
   * @param event - Template status update event
   */
  private async processTemplateStatusUpdate(event: WebhookEvent): Promise<void> {
    const templateInfo = event.templateInfo;
    if (!templateInfo) {
      logger.warn('Template status update missing templateInfo', { event });
      return;
    }

    const {
      templateName,
      language,
      newStatus,
      reason,
      whatsappBusinessAccountId,
    } = templateInfo;

    logger.info('Processing template status update', {
      templateName,
      language,
      newStatus,
      whatsappBusinessAccountId,
    });

    // Map Meta status to internal TemplateStatus
    const internalStatus = this.mapMetaTemplateStatusToInternal(newStatus);

    // Find channel accounts that match this WABA ID
    // We need to check credentials to find the matching account
    const channelAccounts = await this.findChannelAccountsByWabaId(whatsappBusinessAccountId);

    if (channelAccounts.length === 0) {
      logger.warn('No channel accounts found for WABA ID', {
        whatsappBusinessAccountId,
        templateName,
        language,
      });
      return;
    }

    // Process template status update for each matching channel account
    let updated = false;
    for (const { tenantId, channelAccountId } of channelAccounts) {
      const result = await this.templateRepo.updateStatusByNameAndLanguage(
        tenantId,
        channelAccountId,
        templateName,
        language,
        internalStatus
      );

      if (result.updated) {
        updated = true;

        // Emit SSE event to notify frontend
        this.templateSseService.emitTemplateStatusChange(
          tenantId,
          templateName,
          language,
          result.oldStatus || null,
          internalStatus,
          reason
        );

        logger.info('Template status updated', {
          tenantId,
          channelAccountId,
          templateName,
          language,
          oldStatus: result.oldStatus,
          newStatus: internalStatus,
          translationId: result.translationId,
        });
      }
    }

    if (!updated) {
      logger.warn('Template not found for status update', {
        templateName,
        language,
        whatsappBusinessAccountId,
        checkedAccounts: channelAccounts.length,
      });
    }
  }

  /**
   * Find channel accounts by WhatsApp Business Account ID.
   *
   * Since WABA ID is stored in encrypted credentials, we need to decrypt
   * and check each active channel account's credentials.
   *
   * @param wabaId - WhatsApp Business Account ID from webhook
   * @returns Array of matching tenant ID and channel account ID pairs
   */
  private async findChannelAccountsByWabaId(
    wabaId: string | undefined
  ): Promise<Array<{ tenantId: string; channelAccountId: string }>> {
    if (!wabaId) {
      return [];
    }

    const results: Array<{ tenantId: string; channelAccountId: string }> = [];

    // Get all active channel accounts
    const channelAccounts = await this.channelAccountRepo.findAllActive();

    for (const account of channelAccounts) {
      try {
        // Decrypt credentials to check WABA ID
        const credentials = await this.credentialService.decryptCredentials(
          account.encryptedCredentials,
          account.credentialsIv
        );

        if (credentials.whatsappBusinessAccountId === wabaId) {
          results.push({
            tenantId: account.tenantId,
            channelAccountId: account.id,
          });
        }
      } catch (error) {
        // Skip accounts where decryption fails
        logger.debug('Failed to decrypt credentials for channel account', {
          channelAccountId: account.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return results;
  }

  /**
   * Map Meta template status to internal TemplateStatus enum.
   *
   * @param metaStatus - Status from Meta webhook
   * @returns Internal TemplateStatus value
   */
  private mapMetaTemplateStatusToInternal(metaStatus: MetaTemplateStatus): TemplateStatus {
    const statusMap: Record<MetaTemplateStatus, TemplateStatus> = {
      APPROVED: TemplateStatus.APPROVED,
      REJECTED: TemplateStatus.REJECTED,
      PENDING: TemplateStatus.PENDING,
      PENDING_DELETION: TemplateStatus.PENDING_DELETION,
      DISABLED: TemplateStatus.DISABLED,
      PAUSED: TemplateStatus.PAUSED,
      IN_APPEAL: TemplateStatus.IN_APPEAL,
      FLAGGED: TemplateStatus.FLAGGED,
      LIMIT_EXCEEDED: TemplateStatus.LIMIT_EXCEEDED,
    };

    return statusMap[metaStatus] || TemplateStatus.PENDING;
  }
}
