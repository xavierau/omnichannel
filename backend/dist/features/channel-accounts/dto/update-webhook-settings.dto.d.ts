/**
 * DTO for updating webhook settings.
 *
 * Validates the request body for PATCH /api/channel-accounts/:id/webhook-settings
 */
export declare class UpdateWebhookSettingsDto {
    /**
     * The webhook URL to receive event notifications.
     * Must be HTTPS in production.
     * Set to null or empty string to disable webhooks.
     */
    webhookUrl?: string | null;
    /**
     * Whether webhook events are enabled.
     * If set to false, this will clear the webhookUrl.
     */
    webhookEventsEnabled?: boolean;
}
