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
  SendFreeformRequest,
  LocationContent,
  ContactContent,
  ReactionContent,
  StickerContent,
  InteractiveListContent,
  InteractiveButtonContent,
  MetaTemplateStatus,
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
      contacts?: Array<{
        profile: {
          name: string;
        };
        wa_id: string;
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
 * Template status update webhook value from Meta.
 * @see https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/components#message_template_status_update
 */
interface MetaTemplateStatusWebhookValue {
  event: string;
  message_template_id: number;
  message_template_name: string;
  message_template_language: string;
  reason?: string;
  other_info?: {
    title?: string;
    description?: string;
  };
}

/**
 * Extended webhook entry that includes template status updates.
 * Used for parsing template status webhooks from Meta.
 */
interface _MetaTemplateStatusWebhookEntry {
  id: string;
  changes: Array<{
    field: 'message_template_status_update';
    value: MetaTemplateStatusWebhookValue;
  }>;
}

/**
 * Custom error for unsupported content types.
 */
class UnsupportedContentTypeError extends Error {
  constructor(contentType: string) {
    super(`Unsupported content type: ${contentType}`);
    this.name = 'UnsupportedContentTypeError';
  }
}

/**
 * Custom error for validation failures.
 */
class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
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
   * Send a freeform message (text or media) via Meta Cloud API.
   * Used for inbox/chat functionality within 24-hour messaging window.
   *
   * @see https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages
   */
  async sendFreeformMessage(request: SendFreeformRequest): Promise<SendMessageResponse> {
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
      const payload = this.buildFreeformPayload(request);

      logger.debug('Sending freeform message', {
        phoneNumberId: this.credentials.phoneNumberId,
        recipient: request.recipient,
        contentType: request.contentType,
        messageId: request.messageId,
      });

      const response = await this.client.post<MetaMessageResponse>(
        `/${this.credentials.phoneNumberId}/messages`,
        payload
      );

      const providerMessageId = response.data.messages[0]?.id;

      logger.info('Freeform message sent successfully', {
        providerMessageId,
        recipient: request.recipient,
        contentType: request.contentType,
        messageId: request.messageId,
      });

      return {
        success: true,
        providerMessageId,
        timestamp: new Date(),
        rawResponse: response.data,
      };
    } catch (error) {
      return this.handleFreeformSendError(error, request);
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
   * Handles both message-related webhooks and template status update webhooks.
   *
   * @see https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/components
   * @see https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/components#message_template_status_update
   */
  parseWebhookPayload(payload: unknown): WebhookEvent[] {
    const events: WebhookEvent[] = [];

    if (!this.isMetaWebhookPayload(payload)) {
      logger.warn('Invalid Meta webhook payload structure');
      return events;
    }

    for (const entry of payload.entry) {
      for (const change of entry.changes) {
        // Handle template status updates
        if (change.field === 'message_template_status_update') {
          const templateStatusEvent = this.parseTemplateStatusChange(
            entry.id,
            change.value as unknown as MetaTemplateStatusWebhookValue
          );
          if (templateStatusEvent) {
            events.push(templateStatusEvent);
          }
          continue;
        }

        // Handle message-related webhooks
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

        // Process incoming messages
        if (value.messages) {
          for (const message of value.messages) {
            // Find matching contact for this message to get profile name
            const contact = value.contacts?.find((c) => c.wa_id === message.from);

            events.push({
              type: 'message_received',
              providerMessageId: message.id,
              timestamp: new Date(parseInt(message.timestamp, 10) * 1000),
              rawEvent: {
                ...message,
                metadata: value.metadata,
                senderName: contact?.profile?.name,
              },
            });
          }
        }
      }
    }

    return events;
  }

  /**
   * Parse a template status change webhook into a WebhookEvent.
   *
   * Meta sends template status updates when templates are approved, rejected,
   * disabled, etc.
   *
   * @param whatsappBusinessAccountId - The WABA ID from the webhook entry
   * @param value - The template status webhook value
   * @returns A WebhookEvent with template status information, or null if parsing fails
   */
  private parseTemplateStatusChange(
    whatsappBusinessAccountId: string,
    value: MetaTemplateStatusWebhookValue
  ): WebhookEvent | null {
    if (!value.event || !value.message_template_name || !value.message_template_language) {
      logger.warn('Template status webhook missing required fields', {
        hasEvent: !!value.event,
        hasName: !!value.message_template_name,
        hasLanguage: !!value.message_template_language,
      });
      return null;
    }

    // Map the event to our MetaTemplateStatus type
    const newStatus = this.mapMetaTemplateStatusEvent(value.event);

    logger.info('Parsed template status webhook', {
      templateName: value.message_template_name,
      language: value.message_template_language,
      newStatus,
      reason: value.reason,
      whatsappBusinessAccountId,
    });

    return {
      type: 'template_status_update',
      providerMessageId: String(value.message_template_id),
      timestamp: new Date(),
      rawEvent: value,
      templateInfo: {
        templateName: value.message_template_name,
        language: value.message_template_language,
        newStatus,
        reason: value.reason || value.other_info?.description,
        messageTemplateId: String(value.message_template_id),
        whatsappBusinessAccountId,
      },
    };
  }

  /**
   * Map Meta template status event string to MetaTemplateStatus type.
   *
   * Meta sends various event types for template status changes.
   */
  private mapMetaTemplateStatusEvent(event: string): MetaTemplateStatus {
    const eventMap: Record<string, MetaTemplateStatus> = {
      APPROVED: 'APPROVED',
      REJECTED: 'REJECTED',
      PENDING_DELETION: 'PENDING_DELETION',
      DISABLED: 'DISABLED',
      PENDING: 'PENDING',
      PAUSED: 'PAUSED',
      IN_APPEAL: 'IN_APPEAL',
      FLAGGED: 'FLAGGED',
      LIMIT_EXCEEDED: 'LIMIT_EXCEEDED',
      // Handle lowercase variants
      approved: 'APPROVED',
      rejected: 'REJECTED',
      pending_deletion: 'PENDING_DELETION',
      disabled: 'DISABLED',
      pending: 'PENDING',
      paused: 'PAUSED',
      in_appeal: 'IN_APPEAL',
      flagged: 'FLAGGED',
      limit_exceeded: 'LIMIT_EXCEEDED',
    };

    return eventMap[event] || 'PENDING';
  }

  /**
   * Verify credentials are valid by making a test API call.
   * Returns extended account information for display purposes.
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
          displayPhoneNumber: response.data.display_phone_number,
          qualityRating: response.data.quality_rating,
          messagingLimitTier: response.data.messaging_limit_tier,
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

  /**
   * Check if an error indicates a rate limit condition from Meta.
   *
   * Meta rate limit error codes:
   * - 4: API Too Many Calls
   * - 17: User request limit reached
   * - 341: Application request limit reached
   * - 368: Temporarily blocked for violating WhatsApp policies
   *
   * @param error - The error object to check
   * @returns True if the error indicates a rate limit condition
   *
   * @see https://developers.facebook.com/docs/whatsapp/cloud-api/support/error-codes
   */
  isRateLimitError(error: unknown): boolean {
    if (!error || typeof error !== 'object') {
      return false;
    }

    const axiosError = error as AxiosError<MetaErrorResponse>;
    const errorCode = axiosError.response?.data?.error?.code;

    if (typeof errorCode !== 'number') {
      return false;
    }

    const rateLimitCodes = [4, 17, 341, 368];
    return rateLimitCodes.includes(errorCode);
  }

  /**
   * Extract the Retry-After value from an error response.
   *
   * Meta may include a Retry-After header indicating how long to wait
   * before retrying.
   *
   * @param error - The error object to extract from
   * @returns Number of seconds to wait, or undefined if not present
   */
  extractRetryAfter(error: unknown): number | undefined {
    if (!error || typeof error !== 'object') {
      return undefined;
    }

    const axiosError = error as AxiosError;
    const retryAfterHeader = axiosError.response?.headers?.['retry-after'];

    if (!retryAfterHeader || typeof retryAfterHeader !== 'string') {
      return undefined;
    }

    const parsed = parseInt(retryAfterHeader, 10);
    return isNaN(parsed) ? undefined : parsed;
  }

  /**
   * Get the download URL for a media file from Meta's CDN.
   *
   * Meta's media URLs are temporary and expire after ~24 hours.
   * This method retrieves the CDN URL for a media file by its ID.
   *
   * @see https://developers.facebook.com/docs/whatsapp/cloud-api/reference/media#get-media-url
   *
   * @param mediaId - The media ID from the webhook payload
   * @returns The temporary CDN URL for the media file
   * @throws Error if the request fails or provider is not initialized
   */
  async getMediaUrl(mediaId: string): Promise<string> {
    if (!this.client || !this.credentials) {
      throw new Error('Provider not initialized. Call initialize() first.');
    }

    try {
      const response = await this.client.get<{ url: string; mime_type: string; sha256: string; file_size: number }>(
        `/${mediaId}`
      );

      logger.debug('Retrieved media URL from Meta', {
        mediaId,
        mimeType: response.data.mime_type,
        fileSize: response.data.file_size,
      });

      return response.data.url;
    } catch (error) {
      const axiosError = error as AxiosError<MetaErrorResponse>;
      const errorMessage = axiosError.response?.data?.error?.message || axiosError.message || 'Unknown error';

      logger.error('Failed to get media URL from Meta', {
        mediaId,
        error: errorMessage,
        code: axiosError.response?.data?.error?.code,
      });

      throw new Error(`Failed to get media URL: ${errorMessage}`);
    }
  }

  /**
   * Download media content from Meta's CDN.
   *
   * The URL returned by getMediaUrl requires the access token as a Bearer header.
   * This method downloads the actual binary content of the media file.
   *
   * @see https://developers.facebook.com/docs/whatsapp/cloud-api/reference/media#download-media
   *
   * @param url - The CDN URL from getMediaUrl
   * @returns The media content as a Buffer with its content type
   * @throws Error if the download fails or provider is not initialized
   */
  async downloadMedia(url: string): Promise<{ data: Buffer; contentType: string }> {
    if (!this.credentials) {
      throw new Error('Provider not initialized. Call initialize() first.');
    }

    try {
      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${this.credentials.accessToken}`,
        },
        responseType: 'arraybuffer',
        timeout: parseInt(process.env.MEDIA_DOWNLOAD_TIMEOUT_MS || '60000', 10),
      });

      const contentType = response.headers['content-type'] || 'application/octet-stream';

      logger.debug('Downloaded media from Meta CDN', {
        contentType,
        size: response.data.length,
      });

      return {
        data: Buffer.from(response.data),
        contentType,
      };
    } catch (error) {
      const axiosError = error as AxiosError;

      logger.error('Failed to download media from Meta CDN', {
        url: url.substring(0, 50) + '...', // Truncate URL for security
        error: axiosError.message,
        status: axiosError.response?.status,
      });

      throw new Error(`Failed to download media: ${axiosError.message}`);
    }
  }

  // Private helper methods

  /**
   * Build the freeform message payload for Meta API.
   */
  private buildFreeformPayload(request: SendFreeformRequest): object {
    const base = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: this.normalizePhoneNumber(request.recipient),
    };

    switch (request.contentType) {
      case 'text':
        return {
          ...base,
          type: 'text',
          text: {
            preview_url: true,
            body: request.content.text,
          },
        };

      case 'image':
        return {
          ...base,
          type: 'image',
          image: {
            link: request.content.mediaUrl,
            caption: request.content.caption,
          },
        };

      case 'video':
        return {
          ...base,
          type: 'video',
          video: {
            link: request.content.mediaUrl,
            caption: request.content.caption,
          },
        };

      case 'audio':
        return {
          ...base,
          type: 'audio',
          audio: {
            link: request.content.mediaUrl,
          },
        };

      case 'document':
        return {
          ...base,
          type: 'document',
          document: {
            link: request.content.mediaUrl,
            filename: request.content.filename || 'document',
            caption: request.content.caption,
          },
        };

      case 'location':
        return this.buildLocationPayload(base.to, request.content.location!);

      case 'contact':
        return this.buildContactPayload(base.to, request.content.contact!);

      case 'reaction':
        return this.buildReactionPayload(base.to, request.content.reaction!);

      case 'sticker':
        return this.buildStickerPayload(base.to, request.content.sticker!);

      case 'interactive_list':
        return this.buildInteractiveListPayload(base.to, request.content.interactiveList!);

      case 'interactive_buttons':
        return this.buildInteractiveButtonPayload(base.to, request.content.interactiveButtons!);

      default:
        throw new UnsupportedContentTypeError(request.contentType);
    }
  }

  /**
   * Build location message payload for Meta API.
   * @see https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages#location-object
   */
  private buildLocationPayload(to: string, content: LocationContent): object {
    return {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'location',
      location: {
        latitude: content.latitude.toString(),
        longitude: content.longitude.toString(),
        name: content.name,
        address: content.address,
      },
    };
  }

  /**
   * Build contact message payload for Meta API.
   * @see https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages#contacts-object
   */
  private buildContactPayload(to: string, content: ContactContent): object {
    return {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'contacts',
      contacts: [
        {
          name: content.name,
          phones: content.phones,
          emails: content.emails,
        },
      ],
    };
  }

  /**
   * Build reaction message payload for Meta API.
   * @see https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages#reaction-object
   */
  private buildReactionPayload(to: string, content: ReactionContent): object {
    return {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'reaction',
      reaction: {
        message_id: content.messageId,
        emoji: content.emoji,
      },
    };
  }

  /**
   * Build sticker message payload for Meta API.
   * @see https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages#sticker-object
   */
  private buildStickerPayload(to: string, content: StickerContent): object {
    return {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'sticker',
      sticker: content.mediaId ? { id: content.mediaId } : { link: content.mediaUrl },
    };
  }

  /**
   * Build interactive list message payload for Meta API.
   * @see https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages#interactive-object
   */
  private buildInteractiveListPayload(to: string, content: InteractiveListContent): object {
    // Validate max 10 sections
    if (content.sections.length > 10) {
      throw new ValidationError('Interactive list messages support a maximum of 10 sections');
    }

    return {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'interactive',
      interactive: {
        type: 'list',
        header: content.header ? { type: 'text', text: content.header } : undefined,
        body: { text: content.body },
        footer: content.footer ? { text: content.footer } : undefined,
        action: {
          button: content.buttonText,
          sections: content.sections.map((section) => ({
            title: section.title,
            rows: section.rows,
          })),
        },
      },
    };
  }

  /**
   * Build interactive button message payload for Meta API.
   * @see https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages#interactive-object
   */
  private buildInteractiveButtonPayload(to: string, content: InteractiveButtonContent): object {
    // Validate max 3 buttons
    if (content.buttons.length > 3) {
      throw new ValidationError('Interactive button messages support a maximum of 3 buttons');
    }

    // Validate button title max 20 characters
    for (const button of content.buttons) {
      if (button.title.length > 20) {
        throw new ValidationError(`Button title must not exceed 20 characters: "${button.title}"`);
      }
    }

    return {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'interactive',
      interactive: {
        type: 'button',
        header: content.header ? { type: 'text', text: content.header } : undefined,
        body: { text: content.body },
        footer: content.footer ? { text: content.footer } : undefined,
        action: {
          buttons: content.buttons.map((btn) => ({
            type: 'reply',
            reply: {
              id: btn.id,
              title: btn.title,
            },
          })),
        },
      },
    };
  }

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
      case 'currency': {
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
      }
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

  /**
   * Handle errors from freeform send operations.
   */
  private handleFreeformSendError(error: unknown, request: SendFreeformRequest): SendMessageResponse {
    // Handle unsupported content type error
    if (error instanceof UnsupportedContentTypeError) {
      logger.error('Unsupported content type for freeform message', {
        contentType: request.contentType,
        recipient: request.recipient,
        messageId: request.messageId,
      });

      return {
        success: false,
        error: {
          code: 'UNSUPPORTED_CONTENT_TYPE',
          message: error.message,
          retryable: false,
        },
      };
    }

    // Handle validation errors
    if (error instanceof ValidationError) {
      logger.error('Validation error for freeform message', {
        contentType: request.contentType,
        recipient: request.recipient,
        messageId: request.messageId,
        validationError: error.message,
      });

      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.message,
          retryable: false,
        },
      };
    }

    const axiosError = error as AxiosError<MetaErrorResponse>;

    const metaError = axiosError.response?.data?.error;
    const errorCode = metaError?.code?.toString() || 'UNKNOWN';
    const errorMessage = metaError?.message || axiosError.message || 'Unknown error';

    // Determine if error is retryable
    // Same logic as handleSendError for consistency
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

    logger.error('Failed to send freeform message', {
      errorCode,
      errorMessage,
      retryable,
      recipient: request.recipient,
      contentType: request.contentType,
      messageId: request.messageId,
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
