import { singleton, inject } from 'tsyringe';
import Bull from 'bull';
import { createQueue, BULL_CONFIG } from '../config/bull.config';
import { BroadcastRepository } from '../features/broadcasts/broadcast.repository';
import { BroadcastSseService, BroadcastProgressEvent } from '../features/broadcasts/broadcast-sse.service';
import { GroupRepository } from '../features/groups/group.repository';
import { CustomerRepository } from '../features/customers/customer.repository';
import { MessagingService } from '../features/messaging/services/messaging.service';
import { ChannelAccountRepository } from '../features/channel-accounts/channel-account.repository';
import { logger, auditLogger } from '../config/logger.config';
import { BroadcastStatus, RecipientType } from '../features/broadcasts/enums';
import { Customer } from '../features/customers/customer.entity';
import { Broadcast, TemplateVariablesConfig, VariableConfig } from '../features/broadcasts/broadcast.entity';
import { TemplateVariables, VariableValue } from '../features/messaging/interfaces/messaging-provider.interface';
import { ForbiddenException } from '../shared/exceptions/http-exceptions';

/**
 * Maximum number of group members to process in a single batch.
 * This prevents memory exhaustion for very large groups.
 */
const MAX_GROUP_BATCH_SIZE = 1000;

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
 * Sanitizes a customer field value for safe template substitution.
 * Prevents potential injection attacks and ensures safe string conversion.
 *
 * @param value - The raw field value
 * @returns Sanitized string value
 */
function sanitizeFieldValue(value: unknown): string {
  if (value === undefined || value === null) {
    return '';
  }

  // Convert to string
  const strValue = String(value);

  // Remove potentially dangerous characters for template injection
  // Strip control characters and null bytes
  const sanitized = strValue
    .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
    .replace(/\{\{/g, '') // Remove template syntax that could cause injection
    .replace(/\}\}/g, '')
    .trim();

  // Limit length to prevent excessively long values
  const MAX_FIELD_LENGTH = 1000;
  return sanitized.slice(0, MAX_FIELD_LENGTH);
}

/**
 * Job types for the broadcast queue.
 */
export enum JobType {
  /**
   * Main job to orchestrate broadcast sending.
   * Resolves recipients and creates individual PROCESS_RECIPIENT jobs.
   */
  SEND_BROADCAST = 'SEND_BROADCAST',

  /**
   * Job to process a single recipient.
   * Simulates sending a WhatsApp message and updates metrics.
   */
  PROCESS_RECIPIENT = 'PROCESS_RECIPIENT',
}

/**
 * Data for the SEND_BROADCAST job.
 */
export interface SendBroadcastJobData {
  broadcastId: string;
  tenantId: string;
}

/**
 * Data for the PROCESS_RECIPIENT job.
 */
export interface ProcessRecipientJobData {
  broadcastId: string;
  tenantId: string;
  channelAccountId: string;
  templateName: string;
  templateLanguage: string;
  templateVariables: TemplateVariablesConfig;
  customerId: string;
  customerPhone: string;
  customerName: string;
  customerFields: Record<string, unknown>;
}

/**
 * Queue statistics.
 */
export interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: number;
}

/**
 * Service for managing Bull queue operations for broadcasts.
 *
 * Handles:
 * - Scheduling broadcasts for future delivery
 * - Immediate broadcast processing
 * - Recipient resolution from groups or customer IDs
 * - Progress tracking and SSE updates
 * - Queue lifecycle management
 */
@singleton()
export class BroadcastQueue {
  private queue: Bull.Queue;

  constructor(
    @inject(BroadcastRepository) private broadcastRepository: BroadcastRepository,
    @inject(BroadcastSseService) private sseService: BroadcastSseService,
    @inject(GroupRepository) private groupRepository: GroupRepository,
    @inject(CustomerRepository) private customerRepository: CustomerRepository,
    @inject(MessagingService) private messagingService: MessagingService,
    @inject(ChannelAccountRepository) private channelAccountRepository: ChannelAccountRepository
  ) {
    this.queue = createQueue('broadcasts');
    this.setupProcessors();
    this.setupEventListeners();
  }

