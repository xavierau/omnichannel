import { singleton, inject } from 'tsyringe';
import { ProviderFactory } from '../messaging/provider-factory';
import { MessageLogRepository } from '../message-logs/message-log.repository';
import { WebhookEvent } from '../messaging/interfaces/messaging-provider.interface';
import { MessageStatus } from '../message-logs/message-log.entity';
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
    @inject(MessageLogRepository) private messageLogRepo: MessageLogRepository
  ) {}

  /**
   * Verify Meta webhook subscription.
   *
   * Meta sends a verification request when setting up webhooks.
   * We must return the challenge to complete verification.
   *
   * @param query - Query parameters from the request
   * @returns Verification result with challenge if valid
   */
  verifyMetaWebhook(query: MetaWebhookVerifyQuery): WebhookVerificationResult {
    const mode = query['hub.mode'];
    const token = query['hub.verify_token'];
    const challenge = query['hub.challenge'];

    if (mode !== 'subscribe') {
      logger.warn('Meta webhook verification failed: invalid mode', { mode });
      return {
        valid: false,
        error: 'Invalid mode',
      };
    }

    const expectedToken = process.env.META_WEBHOOK_VERIFY_TOKEN;

    if (!expectedToken) {
      logger.error('META_WEBHOOK_VERIFY_TOKEN not configured');
      return {
        valid: false,
        error: 'Server configuration error',
      };
    }

    if (token !== expectedToken) {
      logger.warn('Meta webhook verification failed: invalid token');
      return {
        valid: false,
        error: 'Invalid verify token',
      };
    }

    logger.info('Meta webhook verified successfully');

    return {
      valid: true,
      challenge,
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

    // 2. Get app secret for signature validation
    const appSecret = process.env.META_APP_SECRET;

    if (!appSecret) {
      logger.error('META_APP_SECRET not configured');
      return {
        success: false,
        eventsProcessed: 0,
        errors: ['Server configuration error: missing app secret'],
      };
    }

    // 3. Validate signature
    const isValid = provider.validateWebhookSignature(payload, signature, appSecret);

    if (!isValid) {
      logger.warn('Meta webhook signature validation failed');
      return {
        success: false,
        eventsProcessed: 0,
        errors: ['Invalid webhook signature'],
      };
    }

    // 4. Parse payload
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

    // 5. Parse into standardized events
    const events = provider.parseWebhookPayload(parsedPayload);

    if (events.length === 0) {
      logger.debug('No events to process in Meta webhook');
      return {
        success: true,
        eventsProcessed: 0,
        errors: [],
      };
    }

    // 6. Process each event
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
        // Incoming messages - log for now, future feature
        logger.info('Incoming message received', {
          providerMessageId: event.providerMessageId,
        });
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
}
