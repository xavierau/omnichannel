/**
 * Invitation email data
 */
interface InvitationEmailData {
    recipientEmail: string;
    inviterName: string;
    tenantName: string;
    invitationUrl: string;
    expiresAt: Date;
}
/**
 * Email service for sending invitation emails.
 *
 * In development mode, emails are logged to console instead of being sent.
 * In production, uses SMTP via Nodemailer.
 */
export declare class EmailService {
    private transporter;
    /**
     * Get SMTP configuration from environment variables
     */
    private getSmtpConfig;
    /**
     * Get or create the SMTP transporter
     */
    private getTransporter;
    /**
     * Check if we're in development mode (log emails instead of sending)
     */
    private isDevelopmentMode;
    /**
     * Get sender email address
     */
    private getSenderEmail;
    /**
     * Get sender name
     */
    private getSenderName;
    /**
     * Format expiry date for display
     */
    private formatExpiryDate;
    /**
     * Generate HTML email content for invitation
     */
    private generateInvitationHtml;
    /**
     * Generate plain text email content for invitation
     */
    private generateInvitationText;
    /**
     * Escape HTML special characters to prevent XSS
     */
    private escapeHtml;
    /**
     * Send an invitation email.
     *
     * In development mode, the email is logged to console instead of being sent.
     * In production, sends via SMTP.
     *
     * @param data - Invitation email data
     * @throws Error if email sending fails in production
     */
    sendInvitationEmail(data: InvitationEmailData): Promise<void>;
    /**
     * Verify SMTP connection (useful for health checks)
     */
    verifyConnection(): Promise<boolean>;
}
export {};
