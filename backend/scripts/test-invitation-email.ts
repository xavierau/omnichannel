/**
 * Test script for invitation email service
 *
 * Usage:
 *   npx ts-node scripts/test-invitation-email.ts
 *
 * Or with custom recipient:
 *   npx ts-node scripts/test-invitation-email.ts test@example.com
 */

import * as nodemailer from 'nodemailer';
import * as crypto from 'crypto';

// AWS Credentials from environment
const AWS_ACCESS_KEY = process.env.AWS_SES_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_KEY = process.env.AWS_SES_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;
const AWS_REGION = process.env.AWS_REGION || 'ap-southeast-1';

// Validate required environment variables
if (!AWS_ACCESS_KEY || !AWS_SECRET_KEY) {
  console.error('❌ Missing required AWS credentials:');
  if (!AWS_ACCESS_KEY) console.error('   - AWS_SES_ACCESS_KEY_ID or AWS_ACCESS_KEY_ID');
  if (!AWS_SECRET_KEY) console.error('   - AWS_SES_SECRET_ACCESS_KEY or AWS_SECRET_ACCESS_KEY');
  console.error('\nPlease set these in your .env file or environment.');
  process.exit(1);
}

/**
 * Derive SMTP password from AWS Secret Access Key
 * AWS SES uses a specific algorithm to convert IAM credentials to SMTP credentials
 */
function deriveSmtpPassword(secretAccessKey: string, region: string): string {
  const DATE = '11111111';
  const SERVICE = 'ses';
  const TERMINAL = 'aws4_request';
  const MESSAGE = 'SendRawEmail';
  const VERSION = 0x04;

  const sign = (key: Buffer, message: string): Buffer => {
    return crypto.createHmac('sha256', key).update(message, 'utf8').digest();
  };

  const kDate = sign(Buffer.from('AWS4' + secretAccessKey, 'utf8'), DATE);
  const kRegion = sign(kDate, region);
  const kService = sign(kRegion, SERVICE);
  const kTerminal = sign(kService, TERMINAL);
  const kMessage = sign(kTerminal, MESSAGE);

  const signatureAndVersion = Buffer.concat([Buffer.from([VERSION]), kMessage]);
  return signatureAndVersion.toString('base64');
}

// SMTP Configuration derived from AWS credentials
const SMTP_PASSWORD = deriveSmtpPassword(AWS_SECRET_KEY, AWS_REGION);

const SMTP_CONFIG = {
  host: `email-smtp.${AWS_REGION}.amazonaws.com`,
  port: 587,
  secure: false, // STARTTLS
  auth: {
    user: AWS_ACCESS_KEY,
    pass: SMTP_PASSWORD,
  },
};

const SENDER = 'noreply@omnichannel.phbsolution.com';
const SENDER_NAME = 'Omnichannel Platform';

/**
 * Format expiry date for display
 */
function formatExpiryDate(date: Date): string {
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
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  const htmlEscapes: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
  };
  return text.replace(/[&<>"']/g, (char) => htmlEscapes[char]);
}

/**
 * Generate HTML email content for invitation
 */
function generateInvitationHtml(data: {
  recipientEmail: string;
  inviterName: string;
  tenantName: string;
  invitationUrl: string;
  expiresAt: Date;
}): string {
  const expiryFormatted = formatExpiryDate(data.expiresAt);

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
      <strong>${escapeHtml(data.inviterName)}</strong> has invited you to join
      <strong>${escapeHtml(data.tenantName)}</strong> on our platform.
    </p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${escapeHtml(data.invitationUrl)}"
         style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
        Accept Invitation
      </a>
    </div>

    <p style="font-size: 14px; color: #666; margin-bottom: 20px;">
      Or copy and paste this link into your browser:<br>
      <a href="${escapeHtml(data.invitationUrl)}" style="color: #667eea; word-break: break-all;">
        ${escapeHtml(data.invitationUrl)}
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
    <p style="margin: 0;">&copy; ${new Date().getFullYear()} ${SENDER_NAME}. All rights reserved.</p>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Generate plain text email content
 */
function generateInvitationText(data: {
  recipientEmail: string;
  inviterName: string;
  tenantName: string;
  invitationUrl: string;
  expiresAt: Date;
}): string {
  const expiryFormatted = formatExpiryDate(data.expiresAt);

  return `
You're Invited!

Hello,

${data.inviterName} has invited you to join ${data.tenantName} on our platform.

Accept your invitation by visiting:
${data.invitationUrl}

Note: This invitation will expire on ${expiryFormatted}.

If you didn't expect this invitation or don't recognize the sender, you can safely ignore this email.

---
${SENDER_NAME}
  `.trim();
}

async function testSmtpConnection(): Promise<boolean> {
  console.log('\n=== Testing SMTP Connection ===\n');
  console.log('SMTP Host:', SMTP_CONFIG.host);
  console.log('SMTP Port:', SMTP_CONFIG.port);
  console.log('SMTP User:', SMTP_CONFIG.auth.user);
  console.log('Sender:', SENDER);

  const transporter = nodemailer.createTransport(SMTP_CONFIG);

  try {
    console.log('\nVerifying SMTP connection...');
    await transporter.verify();
    console.log('✅ SMTP connection verified successfully!\n');
    return true;
  } catch (error) {
    console.error('❌ SMTP connection failed:', (error as Error).message);
    return false;
  }
}

async function sendTestInvitationEmail(recipientEmail: string): Promise<void> {
  console.log('\n=== Sending Test Invitation Email ===\n');
  console.log('Recipient:', recipientEmail);

  const transporter = nodemailer.createTransport(SMTP_CONFIG);

  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 48);

  const emailData = {
    recipientEmail,
    inviterName: 'Test Admin',
    tenantName: 'Demo Organization',
    invitationUrl: 'http://localhost:5173/accept-invitation?token=test-token-12345',
    expiresAt,
  };

  const subject = `[TEST] You're invited to join ${emailData.tenantName}`;
  const html = generateInvitationHtml(emailData);
  const text = generateInvitationText(emailData);

  try {
    const info = await transporter.sendMail({
      from: `"${SENDER_NAME}" <${SENDER}>`,
      to: recipientEmail,
      subject,
      text,
      html,
    });

    console.log('✅ Email sent successfully!');
    console.log('Message ID:', info.messageId);
    console.log('Response:', info.response);
  } catch (error) {
    console.error('❌ Failed to send email:', (error as Error).message);
    throw error;
  }
}

async function main(): Promise<void> {
  console.log('========================================');
  console.log('  Invitation Email Service Test Script');
  console.log('========================================');

  // Get recipient from command line args or use default
  const recipient = process.argv[2] || 'test@example.com';

  // Test 1: SMTP Connection
  const connectionOk = await testSmtpConnection();
  if (!connectionOk) {
    console.log('\n⚠️  Skipping email send test due to connection failure.');
    process.exit(1);
  }

  // Test 2: Send test email
  if (recipient === 'test@example.com') {
    console.log('\n⚠️  Using default test email. To send a real test:');
    console.log('   npx ts-node scripts/test-invitation-email.ts your@email.com\n');
    console.log('Skipping actual email send (use real email to test).');
  } else {
    await sendTestInvitationEmail(recipient);
  }

  console.log('\n========================================');
  console.log('  Test Complete!');
  console.log('========================================\n');
}

main().catch((error) => {
  console.error('\n❌ Script failed:', error.message);
  process.exit(1);
});