  /**
   * Schedule a broadcast to be sent at a specific time.
   *
   * @param broadcastId - The broadcast ID
   * @param tenantId - The tenant ID
   * @param scheduledAt - When to send the broadcast
   * @throws Error if scheduledAt is in the past
   */
  async scheduleBroadcast(
    broadcastId: string,
    tenantId: string,
    scheduledAt: Date
  ): Promise<void> {
    const delay = scheduledAt.getTime() - Date.now();

    if (delay <= 0) {
      throw new Error('Scheduled time must be in the future');
    }

    await this.queue.add(
      JobType.SEND_BROADCAST,
      { broadcastId, tenantId } as SendBroadcastJobData,
      {
        delay,
        jobId: `broadcast:${broadcastId}`,
      }
    );

    logger.info('Broadcast scheduled', {
      broadcastId,
      tenantId,
      scheduledAt: scheduledAt.toISOString(),
      delayMs: delay,
    });
  }

  /**
   * Add a broadcast to the queue for immediate processing.
   *
   * @param broadcastId - The broadcast ID
   * @param tenantId - The tenant ID
   */
  async sendBroadcastNow(broadcastId: string, tenantId: string): Promise<void> {
    await this.queue.add(
      JobType.SEND_BROADCAST,
      { broadcastId, tenantId } as SendBroadcastJobData,
      {
        jobId: `broadcast:${broadcastId}`,
      }
    );

    logger.info('Broadcast queued for immediate sending', {
      broadcastId,
      tenantId,
    });
  }

  /**
   * Cancel a scheduled broadcast job.
   *
   * @param broadcastId - The broadcast ID
   * @returns True if the job was removed
   */
  async cancelScheduledBroadcast(broadcastId: string): Promise<boolean> {
    await this.queue.removeJobs(`broadcast:${broadcastId}`);

    logger.info('Scheduled broadcast cancelled', { broadcastId });
    return true;
  }

  /**
   * Pause the queue - stops processing new jobs.
   */
  async pauseQueue(): Promise<void> {
    await this.queue.pause();
    logger.info('Broadcast queue paused');
  }

  /**
   * Resume the queue - continues processing jobs.
   */
  async resumeQueue(): Promise<void> {
    await this.queue.resume();
    logger.info('Broadcast queue resumed');
  }

