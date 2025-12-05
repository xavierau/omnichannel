import axios, { AxiosInstance, AxiosError } from 'axios';
import * as crypto from 'crypto';
import {
  IMessagingProvider,
  ProviderCredentials,
  SendTemplateRequest,
  SendMessageResponse,
  WebhookEvent,
  CredentialVerificationResult,
  ProviderTemplate,
  RateLimitInfo,
  TemplateStatusResponse,
  VariableValue,
} from '../interfaces/messaging-provider.interface';
import { MessageStatus } from '../../message-logs/message-log.entity';
import { logger } from '../../../config/logger.config';

/**
 * Meta Cloud API credentials structure.
 */
export interface MetaCloudApiCredentials {
  phoneNumberId: string;
  whatsappBusinessAccountId: string;
  accessToken: string;
  appId: string;
  appSecret: string;
}

/**
 * Meta Graph API response types.
 */
interface MetaMessageResponse {
  messaging_product: string;
  contacts: Array<{
    input: string;
    wa_id: string;
  }>;
  messages: Array<{
    id: string;
  }>;
}

interface MetaErrorResponse {
  error: {
    message: string;
    type: string;
    code: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
}

interface MetaTemplateResponse {
  data: Array<{
    id: string;
    name: string;
    language: string;
    status: string;
    category: string;
    components: unknown[];
  }>;
  paging?: {
    cursors: {
      before: string;
      after: string;
    };
    next?: string;
  };
}

interface MetaWebhookEntry {
  id: string;
  changes: Array<{
    value: {
      messaging_product: string;
      metadata: {
        display_phone_number: string;
        phone_number_id: string;
      };
      statuses?: Array<{
        id: string;
        status: string;
        timestamp: string;
        recipient_id: string;
        errors?: Array<{
          code: number;
          title: string;
          message?: string;
          error_data?: {
            details: string;
          };
        }>;
      }>;
      messages?: Array<{
        id: string;
        from: string;
        timestamp: string;
        type: string;
        text?: {
          body: string;
        };
      }>;
    };
    field: string;
  }>;
}

interface MetaWebhookPayload {
  object: string;
  entry: MetaWebhookEntry[];
}

/**
 * Meta Cloud API Provider Implementation.
 * Integrates with Meta's WhatsApp Business Cloud API.
 *
 * @see https://developers.facebook.com/docs/whatsapp/cloud-api
 */
export class MetaCloudApiProvider implements IMessagingProvider {
  readonly providerCode = 'meta_cloud_api';
  readonly channelCode = 'whatsapp';

  private credentials: MetaCloudApiCredentials | null = null;
  private client: AxiosInstance | null = null;
  private readonly apiVersion = 'v18.0';
  private readonly baseUrl = 'https://graph.facebook.com';

  /**
   * Initialize provider with decrypted credentials.
   */
  async initialize(credentials: ProviderCredentials): Promise<void> {
    this.credentials = {
      phoneNumberId: credentials.phoneNumberId as string,
      whatsappBusinessAccountId: credentials.whatsappBusinessAccountId as string,
      accessToken: credentials.accessToken as string,
      appId: credentials.appId as string,
      appSecret: credentials.appSecret as string,
    };

    this.client = axios.create({
      baseURL: `${this.baseUrl}/${this.apiVersion}`,
      headers: {
        'Authorization': `Bearer ${this.credentials.accessToken}`,
        'Content-Type': 'application/json',
      },
      timeout: parseInt(process.env.PROVIDER_TIMEOUT_MS || '30000', 10),
    });

    logger.debug('MetaCloudApiProvider initialized', {
      phoneNumberId: this.credentials.phoneNumberId,
      wabaId: this.credentials.whatsappBusinessAccountId,
    });
  }

