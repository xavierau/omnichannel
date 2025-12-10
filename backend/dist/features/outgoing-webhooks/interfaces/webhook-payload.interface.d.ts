/**
 * Payload structure for outgoing webhook notifications.
 *
 * Sent when an inbound message arrives for an unassigned conversation.
 * External services can use this to trigger custom workflows.
 */
export interface OutgoingWebhookPayload {
    /**
     * Event type identifier.
     * Currently only 'message.received.unassigned' is supported.
     */
    event: 'message.received.unassigned';
    /**
     * ISO 8601 timestamp when the event was generated.
     */
    timestamp: string;
    /**
     * Message details.
     */
    message: {
        /** Internal message ID */
        id: string;
        /** Provider's message ID for tracking */
        providerMessageId: string;
        /** Type of content (text, image, video, etc.) */
        contentType: string;
        /** Message content structure (varies by contentType) */
        content: Record<string, unknown>;
        /** ISO 8601 timestamp when message was received */
        receivedAt: string;
    };
    /**
     * Conversation details.
     */
    conversation: {
        /** Internal conversation ID */
        id: string;
        /** Current status (unassigned, active, etc.) */
        status: string;
        /** ISO 8601 timestamp when conversation was created */
        createdAt: string;
        /** ISO 8601 timestamp of last message, or null */
        lastMessageAt: string | null;
    };
    /**
     * Customer details.
     */
    customer: {
        /** Internal customer ID */
        id: string;
        /** Customer display name */
        name: string;
        /** Customer's WhatsApp number in E.164 format */
        whatsappNumber: string;
        /** Custom fields associated with the customer */
        customFields: Record<string, unknown>;
    };
    /**
     * Channel account details.
     */
    channelAccount: {
        /** Internal channel account ID */
        id: string;
        /** Display name of the channel account */
        name: string;
        /** Phone number of the channel account, or null */
        phoneNumber: string | null;
    };
    /**
     * Tenant ID for multi-tenancy.
     */
    tenantId: string;
}
/**
 * Job data for webhook dispatch queue.
 *
 * Contains all information needed to dispatch a webhook to an external service.
 */
export interface WebhookDispatchJobData {
    /** URL to send the webhook to */
    webhookUrl: string;
    /** The payload to send */
    payload: OutgoingWebhookPayload;
    /** Encrypted webhook secret for HMAC signature */
    secretEncrypted: string;
    /** Initialization vector for secret decryption */
    secretIv: string;
    /** Channel account ID for logging/debugging */
    channelAccountId: string;
    /** Tenant ID for multi-tenancy isolation */
    tenantId: string;
}
/**
 * Result of a webhook dispatch attempt.
 */
export interface WebhookDispatchResult {
    /** Whether the dispatch was successful */
    success: boolean;
    /** HTTP status code from the target server */
    statusCode?: number;
    /** Error message if dispatch failed */
    error?: string;
}