  /**
   * Get queue statistics.
   *
   * @returns Queue job counts by status
   */
  async getQueueStats(): Promise<QueueStats> {
    const counts = await this.queue.getJobCounts() as unknown as Record<string, number>;
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
   * Close the queue gracefully.
   */
  async closeQueue(): Promise<void> {
    await this.queue.close();
    logger.info('Broadcast queue closed');
  }

  /**
   * Check for scheduled broadcasts that should start processing.
   * Called periodically by the scheduler.
   */
  async checkScheduledBroadcasts(): Promise<void> {
    const now = new Date();
    const broadcasts = await this.broadcastRepository.findScheduledBroadcasts(now);

    for (const broadcast of broadcasts) {
      await this.sendBroadcastNow(broadcast.id, broadcast.tenantId);

      logger.info('Scheduled broadcast enqueued', {
        broadcastId: broadcast.id,
        tenantId: broadcast.tenantId,
        scheduledAt: broadcast.scheduledAt?.toISOString(),
      });
    }
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
    // Process SEND_BROADCAST jobs - orchestrates the broadcast
    this.queue.process(
      JobType.SEND_BROADCAST,
      BULL_CONFIG.concurrency,
      async (job: Bull.Job<SendBroadcastJobData>) => {
        await this.processSendBroadcast(job);
      }
    );

    // Process individual recipients
    this.queue.process(
      JobType.PROCESS_RECIPIENT,
      BULL_CONFIG.concurrency,
      async (job: Bull.Job<ProcessRecipientJobData>) => {
        await this.processRecipient(job);
      }
    );
  }

  /**
   * Process the main SEND_BROADCAST job.
   * Resolves recipients and creates individual processing jobs.
   */
  private async processSendBroadcast(
    job: Bull.Job<SendBroadcastJobData>
  ): Promise<void> {
    const { broadcastId, tenantId } = job.data;

    logger.info('Processing SEND_BROADCAST job', {
      jobId: job.id,
      broadcastId,
      tenantId,
    });

    // Load broadcast
    const broadcast = await this.broadcastRepository.findById(tenantId, broadcastId);

    if (!broadcast) {
      throw new Error(`Broadcast not found: ${broadcastId}`);
    }

    // Check if broadcast is in a valid state to process
    if (broadcast.status === BroadcastStatus.PAUSED ||
        broadcast.status === BroadcastStatus.CANCELLED) {
      logger.info('Broadcast processing skipped - invalid status', {
        broadcastId,
        status: broadcast.status,
      });
      return;
    }

    // Validate channel account with tenant authorization
    let channelAccountId = broadcast.channelAccountId;
    if (!channelAccountId) {
      // If no channel account specified, get the primary WhatsApp channel account
      const primaryAccount = await this.channelAccountRepository.findPrimaryByTenantAndChannel(
        tenantId,
        'whatsapp'
      );
      if (!primaryAccount) {
        throw new Error('No channel account configured for broadcast. Please set a primary WhatsApp channel account.');
      }
      // Update broadcast with the primary channel account
      await this.broadcastRepository.update(broadcastId, tenantId, {
        channelAccountId: primaryAccount.id,
      });
      broadcast.channelAccountId = primaryAccount.id;
      channelAccountId = primaryAccount.id;
    } else {
      // CRITICAL: Validate that the explicit channel account belongs to this tenant
      const channelAccount = await this.channelAccountRepository.findByIdAndTenant(
        channelAccountId,
        tenantId
      );
      if (!channelAccount) {
        logger.error('Channel account authorization failed', {
          broadcastId,
          tenantId,
          channelAccountId,
        });
        throw new ForbiddenException(
          'Channel account does not exist or does not belong to this tenant'
        );
      }
      if (!channelAccount.isActive) {
        throw new Error('Channel account is not active. Please configure an active channel account.');
      }
    }

    // Update status to SENDING if not already
    if (broadcast.status !== BroadcastStatus.SENDING) {
      await this.broadcastRepository.update(broadcastId, tenantId, {
        status: BroadcastStatus.SENDING,
        startedAt: new Date(),
      });
    }

    // Resolve recipients
    const customers = await this.resolveRecipients(
      tenantId,
      broadcast.recipientType,
      broadcast.groupId,
      broadcast.customerIds
    );

    if (customers.length === 0) {
      logger.warn('No recipients found for broadcast', { broadcastId });
      await this.broadcastRepository.markCompleted(broadcastId, tenantId);
      return;
    }

    // Create individual recipient jobs with template info
    for (const customer of customers) {
      await this.queue.add(
        JobType.PROCESS_RECIPIENT,
        {
          broadcastId,
          tenantId,
          channelAccountId: broadcast.channelAccountId!,
          templateName: broadcast.templateName,
          templateLanguage: broadcast.templateLanguage,
          templateVariables: broadcast.templateVariables,
          customerId: customer.id,
          customerPhone: customer.whatsappNumber,
          customerName: customer.name,
          customerFields: customer.customFields || {},
        } as ProcessRecipientJobData,
        {
          // Use unique job ID to prevent duplicates
          jobId: `recipient:${broadcastId}:${customer.id}`,
        }
      );
    }

    // Emit initial progress
    this.emitProgress(broadcast);

    auditLogger.info('Broadcast sending started', {
      action: 'broadcast.send_started',
      broadcastId,
      tenantId,
      totalRecipients: customers.length,
    });
  }

  /**
   * Process a single recipient.
   * Sends template message via the configured provider.
   */
  private async processRecipient(
    job: Bull.Job<ProcessRecipientJobData>
  ): Promise<void> {
    const {
      broadcastId,
      tenantId,
      channelAccountId,
      templateName,
      templateLanguage,
      templateVariables,
      customerId,
      customerPhone,
      customerFields,
    } = job.data;

    // FIXED: Mask phone number in logs to protect PII
    logger.debug('Processing recipient', {
      jobId: job.id,
      broadcastId,
      customerId,
      customerPhone: maskPhoneNumber(customerPhone),
      channelAccountId,
    });

    // Build template variables with customer field substitution
    const resolvedVariables = this.resolveTemplateVariables(
      templateVariables,
      customerFields
    );

    // Send message via MessagingService
    const result = await this.messagingService.sendTemplateMessage({
      tenantId,
      channelAccountId,
      recipient: customerPhone,
      templateName,
      language: templateLanguage,
      variables: resolvedVariables,
      broadcastId,
      customerId,
    });

    if (result.success) {
      // Increment sent count
      await this.broadcastRepository.incrementMetric(broadcastId, 'sentCount', 1);

      logger.debug('Message sent successfully', {
        broadcastId,
        customerId,
        messageLogId: result.messageLogId,
        providerMessageId: result.providerMessageId,
      });
    } else {
      // Increment failed count
      await this.broadcastRepository.incrementMetric(broadcastId, 'failedCount', 1);

      logger.warn('Message send failed', {
        broadcastId,
        customerId,
        messageLogId: result.messageLogId,
        error: result.error,
      });
    }

    // Check if all recipients have been processed using atomic operation
    // This prevents race conditions from concurrent workers
    const completionResult = await this.broadcastRepository.markCompletedAtomic(
      broadcastId,
      tenantId
    );

    // Always fetch the latest broadcast state for progress emission
    const broadcast = await this.broadcastRepository.findById(tenantId, broadcastId);

    if (broadcast) {
      // Emit progress update
      this.emitProgress(broadcast);

      // If this worker successfully marked the broadcast as completed, log it
      if (completionResult.wasUpdated) {
        auditLogger.info('Broadcast completed', {
          action: 'broadcast.completed',
          broadcastId,
          tenantId,
          sentCount: broadcast.sentCount,
          failedCount: broadcast.failedCount,
        });
      }
    }
  }

  /**
   * Resolve recipients based on recipient type.
   * Uses batch operations to prevent N+1 queries.
   * Implements pagination for large groups to prevent memory exhaustion.
   */
  private async resolveRecipients(
    tenantId: string,
    recipientType: RecipientType,
    groupId: string | null,
    customerIds: string[] | null
  ): Promise<Customer[]> {
    if (recipientType === RecipientType.GROUP && groupId) {
      // Get all members from the group with pagination to handle large groups
      const allCustomers: Customer[] = [];
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const result = await this.groupRepository.getMembers(
          tenantId,
          groupId,
          page,
          MAX_GROUP_BATCH_SIZE
        );

        allCustomers.push(...result.data);

        // Check if there are more pages
        hasMore = page < result.totalPages;
        page++;

        // Safety limit to prevent infinite loops
        if (page > 1000) {
          logger.warn('Group pagination limit reached', {
            groupId,
            tenantId,
            pagesProcessed: page - 1,
            totalCustomers: allCustomers.length,
          });
          break;
        }
      }

      return allCustomers;
    }

    if (recipientType === RecipientType.CUSTOMERS && customerIds) {
      // FIXED: Batch lookup to prevent N+1 queries
      // Previously this was doing individual lookups in a loop
      if (customerIds.length === 0) {
        return [];
      }

      return this.customerRepository.findByIds(customerIds, tenantId);
    }

    return [];
  }