  /**
   * Send a template message via Meta Cloud API.
   *
   * @see https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages
   */
  async sendTemplateMessage(request: SendTemplateRequest): Promise<SendMessageResponse> {
    if (!this.client || !this.credentials) {
      return {
        success: false,
        error: {
          code: 'NOT_INITIALIZED',
          message: 'Provider not initialized. Call initialize() first.',
          retryable: false,
        },
      };
    }

    try {
      const payload = this.buildTemplatePayload(request);

      logger.debug('Sending template message', {
        phoneNumberId: this.credentials.phoneNumberId,
        recipient: request.recipient,
        templateName: request.templateName,
        messageLogId: request.messageLogId,
      });

      const response = await this.client.post<MetaMessageResponse>(
        `/${this.credentials.phoneNumberId}/messages`,
        payload
      );

      const providerMessageId = response.data.messages[0]?.id;

      logger.info('Template message sent successfully', {
        providerMessageId,
        recipient: request.recipient,
        templateName: request.templateName,
        messageLogId: request.messageLogId,
      });

      return {
        success: true,
        providerMessageId,
        timestamp: new Date(),
        rawResponse: response.data,
      };
    } catch (error) {
      return this.handleSendError(error, request);
    }
  }

  /**
   * Validate Meta webhook signature using SHA-256 HMAC.
   *
   * @see https://developers.facebook.com/docs/whatsapp/cloud-api/guides/set-up-webhooks
   */
  validateWebhookSignature(
    payload: string | Buffer,
    signature: string,
    secret: string
  ): boolean {
    if (!signature) {
      logger.warn('Missing webhook signature');
      return false;
    }

    const payloadString = Buffer.isBuffer(payload) ? payload.toString('utf8') : payload;

    // Meta signature format: "sha256=<hash>"
    const expectedSignature = `sha256=${crypto
      .createHmac('sha256', secret)
      .update(payloadString)
      .digest('hex')}`;

    const isValid = crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );

    if (!isValid) {
      logger.warn('Invalid webhook signature', {
        receivedSignature: signature.substring(0, 20) + '...',
      });
    }

    return isValid;
  }

  /**
   * Parse Meta webhook payload into standardized events.
   *
   * @see https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/components
   */
  parseWebhookPayload(payload: unknown): WebhookEvent[] {
    const events: WebhookEvent[] = [];

    if (!this.isMetaWebhookPayload(payload)) {
      logger.warn('Invalid Meta webhook payload structure');
      return events;
    }

    for (const entry of payload.entry) {
      for (const change of entry.changes) {
        if (change.field !== 'messages') continue;

        const value = change.value;

        // Process status updates
        if (value.statuses) {
          for (const status of value.statuses) {
            events.push({
              type: status.errors ? 'error' : 'status_update',
              providerMessageId: status.id,
              status: this.mapMetaStatus(status.status),
              timestamp: new Date(parseInt(status.timestamp, 10) * 1000),
              error: status.errors?.[0]
                ? {
                    code: String(status.errors[0].code),
                    message: status.errors[0].title || status.errors[0].message || 'Unknown error',
                  }
                : undefined,
              rawEvent: status,
            });
          }
        }

        // Process incoming messages (for future use)
        if (value.messages) {
          for (const message of value.messages) {
            events.push({
              type: 'message_received',
              providerMessageId: message.id,
              timestamp: new Date(parseInt(message.timestamp, 10) * 1000),
              rawEvent: message,
            });
          }
        }
      }
    }

    return events;
  }

