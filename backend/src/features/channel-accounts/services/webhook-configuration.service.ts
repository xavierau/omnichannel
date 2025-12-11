import { singleton, inject } from 'tsyringe';
import * as crypto from 'crypto';
import axios from 'axios';
import { ChannelAccountRepository } from '../channel-account.repository';
import { ChannelAccount } from '../channel-account.entity';
import { CredentialService } from '../../messaging/services/credential.service';
import { logger } from '../../../config/logger.config';
import {
  NotFoundException,
  BadRequestException,
} from '../../../shared/exceptions/http-exceptions';
import { validateWebhookUrl } from '../../../shared/utils/url-validator.utils';

/**
 * DTO for updating webhook settings.
 */
export interface UpdateWebhookSettingsDto {
  webhookUrl?: string | null;
  webhookEventsEnabled?: boolean;
}

/**
 * Response for webhook settings queries.
 */
export interface WebhookSettingsResponse {
  webhookUrl: string | null;
  hasWebhookSecret: boolean;
  webhookEventsEnabled: boolean;
}

/**
 * Response for webhook secret regeneration.
 */
export interface RegenerateSecretResponse {
  secret: string;
}

/**
 * Response for webhook test operations.
 */
export interface WebhookTestResponse {
  success: boolean;
  error?: string;
  statusCode?: number;
  statusText?: string;
  challengeId?: string;
  responseTime?: number;
  message?: string;
}

/**
 * Service responsible for webhook configuration management.
 *
 * Handles webhook settings, secret management, and webhook testing
 * for channel accounts. Extracted from ChannelAccountService to maintain
 * single responsibility principle.
 */
@singleton()
export class WebhookConfigurationService {
  constructor(
    @inject(ChannelAccountRepository)
    private readonly channelAccountRepo: ChannelAccountRepository,
    @inject(CredentialService)
    private readonly credentialService: CredentialService
  ) {}

  /**
   * Get webhook settings for a channel account.
   *
   * @param id - Channel account ID
   * @param tenantId - Tenant ID for authorization
   * @returns Webhook settings response
   * @throws NotFoundException if account not found
   */
  async getWebhookSettings(
    id: string,
    tenantId: string
  ): Promise<WebhookSettingsResponse> {
    const account = await this.channelAccountRepo.findByIdAndTenant(id, tenantId);

    if (!account) {
      throw new NotFoundException('Channel account not found');
    }

    const hasWebhookSecret = !!(account.webhookSecretEncrypted && account.webhookSecretIv);
    const webhookEventsEnabled = !!account.webhookUrl;

    return {
      webhookUrl: account.webhookUrl,
      hasWebhookSecret,
      webhookEventsEnabled,
    };
  }

  /**
   * Update webhook settings for a channel account.
   *
   * @param id - Channel account ID
   * @param tenantId - Tenant ID for authorization
   * @param dto - Update data containing webhookUrl or webhookEventsEnabled
   * @returns Updated webhook settings
   * @throws NotFoundException if account not found
   * @throws BadRequestException if webhookUrl is not HTTPS
   */
  async updateWebhookSettings(
    id: string,
    tenantId: string,
    dto: UpdateWebhookSettingsDto
  ): Promise<WebhookSettingsResponse> {
    const account = await this.channelAccountRepo.findByIdAndTenant(id, tenantId);

    if (!account) {
      throw new NotFoundException('Channel account not found');
    }

    const updateData: Partial<ChannelAccount> = {};

    // Handle webhookUrl update
    if (dto.webhookUrl !== undefined) {
      if (dto.webhookUrl === null) {
        // Clear webhook URL
        updateData.webhookUrl = null;
      } else {
        // Validate HTTPS
        if (!dto.webhookUrl.startsWith('https://')) {
          throw new BadRequestException('Webhook URL must use HTTPS');
        }

        updateData.webhookUrl = dto.webhookUrl;

        // Auto-generate secret if setting webhookUrl for the first time and no secret exists
        const needsSecret = !account.webhookSecretEncrypted && !account.webhookSecretIv;
        if (needsSecret) {
          const secret = crypto.randomBytes(32).toString('hex');
          const { encrypted, iv } = await this.credentialService.encryptString(secret);
          updateData.webhookSecretEncrypted = encrypted;
          updateData.webhookSecretIv = iv;

          logger.info('Auto-generated webhook secret for channel account', {
            channelAccountId: id,
            tenantId,
          });
        }
      }
    }

    // Handle webhookEventsEnabled update (sets or clears webhookUrl indirectly)
    if (dto.webhookEventsEnabled !== undefined) {
      if (!dto.webhookEventsEnabled && dto.webhookUrl === undefined) {
        // Disable events by clearing webhook URL
        updateData.webhookUrl = null;
      }
    }

    await this.channelAccountRepo.update(id, tenantId, updateData);

    // Fetch fresh data
    const updated = await this.channelAccountRepo.findByIdAndTenant(id, tenantId);

    logger.info('Webhook settings updated', {
      channelAccountId: id,
      tenantId,
      webhookUrl: updated?.webhookUrl ? '***' : null,
    });

    return {
      webhookUrl: updated?.webhookUrl || null,
      hasWebhookSecret: !!(updated?.webhookSecretEncrypted && updated?.webhookSecretIv),
      webhookEventsEnabled: !!updated?.webhookUrl,
    };
  }

