import { singleton, inject } from 'tsyringe';
import axios, { AxiosError } from 'axios';
import * as crypto from 'crypto';
import { CredentialService } from '../../messaging/services/credential.service';
import { logger } from '../../../config/logger.config';
import {
  OutgoingWebhookPayload,
  WebhookDispatchResult,
} from '../interfaces/webhook-payload.interface';
import {
  validateWebhookUrl,
  SsrfValidationError,
} from '../../../shared/utils/url-validator.utils';

/**
 * HTTP timeout for webhook requests in milliseconds.
 */
const WEBHOOK_TIMEOUT_MS = 30000;

/**
 * Allow HTTP for development/testing environments.
 * In production, only HTTPS is allowed.
 */
const ALLOW_HTTP_WEBHOOKS = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';

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
@singleton()
export class OutgoingWebhookDispatcher {
  constructor(
    @inject(CredentialService) private readonly credentialService: CredentialService
  ) {}

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
  async dispatch(
    webhookUrl: string,
    payload: OutgoingWebhookPayload,
    secretEncrypted: string,
    secretIv: string
  ): Promise<WebhookDispatchResult> {
    try {
      // SSRF Protection: Validate URL before making any requests
      const urlValidation = await validateWebhookUrl(webhookUrl, ALLOW_HTTP_WEBHOOKS);
      if (!urlValidation.isValid) {
        logger.warn('Webhook URL failed SSRF validation', {
          webhookUrl: this.maskUrl(webhookUrl),
          error: urlValidation.error,
          resolvedIp: urlValidation.resolvedIp,
        });

        return {
          success: false,
          error: `URL validation failed: ${urlValidation.error}`,
        };
      }

      // Decrypt the webhook secret
      const secret = await this.credentialService.decryptString(secretEncrypted, secretIv);

      // Generate timestamp (Unix epoch seconds)
      const timestamp = Math.floor(Date.now() / 1000).toString();

      // Serialize payload
      const payloadString = JSON.stringify(payload);

      // Create signature: HMAC-SHA256(timestamp.payload, secret)
      const signatureInput = `${timestamp}.${payloadString}`;
      const signature = `sha256=${crypto
        .createHmac('sha256', secret)
        .update(signatureInput)
        .digest('hex')}`;

      logger.debug('Dispatching outgoing webhook', {
        webhookUrl: this.maskUrl(webhookUrl),
        event: payload.event,
        messageId: payload.message.id,
        conversationId: payload.conversation.id,
        timestamp,
      });

      // Send the webhook
      const response = await axios.post(webhookUrl, payload, {
        timeout: WEBHOOK_TIMEOUT_MS,
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-Timestamp': timestamp,
        },
        // Accept 2xx responses as success
        validateStatus: (status) => status >= 200 && status < 300,
      });

      logger.info('Outgoing webhook dispatched successfully', {
        webhookUrl: this.maskUrl(webhookUrl),
        event: payload.event,
        messageId: payload.message.id,
        statusCode: response.status,
      });

      return {
        success: true,
        statusCode: response.status,
      };
    } catch (error) {
      return this.handleError(error, webhookUrl, payload);
    }
  }

  /**
   * Handle dispatch errors and categorize them.
   */
  private handleError(
    error: unknown,
    webhookUrl: string,
    payload: OutgoingWebhookPayload
  ): WebhookDispatchResult {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;

      // Network or timeout error
      if (!axiosError.response) {
        const errorMessage = axiosError.code === 'ECONNABORTED'
          ? 'Request timeout'
          : axiosError.message;

        logger.error('Outgoing webhook network error', {
          webhookUrl: this.maskUrl(webhookUrl),
          event: payload.event,
          messageId: payload.message.id,
          errorCode: axiosError.code,
          errorMessage,
        });

        return {
          success: false,
          error: `Network error: ${errorMessage}`,
        };
      }

      // HTTP error response
      const statusCode = axiosError.response.status;
      const errorMessage = this.extractErrorMessage(axiosError.response.data);

      logger.error('Outgoing webhook HTTP error', {
        webhookUrl: this.maskUrl(webhookUrl),
        event: payload.event,
        messageId: payload.message.id,
        statusCode,
        errorMessage,
      });

      return {
        success: false,
        statusCode,
        error: `HTTP ${statusCode}: ${errorMessage}`,
      };
    }

    // Unknown error (e.g., decryption failure)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    logger.error('Outgoing webhook unexpected error', {
      webhookUrl: this.maskUrl(webhookUrl),
      event: payload.event,
      messageId: payload.message.id,
      errorMessage,
    });

    return {
      success: false,
      error: errorMessage,
    };
  }

  /**
   * Extract a human-readable error message from response data.
   */
  private extractErrorMessage(data: unknown): string {
    if (!data) {
      return 'No response body';
    }

    if (typeof data === 'string') {
      return data.substring(0, 200);
    }

    if (typeof data === 'object') {
      const obj = data as Record<string, unknown>;
      // Common error message field names
      const message = obj.message || obj.error || obj.error_description;
      if (typeof message === 'string') {
        return message.substring(0, 200);
      }
    }

    return 'Unable to parse error response';
  }

  /**
   * Mask webhook URL for logging to avoid leaking sensitive paths.
   */
  private maskUrl(url: string): string {
    try {
      const parsed = new URL(url);
      // Keep host, mask path beyond first segment
      const pathParts = parsed.pathname.split('/').filter(Boolean);
      if (pathParts.length > 1) {
        parsed.pathname = '/' + pathParts[0] + '/***';
      }
      // Remove query string
      parsed.search = '';
      return parsed.toString();
    } catch {
      return '***';
    }
  }
}