  /**
   * Resolve template variables by substituting customer fields.
   *
   * @param config - Template variables configuration from broadcast
   * @param customerFields - Customer's custom fields
   * @returns Resolved template variables for the messaging provider
   */
  private resolveTemplateVariables(
    config: TemplateVariablesConfig,
    customerFields: Record<string, unknown>
  ): TemplateVariables {
    const result: TemplateVariables = {
      body: [],
    };

    // Resolve header variables
    if (config.header) {
      if (config.header.type === 'text' && config.header.textVariable) {
        result.header = [this.resolveVariable(config.header.textVariable, customerFields)];
      } else if (config.header.mediaUrl) {
        // For media headers, pass the URL
        result.header = [{ type: config.header.type as 'image' | 'video' | 'document', value: config.header.mediaUrl }];
      }
    }

    // Resolve body variables
    if (config.bodyVariables && config.bodyVariables.length > 0) {
      result.body = config.bodyVariables
        .sort((a, b) => a.index - b.index)
        .map((v) => this.resolveVariable(v, customerFields));
    }

    // Resolve button variables
    if (config.buttonVariables && config.buttonVariables.length > 0) {
      result.buttons = config.buttonVariables.map((btn) => ({
        index: btn.buttonIndex,
        subType: 'url' as const,
        parameters: [this.resolveVariable(btn.variable, customerFields)],
      }));
    }

    return result;
  }

