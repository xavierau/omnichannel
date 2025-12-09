"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailService = void 0;
const tsyringe_1 = require("tsyringe");
const nodemailer = __importStar(require("nodemailer"));
const logger_config_1 = require("../../config/logger.config");
/**
 * Email service for sending invitation emails.
 *
 * In development mode, emails are logged to console instead of being sent.
 * In production, uses SMTP via Nodemailer.
 */
let EmailService = class EmailService {
    transporter = null;
    /**
     * Get SMTP configuration from environment variables
     */
    getSmtpConfig() {
        return {
            host: process.env.SMTP_HOST || 'localhost',
            port: parseInt(process.env.SMTP_PORT || '587', 10),
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER || '',
                pass: process.env.SMTP_PASS || '',
            },
        };
    }
    /**
     * Get or create the SMTP transporter
     */
    getTransporter() {
        if (!this.transporter) {
            const config = this.getSmtpConfig();
            this.transporter = nodemailer.createTransport({
                host: config.host,
                port: config.port,
                secure: config.secure,
                auth: config.auth.user ? config.auth : undefined,
            });
        }
        return this.transporter;
    }
    /**
     * Check if we're in development mode (log emails instead of sending)
     */
    isDevelopmentMode() {
        return process.env.NODE_ENV !== 'production' || process.env.EMAIL_DEV_MODE === 'true';
    }
    /**
     * Get sender email address
     */
    getSenderEmail() {
        return process.env.EMAIL_FROM || 'noreply@example.com';
    }
    /**
     * Get sender name
     */
    getSenderName() {
        return process.env.EMAIL_FROM_NAME || 'Omnichannel Platform';
    }
    /**
     * Format expiry date for display
     */
    formatExpiryDate(date) {
        return date.toLocaleString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZoneName: 'short',
        });
    }
    /**
     * Generate HTML email content for invitation
     */
    generateInvitationHtml(data) {
        const expiryFormatted = this.formatExpiryDate(data.expiresAt);
        return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're Invited!</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">You're Invited!</h1>
  </div>

  <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px; margin-bottom: 20px;">Hello,</p>

    <p style="font-size: 16px; margin-bottom: 20px;">
      <strong>${this.escapeHtml(data.inviterName)}</strong> has invited you to join
      <strong>${this.escapeHtml(data.tenantName)}</strong> on our platform.
    </p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${this.escapeHtml(data.invitationUrl)}"
         style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
        Accept Invitation
      </a>
    </div>

    <p style="font-size: 14px; color: #666; margin-bottom: 20px;">
      Or copy and paste this link into your browser:<br>
      <a href="${this.escapeHtml(data.invitationUrl)}" style="color: #667eea; word-break: break-all;">
        ${this.escapeHtml(data.invitationUrl)}
      </a>
    </p>

    <div style="background: #f8f9fa; padding: 15px; border-radius: 6px; margin-top: 25px;">
      <p style="font-size: 13px; color: #666; margin: 0;">
        <strong>Note:</strong> This invitation will expire on ${expiryFormatted}.
      </p>
    </div>

    <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 25px 0;">

    <p style="font-size: 12px; color: #999; margin: 0;">
      If you didn't expect this invitation or don't recognize the sender, you can safely ignore this email.
    </p>
  </div>

  <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
    <p style="margin: 0;">&copy; ${new Date().getFullYear()} ${this.getSenderName()}. All rights reserved.</p>
  </div>
</body>
</html>
    `.trim();
    }
    /**
     * Generate plain text email content for invitation
     */
    generateInvitationText(data) {
        const expiryFormatted = this.formatExpiryDate(data.expiresAt);
        return `
You're Invited!

Hello,

${data.inviterName} has invited you to join ${data.tenantName} on our platform.

Accept your invitation by visiting:
${data.invitationUrl}

Note: This invitation will expire on ${expiryFormatted}.

If you didn't expect this invitation or don't recognize the sender, you can safely ignore this email.

---
${this.getSenderName()}
    `.trim();
    }
    /**
     * Escape HTML special characters to prevent XSS
     */
    escapeHtml(text) {
        const htmlEscapes = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#x27;',
        };
        return text.replace(/[&<>"']/g, (char) => htmlEscapes[char]);
    }
    /**
     * Send an invitation email.
     *
     * In development mode, the email is logged to console instead of being sent.
     * In production, sends via SMTP.
     *
     * @param data - Invitation email data
     * @throws Error if email sending fails in production
     */
    async sendInvitationEmail(data) {
        const subject = `You're invited to join ${data.tenantName}`;
        const html = this.generateInvitationHtml(data);
        const text = this.generateInvitationText(data);
        if (this.isDevelopmentMode()) {
            // Log email to console in development mode
            console.log('\n========== INVITATION EMAIL (DEV MODE) ==========');
            console.log(`To: ${data.recipientEmail}`);
            console.log(`From: ${this.getSenderName()} <${this.getSenderEmail()}>`);
            console.log(`Subject: ${subject}`);
            console.log('--------------------------------------------------');
            console.log(text);
            console.log('==================================================\n');
            logger_config_1.auditLogger.info('Invitation email logged (dev mode)', {
                to: data.recipientEmail,
                inviterName: data.inviterName,
                tenantName: data.tenantName,
                expiresAt: data.expiresAt.toISOString(),
            });
            return;
        }
        // Production mode: send via SMTP
        try {
            const transporter = this.getTransporter();
            await transporter.sendMail({
                from: `"${this.getSenderName()}" <${this.getSenderEmail()}>`,
                to: data.recipientEmail,
                subject,
                text,
                html,
            });
            logger_config_1.auditLogger.info('Invitation email sent', {
                to: data.recipientEmail,
                inviterName: data.inviterName,
                tenantName: data.tenantName,
                expiresAt: data.expiresAt.toISOString(),
            });
        }
        catch (error) {
            logger_config_1.auditLogger.error('Failed to send invitation email', {
                to: data.recipientEmail,
                error: error.message,
            });
            throw error;
        }
    }
    /**
     * Verify SMTP connection (useful for health checks)
     */
    async verifyConnection() {
        if (this.isDevelopmentMode()) {
            return true;
        }
        try {
            const transporter = this.getTransporter();
            await transporter.verify();
            return true;
        }
        catch (error) {
            logger_config_1.auditLogger.error('SMTP connection verification failed', {
                error: error.message,
            });
            return false;
        }
    }
};
exports.EmailService = EmailService;
exports.EmailService = EmailService = __decorate([
    (0, tsyringe_1.singleton)()
], EmailService);
