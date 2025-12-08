/**
 * Template translation status values.
 *
 * These map to Meta's template status values.
 * @see https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/components#message_template_status_update
 */
export declare enum TemplateStatus {
    APPROVED = "approved",
    PENDING = "pending",
    REJECTED = "rejected",
    DISABLED = "disabled",
    PAUSED = "paused",
    PENDING_DELETION = "pending_deletion",
    IN_APPEAL = "in_appeal",
    FLAGGED = "flagged",
    LIMIT_EXCEEDED = "limit_exceeded"
}
