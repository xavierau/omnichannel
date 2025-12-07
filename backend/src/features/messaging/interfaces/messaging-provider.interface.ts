import { MessageStatus } from '../../message-logs/message-log.entity';

/**
 * Webhook event types.
 */
export type WebhookEventType =
  | 'status_update'
  | 'message_received'
  | 'error'
  | 'template_status_update';

/**
 * Template status values from Meta webhooks.
 */
export type MetaTemplateStatus =
  | 'APPROVED'
  | 'REJECTED'
  | 'PENDING_DELETION'
  | 'DISABLED'
  | 'PENDING'
  | 'PAUSED'
  | 'IN_APPEAL'
  | 'FLAGGED'
  | 'LIMIT_EXCEEDED';

/**
 * Template status information from Meta webhooks.
 */
export interface TemplateStatusInfo {
  templateName: string;
  language: string;
  newStatus: MetaTemplateStatus;
  reason?: string;
  messageTemplateId?: string;
  whatsappBusinessAccountId?: string;
}

/**
 * Provider credentials - varies by provider type.
 */
export interface ProviderCredentials {
  [key: string]: string | number | boolean;
}

/**
 * Variable value for template substitution.
 */
export interface VariableValue {
  type: 'text' | 'currency' | 'datetime' | 'image' | 'video' | 'document';
  value: string;
}

/**
 * Button variable for template buttons.
 */
export interface ButtonVariable {
  index: number;
  subType: 'url' | 'quick_reply';
  parameters: VariableValue[];
}

/**
 * Template variables for message sending.
 */
export interface TemplateVariables {
  header?: VariableValue[];
  body: VariableValue[];
  buttons?: ButtonVariable[];
}

/**
 * Request to send a template message.
 */
export interface SendTemplateRequest {
  recipient: string;
  templateName: string;
  language: string;
  variables: TemplateVariables;
  mediaUrl?: string;
  messageLogId: string; // For correlation
}

/**
 * Content type for freeform messages.
 */
export type FreeformContentType =
  | 'text'
  | 'image'
  | 'video'
  | 'audio'
  | 'document'
  | 'location'
  | 'contact'
  | 'sticker'
  | 'reaction'
  | 'interactive_list'
  | 'interactive_buttons';

/**
 * Location content for location messages.
 */
export interface LocationContent {
  latitude: number;
  longitude: number;
  name?: string;
  address?: string;
}

/**
 * Contact content for contact messages.
 */
export interface ContactContent {
  name: {
    formatted_name: string;
    first_name?: string;
    last_name?: string;
  };
  phones?: Array<{
    phone: string;
    type?: string;
    wa_id?: string;
  }>;
  emails?: Array<{
    email: string;
    type?: string;
  }>;
}

/**
 * Reaction content for reaction messages.
 */
export interface ReactionContent {
  messageId: string;
  emoji: string;
}

/**
 * Sticker content for sticker messages.
 */
export interface StickerContent {
  mediaId?: string;
  mediaUrl?: string;
}

/**
 * Section for interactive list messages.
 */
export interface InteractiveListSection {
  title: string;
  rows: Array<{
    id: string;
    title: string;
    description?: string;
  }>;
}

/**
 * Interactive list content for list messages.
 * @remarks Max 10 sections, each section max 10 rows.
 */
export interface InteractiveListContent {
  header?: string;
  body: string;
  footer?: string;
  buttonText: string;
  sections: InteractiveListSection[];
}

/**
 * Interactive button content for button messages.
 * @remarks Max 3 buttons, each button title max 20 characters.
 */
export interface InteractiveButtonContent {
  header?: string;
  body: string;
  footer?: string;
  buttons: Array<{
    id: string;
    title: string;
  }>;
}

/**
 * Content payload for freeform messages.
 */
export interface FreeformContent {
  /** Text content for text messages */
  text?: string;
  /** URL to the media file for media messages */
  mediaUrl?: string;
  /** MIME type of the media (optional, provider may auto-detect) */
  mimeType?: string;
  /** Caption for image, video, or document messages */
  caption?: string;
  /** Filename for document messages */
  filename?: string;
  /** Location content for location messages */
  location?: LocationContent;
  /** Contact content for contact messages */
  contact?: ContactContent;
  /** Reaction content for reaction messages */
  reaction?: ReactionContent;
  /** Sticker content for sticker messages */
  sticker?: StickerContent;
  /** Interactive list content for list messages */
  interactiveList?: InteractiveListContent;
  /** Interactive buttons content for button messages */
  interactiveButtons?: InteractiveButtonContent;
}

