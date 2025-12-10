import { IsOptional, IsString, IsBoolean, IsUrl, ValidateIf } from 'class-validator';

/**
 * DTO for updating webhook settings.
 *
 * Validates the request body for PATCH /api/channel-accounts/:id/webhook-settings
 */
export class UpdateWebhookSettingsDto {
  /**
   * The webhook URL to receive event notifications.
   * Must be HTTPS in production.
   * Set to null or empty string to disable webhooks.
   */
  @IsOptional()
  @ValidateIf((o) => o.webhookUrl !== null && o.webhookUrl !== '')
  @IsString()
  @IsUrl(
    {
      protocols: ['https'],
      require_protocol: true,
      require_tld: true,
    },
    { message: 'webhookUrl must be a valid HTTPS URL' }
  )
  webhookUrl?: string | null;

  /**
   * Whether webhook events are enabled.
   * If set to false, this will clear the webhookUrl.
   */
  @IsOptional()
  @IsBoolean()
  webhookEventsEnabled?: boolean;
}
