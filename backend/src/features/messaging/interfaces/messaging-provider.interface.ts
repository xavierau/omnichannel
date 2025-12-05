import { MessageStatus } from '../../message-logs/message-log.entity';

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
  type: 'status_update' | 'message_received' | 'error';
  providerMessageId: string;
  status?: MessageStatus;
  timestamp: Date;
  error?: {
    code: string;
    message: string;
  };
  rawEvent: unknown;
}

/**
 * Result from verifying provider credentials.
 */
export interface CredentialVerificationResult {
  valid: boolean;
  error?: string;
  accountInfo?: {
    businessName?: string;
    phoneNumber?: string;
    tier?: string;
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
}
