import { ChannelAccountRepository } from '../channel-account.repository';
import { CredentialService } from '../../messaging/services/credential.service';
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
export declare class WebhookConfigurationService {
    private readonly channelAccountRepo;
    private readonly credentialService;
    constructor(channelAccountRepo: ChannelAccountRepository, credentialService: CredentialService);
    /**
     * Get webhook settings for a channel account.
     *
     * @param id - Channel account ID
     * @param tenantId - Tenant ID for authorization
     * @returns Webhook settings response
     * @throws NotFoundException if account not found
     */
    getWebhookSettings(id: string, tenantId: string): Promise<WebhookSettingsResponse>;
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
    updateWebhookSettings(id: string, tenantId: string, dto: UpdateWebhookSettingsDto): Promise<WebhookSettingsResponse>;
    /**
     * Regenerate webhook secret for a channel account.
     *
     * @param id - Channel account ID
     * @param tenantId - Tenant ID for authorization
     * @returns New webhook secret (only time it's shown)
     * @throws NotFoundException if account not found
     * @throws BadRequestException if webhook URL is not configured
     */
    regenerateWebhookSecret(id: string, tenantId: string): Promise<RegenerateSecretResponse>;
    /**
     * Test webhook by dispatching a test payload.
     *
     * @param id - Channel account ID
     * @param tenantId - Tenant ID for authorization
     * @returns Test result
     * @throws NotFoundException if account not found
     */
    testWebhook(id: string, tenantId: string): Promise<WebhookTestResponse>;
}
