import { IMessagingProvider, ProviderCredentials, SendTemplateRequest, SendMessageResponse, WebhookEvent, CredentialVerificationResult, ProviderTemplate, RateLimitInfo, TemplateStatusResponse, SendFreeformRequest } from '../interfaces/messaging-provider.interface';
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
 * Meta Cloud API Provider Implementation.
 * Integrates with Meta's WhatsApp Business Cloud API.
 *
 * @see https://developers.facebook.com/docs/whatsapp/cloud-api
 */
export declare class MetaCloudApiProvider implements IMessagingProvider {
    readonly providerCode = "meta_cloud_api";
    readonly channelCode = "whatsapp";
    private credentials;
    private client;
    private readonly apiVersion;
    private readonly baseUrl;
    /**
     * Initialize provider with decrypted credentials.
     */
    initialize(credentials: ProviderCredentials): Promise<void>;
    /**
     * Send a template message via Meta Cloud API.
     *
     * @see https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages
     */
    sendTemplateMessage(request: SendTemplateRequest): Promise<SendMessageResponse>;
    /**
     * Send a freeform message (text or media) via Meta Cloud API.
     * Used for inbox/chat functionality within 24-hour messaging window.
     *
     * @see https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages
     */
    sendFreeformMessage(request: SendFreeformRequest): Promise<SendMessageResponse>;
    /**
     * Validate Meta webhook signature using SHA-256 HMAC.
     *
     * @see https://developers.facebook.com/docs/whatsapp/cloud-api/guides/set-up-webhooks
     */
    validateWebhookSignature(payload: string | Buffer, signature: string, secret: string): boolean;
    /**
     * Parse Meta webhook payload into standardized events.
     *
     * Handles both message-related webhooks and template status update webhooks.
     *
     * @see https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/components
     * @see https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/components#message_template_status_update
     */
    parseWebhookPayload(payload: unknown): WebhookEvent[];
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
    private parseTemplateStatusChange;
    /**
     * Map Meta template status event string to MetaTemplateStatus type.
     *
     * Meta sends various event types for template status changes.
     */
    private mapMetaTemplateStatusEvent;
    /**
     * Verify credentials are valid by making a test API call.
     * Returns extended account information for display purposes.
     */
    verifyCredentials(): Promise<CredentialVerificationResult>;
    /**
     * Get all templates from the WhatsApp Business Account.
     */
    getTemplates(): Promise<ProviderTemplate[]>;
    /**
     * Get status of a specific template.
     */
    getTemplateStatus(templateName: string): Promise<TemplateStatusResponse>;
    /**
     * Get rate limit info (Meta doesn't expose this directly via API).
     */
    getRateLimitInfo(): Promise<RateLimitInfo>;
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
    isRateLimitError(error: unknown): boolean;
    /**
     * Extract the Retry-After value from an error response.
     *
     * Meta may include a Retry-After header indicating how long to wait
     * before retrying.
     *
     * @param error - The error object to extract from
     * @returns Number of seconds to wait, or undefined if not present
     */
    extractRetryAfter(error: unknown): number | undefined;
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
    getMediaUrl(mediaId: string): Promise<string>;
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
    downloadMedia(url: string): Promise<{
        data: Buffer;
        contentType: string;
    }>;
    /**
     * Build the freeform message payload for Meta API.
     */
    private buildFreeformPayload;
    /**
     * Build location message payload for Meta API.
     * @see https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages#location-object
     */
    private buildLocationPayload;
    /**
     * Build contact message payload for Meta API.
     * @see https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages#contacts-object
     */
    private buildContactPayload;
    /**
     * Build reaction message payload for Meta API.
     * @see https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages#reaction-object
     */
    private buildReactionPayload;
    /**
     * Build sticker message payload for Meta API.
     * @see https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages#sticker-object
     */
    private buildStickerPayload;
    /**
     * Build interactive list message payload for Meta API.
     * @see https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages#interactive-object
     */
    private buildInteractiveListPayload;
    /**
     * Build interactive button message payload for Meta API.
     * @see https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages#interactive-object
     */
    private buildInteractiveButtonPayload;
    /**
     * Build the template message payload for Meta API.
     */
    private buildTemplatePayload;
    /**
     * Build a parameter object for the Meta API based on variable type.
     */
    private buildParameterObject;
    /**
     * Normalize phone number to E.164 format without leading +.
     */
    private normalizePhoneNumber;
    /**
     * Map Meta status string to internal MessageStatus enum.
     */
    private mapMetaStatus;
    /**
     * Map Meta template status to internal format.
     */
    private mapTemplateStatus;
    /**
     * Type guard for Meta webhook payload.
     */
    private isMetaWebhookPayload;
    /**
     * Handle errors from send operations.
     */
    private handleSendError;
    /**
     * Handle errors from freeform send operations.
     */
    private handleFreeformSendError;
}
