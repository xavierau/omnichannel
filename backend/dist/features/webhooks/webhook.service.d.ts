import { ProviderFactory } from '../messaging/provider-factory';
import { MessageLogRepository } from '../message-logs/message-log.repository';
import { ChannelAccountRepository } from '../channel-accounts/channel-account.repository';
import { TemplateRepository } from '../templates/template.repository';
import { TemplateSseService } from '../templates/template-sse.service';
import { InboxMessageQueue } from '../../jobs/inbox-message.queue';
import { CredentialService } from '../messaging/services/credential.service';
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
export declare class WebhookService {
    private providerFactory;
    private messageLogRepo;
    private channelAccountRepo;
    private templateRepo;
    private templateSseService;
    private credentialService;
    private inboxMessageQueue;
    constructor(providerFactory: ProviderFactory, messageLogRepo: MessageLogRepository, channelAccountRepo: ChannelAccountRepository, templateRepo: TemplateRepository, templateSseService: TemplateSseService, credentialService: CredentialService, inboxMessageQueue: InboxMessageQueue);
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
    verifyMetaWebhook(query: MetaWebhookVerifyQuery): Promise<WebhookVerificationResult>;
    /**
     * Process a Meta webhook payload.
     *
     * @param payload - Raw webhook payload
     * @param signature - X-Hub-Signature-256 header value
     * @returns Processing result
     */
    processMetaWebhook(payload: string | Buffer, signature: string): Promise<WebhookProcessingResult>;
    /**
     * Process a webhook event from any provider.
     *
     * @param providerCode - Provider code (e.g., 'meta_cloud_api')
     * @param payload - Raw webhook payload
     * @param signature - Signature header value
     * @param secret - Secret for signature validation
     * @returns Processing result
     */
    processProviderWebhook(providerCode: string, payload: string | Buffer, signature: string, secret: string): Promise<WebhookProcessingResult>;
    /**
     * Process a single webhook event.
     *
     * @param event - Standardized webhook event
     */
    private processWebhookEvent;
    /**
     * Process a message status update.
     *
     * @param event - Status update event
     */
    private processStatusUpdate;
    /**
     * Process an error event.
     *
     * @param event - Error event
     */
    private processErrorEvent;
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
    private shouldUpdateStatus;
    /**
     * Process an inbound message received event.
     *
     * Routes the message to the inbox queue for conversation creation/update.
     *
     * @param event - The message_received webhook event
     */
    private processInboundMessage;
    /**
     * Extract phone_number_id from Meta webhook payload.
     *
     * Meta webhooks have the structure:
     * { entry: [{ changes: [{ value: { metadata: { phone_number_id: "..." } } }] }] }
     *
     * @param payload - Parsed webhook payload
     * @returns phone_number_id or undefined if not found
     */
    private extractPhoneNumberIdFromPayload;
    /**
     * Extract the message content based on message type.
     *
     * Returns the content object appropriate for the message type
     * (text body, image/video/audio/document object, etc.)
     *
     * @param rawMessage - The raw message from the webhook
     * @returns The extracted content object
     */
    private extractMessageContent;
    /**
     * Process a template status update webhook.
     *
     * Meta sends template status webhooks when templates are approved, rejected,
     * disabled, etc. This method finds the matching template in the database
     * and updates its status, then emits an SSE event to notify the frontend.
     *
     * @param event - Template status update event
     */
    private processTemplateStatusUpdate;
    /**
     * Find channel accounts by WhatsApp Business Account ID.
     *
     * Since WABA ID is stored in encrypted credentials, we need to decrypt
     * and check each active channel account's credentials.
     *
     * @param wabaId - WhatsApp Business Account ID from webhook
     * @returns Array of matching tenant ID and channel account ID pairs
     */
    private findChannelAccountsByWabaId;
    /**
     * Map Meta template status to internal TemplateStatus enum.
     *
     * @param metaStatus - Status from Meta webhook
     * @returns Internal TemplateStatus value
     */
    private mapMetaTemplateStatusToInternal;
}