/**
 * Request to send a freeform (non-template) message.
 * Used for inbox/chat functionality within 24-hour messaging window.
 */
export interface SendFreeformRequest {
  /** Recipient phone number in E.164 format */
  recipient: string;
  /** Type of content being sent */
  contentType: FreeformContentType;
  /** Content payload based on contentType */
  content: FreeformContent;
  /** Optional correlation ID for tracking */
  messageId?: string;
}

/**
 * Response from sending a message.
 */
export interface SendMessageResponse {
  success: boolean;
  providerMessageId?: string;
  timestamp?: Date;
  error?: {
    code: string;
    message: string;
    retryable: boolean;
  };
  rawResponse?: unknown;
}

/**
 * Webhook event from provider callbacks.
 */
export interface WebhookEvent {
  type: WebhookEventType;
  providerMessageId: string;
  status?: MessageStatus;
  timestamp: Date;
  error?: {
    code: string;
    message: string;
  };
  rawEvent: unknown;
  /** Template status information (only for template_status_update events) */
  templateInfo?: TemplateStatusInfo;
}

/**
 * Result from verifying provider credentials.
 */
export interface CredentialVerificationResult {
  valid: boolean;
  error?: string;
  accountInfo?: {
    businessName?: string;
    displayPhoneNumber?: string;
    qualityRating?: string;
    messagingLimitTier?: string;
  };
}

/**
 * Rate limit information from provider.
 */
export interface RateLimitInfo {
  messagesPerSecond?: number;
  messagesRemaining?: number;
  resetTime?: Date;
}

/**
 * Template status response from provider.
 */
export interface TemplateStatusResponse {
  status: 'approved' | 'pending' | 'rejected';
  rejectionReason?: string;
}

/**
 * Template definition from provider.
 */
export interface ProviderTemplate {
  id: string;
  name: string;
  language: string;
  status: 'approved' | 'pending' | 'rejected';
  category: string;
  components: unknown[];
}

/**
 * Unified interface for all messaging providers.
 * Implements Strategy Pattern for provider abstraction.
 */
export interface IMessagingProvider {
  /**
   * Provider identifier (matches Provider.code)
   */
  readonly providerCode: string;

  /**
   * Channel this provider supports
   */
  readonly channelCode: string;

  /**
   * Initialize provider with tenant-specific credentials.
   */
  initialize(credentials: ProviderCredentials): Promise<void>;

  /**
   * Send a template message.
   */
  sendTemplateMessage(request: SendTemplateRequest): Promise<SendMessageResponse>;

  /**
   * Validate webhook signature.
   */
  validateWebhookSignature(
    payload: string | Buffer,
    signature: string,
    secret: string
  ): boolean;

  /**
   * Parse webhook payload into standardized format.
   */
  parseWebhookPayload(payload: unknown): WebhookEvent[];

  /**
   * Verify credentials are valid.
   */
  verifyCredentials(): Promise<CredentialVerificationResult>;

  /**
   * Get templates from provider (optional).
   */
  getTemplates?(): Promise<ProviderTemplate[]>;

  /**
   * Get template status from provider (optional).
   */
  getTemplateStatus?(templateName: string): Promise<TemplateStatusResponse>;

  /**
   * Get provider-specific rate limit info (optional).
   */
  getRateLimitInfo?(): Promise<RateLimitInfo>;

  /**
   * Send a freeform message (text or media).
   * Used for inbox/chat functionality within 24-hour messaging window.
   * Optional - not all providers may support freeform messages.
   */
  sendFreeformMessage?(request: SendFreeformRequest): Promise<SendMessageResponse>;

  /**
   * Get the download URL for a media file from the provider's CDN.
   * Used to retrieve temporary URLs for media files referenced by ID.
   * Optional - only applicable to providers that use media IDs in webhooks.
   *
   * @param mediaId - The media ID from the webhook payload
   * @returns The temporary CDN URL for the media file
   */
  getMediaUrl?(mediaId: string): Promise<string>;

  /**
   * Download media content from the provider's CDN.
   * The URL typically requires provider-specific authentication headers.
   * Optional - only applicable to providers that use media IDs in webhooks.
   *
   * @param url - The CDN URL from getMediaUrl
   * @returns The media content as a Buffer with its content type
   */
  downloadMedia?(url: string): Promise<{ data: Buffer; contentType: string }>;
}