  /**
   * Regenerate webhook secret for a channel account.
   *
   * @param id - Channel account ID
   * @param tenantId - Tenant ID for authorization
   * @returns New webhook secret (only time it's shown)
   * @throws NotFoundException if account not found
   * @throws BadRequestException if webhook URL is not configured
   */
  async regenerateWebhookSecret(
    id: string,
    tenantId: string
  ): Promise<RegenerateSecretResponse> {
    const account = await this.channelAccountRepo.findByIdAndTenant(id, tenantId);

    if (!account) {
      throw new NotFoundException('Channel account not found');
    }

    if (!account.webhookUrl) {
      throw new BadRequestException('Webhook URL must be configured before generating a secret');
    }

    // Generate new secret: 32 bytes = 64 hex characters
    const secret = crypto.randomBytes(32).toString('hex');

    // Encrypt and store
    const { encrypted, iv } = await this.credentialService.encryptString(secret);

    await this.channelAccountRepo.update(id, tenantId, {
      webhookSecretEncrypted: encrypted,
      webhookSecretIv: iv,
    });

    logger.info('Webhook secret regenerated', {
      channelAccountId: id,
      tenantId,
    });

    // Return the raw secret - this is the only time it's visible
    return { secret };
  }

  /**
   * Test webhook by dispatching a test payload.
   *
   * @param id - Channel account ID
   * @param tenantId - Tenant ID for authorization
   * @returns Test result
   * @throws NotFoundException if account not found
   */
  async testWebhook(
    id: string,
    tenantId: string
  ): Promise<WebhookTestResponse> {
    const account = await this.channelAccountRepo.findByIdAndTenant(id, tenantId);

    if (!account) {
      throw new NotFoundException('Channel account not found');
    }

    if (!account.webhookUrl) {
      return {
        success: false,
        error: 'Webhook URL is not configured',
      };
    }

    if (!account.webhookSecretEncrypted || !account.webhookSecretIv) {
      return {
        success: false,
        error: 'Webhook secret is not configured',
      };
    }

    // Validate URL for SSRF
    const allowHttp = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';
    const urlValidation = await validateWebhookUrl(account.webhookUrl, allowHttp);

    if (!urlValidation.isValid) {
      return {
        success: false,
        error: `URL validation failed: ${urlValidation.error}`,
      };
    }

    try {
      // Decrypt the webhook secret
      const secret = await this.credentialService.decryptString(
        account.webhookSecretEncrypted,
        account.webhookSecretIv
      );

      // Build test payload with unique challenge ID
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const challengeId = crypto.randomBytes(16).toString('hex');
      const testPayload = {
        event: 'webhook.test',
        timestamp: new Date().toISOString(),
        channelAccountId: id,
        challengeId,
        message: 'This is a test webhook from your omnichannel platform',
      };

      const payloadString = JSON.stringify(testPayload);

      // Create signature
      const signatureInput = `${timestamp}.${payloadString}`;
      const signature = `sha256=${crypto
        .createHmac('sha256', secret)
        .update(signatureInput)
        .digest('hex')}`;

      // Send the webhook and measure response time
      const startTime = Date.now();
      const response = await axios.post(account.webhookUrl, testPayload, {
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-Timestamp': timestamp,
        },
        validateStatus: (status) => status >= 200 && status < 300,
      });
      const responseTime = Date.now() - startTime;

      logger.info('Webhook test request sent successfully', {
        channelAccountId: id,
        tenantId,
        challengeId,
        webhookUrl: account.webhookUrl,
        responseStatus: response.status,
        responseStatusText: response.statusText,
        responseTime,
        responseHeaders: response.headers,
        responseData: response.data,
      });

      return {
        success: true,
        statusCode: response.status,
        statusText: response.statusText,
        challengeId,
        responseTime,
        message: `Webhook endpoint responded with ${response.status} ${response.statusText}. Check your webhook logs for challengeId: ${challengeId}`,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const isAxiosError = axios.isAxiosError(error);

      logger.warn('Webhook test failed', {
        channelAccountId: id,
        tenantId,
        error: errorMessage,
        webhookUrl: account.webhookUrl,
        ...(isAxiosError && {
          responseStatus: error.response?.status,
          responseStatusText: error.response?.statusText,
          responseData: error.response?.data,
        }),
      });

      return {
        success: false,
        error: errorMessage,
        ...(isAxiosError && {
          statusCode: error.response?.status,
          statusText: error.response?.statusText,
        }),
      };
    }
  }
}