  /**
   * Resolve a single variable configuration.
   * Applies sanitization to customer field values to prevent injection attacks.
   *
   * @param config - Variable configuration
   * @param customerFields - Customer's custom fields
   * @returns Resolved variable value
   */
  private resolveVariable(
    config: VariableConfig,
    customerFields: Record<string, unknown>
  ): VariableValue {
    if (config.sourceType === 'static') {
      // Static values are presumed safe as they come from admin configuration
      return { type: 'text', value: config.staticValue || '' };
    }

    if (config.sourceType === 'customer_field' && config.customerField) {
      const fieldValue = customerFields[config.customerField];
      // FIXED: Sanitize customer field values before template substitution
      // This prevents potential injection attacks from user-controlled data
      const value = sanitizeFieldValue(fieldValue);
      return { type: 'text', value };
    }

    return { type: 'text', value: '' };
  }

  /**
   * Emit progress update via SSE.
   */
  private emitProgress(broadcast: {
    id: string;
    status: BroadcastStatus;
    sentCount: number;
    deliveredCount: number;
    readCount: number;
    failedCount: number;
    totalRecipients: number;
    completedAt?: Date | null;
  }): void {
    const event: BroadcastProgressEvent = {
      broadcastId: broadcast.id,
      status: broadcast.status,
      sentCount: broadcast.sentCount,
      deliveredCount: broadcast.deliveredCount,
      readCount: broadcast.readCount,
      failedCount: broadcast.failedCount,
      totalRecipients: broadcast.totalRecipients,
      completedAt: broadcast.completedAt || undefined,
    };

    this.sseService.emitProgress(event);
  }

  /**
   * Setup event listeners for queue events.
   */
  private setupEventListeners(): void {
    this.queue.on('error', (error) => {
      logger.error('Queue error', { error: error.message, stack: error.stack });
    });

    this.queue.on('failed', (job, error) => {
      logger.error('Job failed', {
        jobId: job.id,
        jobType: job.name,
        error: error.message,
        attemptsMade: job.attemptsMade,
        data: job.data,
      });

      // If this was a recipient processing job, increment failed count
      if (job.name === JobType.PROCESS_RECIPIENT) {
        const { broadcastId } = job.data as ProcessRecipientJobData;
        this.broadcastRepository.incrementMetric(broadcastId, 'failedCount', 1)
          .catch((err) => logger.error('Failed to increment failedCount', { error: err }));
      }
    });

    this.queue.on('completed', (job) => {
      logger.debug('Job completed', {
        jobId: job.id,
        jobType: job.name,
      });
    });

    this.queue.on('stalled', (job) => {
      logger.warn('Job stalled', {
        jobId: job.id,
        jobType: job.name,
        data: job.data,
      });
    });
  }
}