  /**
   * Verify credentials are valid by making a test API call.
   */
  async verifyCredentials(): Promise<CredentialVerificationResult> {
    if (!this.client || !this.credentials) {
      return {
        valid: false,
        error: 'Provider not initialized',
      };
    }

    try {
      // Get phone number details to verify credentials
      const response = await this.client.get(`/${this.credentials.phoneNumberId}`, {
        params: {
          fields: 'verified_name,display_phone_number,quality_rating,messaging_limit_tier',
        },
      });

      return {
        valid: true,
        accountInfo: {
          businessName: response.data.verified_name,
          phoneNumber: response.data.display_phone_number,
          tier: response.data.messaging_limit_tier,
        },
      };
    } catch (error) {
      const axiosError = error as AxiosError<MetaErrorResponse>;
      const errorMessage =
        axiosError.response?.data?.error?.message || axiosError.message || 'Unknown error';

      logger.error('Credential verification failed', {
        error: errorMessage,
        code: axiosError.response?.data?.error?.code,
      });

      return {
        valid: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Get all templates from the WhatsApp Business Account.
   */
  async getTemplates(): Promise<ProviderTemplate[]> {
    if (!this.client || !this.credentials) {
      throw new Error('Provider not initialized');
    }

    const templates: ProviderTemplate[] = [];
    let hasMore = true;
    let cursor: string | undefined;

    while (hasMore) {
      const response = await this.client.get<MetaTemplateResponse>(
        `/${this.credentials.whatsappBusinessAccountId}/message_templates`,
        {
          params: {
            fields: 'id,name,language,status,category,components',
            limit: 100,
            ...(cursor ? { after: cursor } : {}),
          },
        }
      );

      for (const template of response.data.data) {
        templates.push({
          id: template.id,
          name: template.name,
          language: template.language,
          status: this.mapTemplateStatus(template.status),
          category: template.category,
          components: template.components,
        });
      }

      cursor = response.data.paging?.cursors?.after;
      hasMore = !!response.data.paging?.next;
    }

    logger.debug('Fetched templates from Meta', {
      count: templates.length,
      wabaId: this.credentials.whatsappBusinessAccountId,
    });

    return templates;
  }

  /**
   * Get status of a specific template.
   */
  async getTemplateStatus(templateName: string): Promise<TemplateStatusResponse> {
    if (!this.client || !this.credentials) {
      throw new Error('Provider not initialized');
    }

    const response = await this.client.get<MetaTemplateResponse>(
      `/${this.credentials.whatsappBusinessAccountId}/message_templates`,
      {
        params: {
          name: templateName,
          fields: 'status,rejected_reason',
        },
      }
    );

    const template = response.data.data[0];
    if (!template) {
      return {
        status: 'rejected',
        rejectionReason: 'Template not found',
      };
    }

    return {
      status: this.mapTemplateStatus(template.status),
      rejectionReason: (template as { rejected_reason?: string }).rejected_reason,
    };
  }

  /**
   * Get rate limit info (Meta doesn't expose this directly via API).
   */
  async getRateLimitInfo(): Promise<RateLimitInfo> {
    // Meta rate limits are based on tier and not directly queryable
    // Return static info based on common tiers
    return {
      messagesPerSecond: 80, // Standard tier
    };
  }

  // Private helper methods

  /**
   * Build the template message payload for Meta API.
   */
  private buildTemplatePayload(request: SendTemplateRequest): object {
    const components: object[] = [];

    // Header component
    if (request.variables.header && request.variables.header.length > 0) {
      const headerParams = request.variables.header.map((v) =>
        this.buildParameterObject(v)
      );
      components.push({
        type: 'header',
        parameters: headerParams,
      });
    }

    // Body component
    if (request.variables.body && request.variables.body.length > 0) {
      const bodyParams = request.variables.body.map((v) =>
        this.buildParameterObject(v)
      );
      components.push({
        type: 'body',
        parameters: bodyParams,
      });
    }

    // Button components
    if (request.variables.buttons && request.variables.buttons.length > 0) {
      for (const button of request.variables.buttons) {
        const buttonParams = button.parameters.map((v) =>
          this.buildParameterObject(v)
        );
        components.push({
          type: 'button',
          sub_type: button.subType,
          index: button.index,
          parameters: buttonParams,
        });
      }
    }

    return {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: this.normalizePhoneNumber(request.recipient),
      type: 'template',
      template: {
        name: request.templateName,
        language: {
          code: request.language,
        },
        components: components.length > 0 ? components : undefined,
      },
    };
  }

  /**
   * Build a parameter object for the Meta API based on variable type.
   */
  private buildParameterObject(variable: VariableValue): object {
    switch (variable.type) {
      case 'text':
        return { type: 'text', text: variable.value };
      case 'currency':
        // Value should be in format: "code|amount|fallback_value"
        const [currencyCode, amount, fallback] = variable.value.split('|');
        return {
          type: 'currency',
          currency: {
            code: currencyCode,
            amount_1000: parseInt(amount, 10),
            fallback_value: fallback,
          },
        };
      case 'datetime':
        return {
          type: 'date_time',
          date_time: {
            fallback_value: variable.value,
          },
        };
      case 'image':
        return { type: 'image', image: { link: variable.value } };
      case 'video':
        return { type: 'video', video: { link: variable.value } };
      case 'document':
        return { type: 'document', document: { link: variable.value } };
      default:
        return { type: 'text', text: variable.value };
    }
  }

  /**
   * Normalize phone number to E.164 format without leading +.
   */
  private normalizePhoneNumber(phoneNumber: string): string {
    // Remove any non-digit characters except leading +
    let normalized = phoneNumber.replace(/[^\d+]/g, '');
    // Remove leading + if present
    if (normalized.startsWith('+')) {
      normalized = normalized.substring(1);
    }
    return normalized;
  }

  /**
   * Map Meta status string to internal MessageStatus enum.
   */
  private mapMetaStatus(status: string): MessageStatus {
    const statusMap: Record<string, MessageStatus> = {
      sent: MessageStatus.SENT,
      delivered: MessageStatus.DELIVERED,
      read: MessageStatus.READ,
      failed: MessageStatus.FAILED,
    };
    return statusMap[status.toLowerCase()] || MessageStatus.PENDING;
  }

  /**
   * Map Meta template status to internal format.
   */
  private mapTemplateStatus(status: string): 'approved' | 'pending' | 'rejected' {
    const statusMap: Record<string, 'approved' | 'pending' | 'rejected'> = {
      APPROVED: 'approved',
      PENDING: 'pending',
      REJECTED: 'rejected',
      DELETED: 'rejected',
      DISABLED: 'rejected',
      PAUSED: 'pending',
      IN_APPEAL: 'pending',
    };
    return statusMap[status.toUpperCase()] || 'pending';
  }

  /**
   * Type guard for Meta webhook payload.
   */
  private isMetaWebhookPayload(payload: unknown): payload is MetaWebhookPayload {
    if (typeof payload !== 'object' || payload === null) return false;
    const p = payload as Record<string, unknown>;
    return p.object === 'whatsapp_business_account' && Array.isArray(p.entry);
  }

  /**
   * Handle errors from send operations.
   */
  private handleSendError(error: unknown, request: SendTemplateRequest): SendMessageResponse {
    const axiosError = error as AxiosError<MetaErrorResponse>;

    const metaError = axiosError.response?.data?.error;
    const errorCode = metaError?.code?.toString() || 'UNKNOWN';
    const errorMessage = metaError?.message || axiosError.message || 'Unknown error';

    // Determine if error is retryable
    const retryableCodes = [
      1, // Unknown error (temporary)
      2, // Service temporarily unavailable
      4, // Rate limit
      17, // Rate limit
      341, // Rate limit
      368, // Temporarily blocked
      190, // Access token expired (might be refreshable)
    ];

    const retryable = metaError ? retryableCodes.includes(metaError.code) : false;

    logger.error('Failed to send template message', {
      errorCode,
      errorMessage,
      retryable,
      recipient: request.recipient,
      templateName: request.templateName,
      messageLogId: request.messageLogId,
      httpStatus: axiosError.response?.status,
    });

    return {
      success: false,
      error: {
        code: errorCode,
        message: errorMessage,
        retryable,
      },
      rawResponse: axiosError.response?.data,
    };
  }
}
