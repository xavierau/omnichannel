import { CredentialService } from '../../messaging/services/credential.service';
import { OutgoingWebhookPayload, WebhookDispatchResult } from '../interfaces/webhook-payload.interface';
/**
 * Dispatcher for outgoing webhooks.
 *
 * Handles the actual HTTP POST to external webhook URLs with HMAC signature
 * for authentication. Uses the same signature format as Meta webhook validation
 * for consistency.
 *
 * Security:
 * - SSRF protection: Validates URLs to prevent requests to internal networks
 * - HTTPS required in production (HTTP allowed in development/test)
 * - Signature format: sha256=<HMAC-SHA256(timestamp.payload, secret)>
 */
export declare class OutgoingWebhookDispatcher {
    private readonly credentialService;
    constructor(credentialService: CredentialService);
    /**
     * Dispatch a webhook payload to an external URL.
     *
     * Steps:
     * 1. Validate URL for SSRF vulnerabilities
     * 2. Decrypt the webhook secret
     * 3. Generate timestamp for replay attack prevention
     * 4. Create HMAC signature using timestamp + payload
     * 5. Send HTTP POST with signature headers
     *
     * Security:
     * - URL is validated to prevent SSRF attacks targeting internal networks
     * - Private IP ranges, localhost, and link-local addresses are blocked
     * - DNS resolution is performed to catch DNS rebinding attacks
     *
     * @param webhookUrl - The URL to send the webhook to
     * @param payload - The payload to send
     * @param secretEncrypted - Encrypted webhook secret
     * @param secretIv - Initialization vector for decryption
     * @returns Result containing success status, HTTP status code, and any error
     */
    dispatch(webhookUrl: string, payload: OutgoingWebhookPayload, secretEncrypted: string, secretIv: string): Promise<WebhookDispatchResult>;
    /**
     * Handle dispatch errors and categorize them.
     */
    private handleError;
    /**
     * Extract a human-readable error message from response data.
     */
    private extractErrorMessage;
    /**
     * Mask webhook URL for logging to avoid leaking sensitive paths.
     */
    private maskUrl;
}
