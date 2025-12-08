"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SeedChannelsAndProviders1733500001000 = void 0;
class SeedChannelsAndProviders1733500001000 {
    name = 'SeedChannelsAndProviders1733500001000';
    async up(queryRunner) {
        // Seed channels
        await queryRunner.query(`
      INSERT INTO "channels" ("code", "name", "description", "is_active", "required_customer_fields") VALUES
      ('whatsapp', 'WhatsApp', 'WhatsApp Business messaging via WhatsApp Business API', true, '["whatsappNumber"]'),
      ('sms', 'SMS', 'Short Message Service for text messaging', false, '["phoneNumber"]'),
      ('email', 'Email', 'Email messaging', false, '["email"]')
    `);
        // Get channel IDs
        const channels = await queryRunner.query(`SELECT id, code FROM channels`);
        const whatsappId = channels.find((c) => c.code === 'whatsapp')
            .id;
        const smsId = channels.find((c) => c.code === 'sms').id;
        // Meta Cloud API config schema
        const metaConfigSchema = JSON.stringify({
            type: 'object',
            required: ['phoneNumberId', 'whatsappBusinessAccountId', 'accessToken', 'appId', 'appSecret'],
            properties: {
                phoneNumberId: {
                    type: 'string',
                    description: 'WhatsApp Phone Number ID from Meta Business Manager',
                    sensitive: false,
                },
                whatsappBusinessAccountId: {
                    type: 'string',
                    description: 'WhatsApp Business Account ID from Meta Business Manager',
                    sensitive: false,
                },
                accessToken: {
                    type: 'string',
                    description: 'Meta Access Token (System User Token or temporary token)',
                    sensitive: true,
                },
                appId: {
                    type: 'string',
                    description: 'Meta App ID',
                    sensitive: false,
                },
                appSecret: {
                    type: 'string',
                    description: 'Meta App Secret',
                    sensitive: true,
                },
            },
        });
        // Meta webhook config
        const metaWebhookConfig = JSON.stringify({
            signatureHeader: 'x-hub-signature-256',
            signatureAlgorithm: 'sha256',
            verificationMethod: 'hmac',
        });
        // Twilio WhatsApp config schema
        const twilioWhatsAppConfigSchema = JSON.stringify({
            type: 'object',
            required: ['accountSid', 'authToken', 'fromNumber'],
            properties: {
                accountSid: {
                    type: 'string',
                    description: 'Twilio Account SID',
                    sensitive: false,
                },
                authToken: {
                    type: 'string',
                    description: 'Twilio Auth Token',
                    sensitive: true,
                },
                fromNumber: {
                    type: 'string',
                    description: 'Twilio WhatsApp sender number (with whatsapp: prefix)',
                    sensitive: false,
                },
                contentSid: {
                    type: 'string',
                    description: 'Content Template SID (optional)',
                    sensitive: false,
                },
            },
        });
        // Twilio webhook config
        const twilioWebhookConfig = JSON.stringify({
            signatureHeader: 'x-twilio-signature',
            signatureAlgorithm: 'sha1',
            verificationMethod: 'hmac',
        });
        // Dialogue360 config schema
        const dialogue360ConfigSchema = JSON.stringify({
            type: 'object',
            required: ['apiKey', 'channelId'],
            properties: {
                apiKey: {
                    type: 'string',
                    description: 'Dialogue360 API Key',
                    sensitive: true,
                },
                channelId: {
                    type: 'string',
                    description: 'Dialogue360 Channel ID',
                    sensitive: false,
                },
                baseUrl: {
                    type: 'string',
                    description: 'API Base URL (optional, defaults to production)',
                    sensitive: false,
                },
            },
        });
        // Infobip config schema
        const infobipConfigSchema = JSON.stringify({
            type: 'object',
            required: ['apiKey', 'baseUrl', 'sender'],
            properties: {
                apiKey: {
                    type: 'string',
                    description: 'Infobip API Key',
                    sensitive: true,
                },
                baseUrl: {
                    type: 'string',
                    description: 'Infobip API Base URL (e.g., https://xxxxx.api.infobip.com)',
                    sensitive: false,
                },
                sender: {
                    type: 'string',
                    description: 'Sender phone number',
                    sensitive: false,
                },
            },
        });
        // Twilio SMS config schema
        const twilioSmsConfigSchema = JSON.stringify({
            type: 'object',
            required: ['accountSid', 'authToken', 'fromNumber'],
            properties: {
                accountSid: {
                    type: 'string',
                    description: 'Twilio Account SID',
                    sensitive: false,
                },
                authToken: {
                    type: 'string',
                    description: 'Twilio Auth Token',
                    sensitive: true,
                },
                fromNumber: {
                    type: 'string',
                    description: 'Twilio SMS sender number',
                    sensitive: false,
                },
            },
        });
        // Seed WhatsApp providers
        await queryRunner.query(`
      INSERT INTO "providers" ("channel_id", "code", "name", "description", "config_schema", "webhook_config", "is_active", "supports_templates") VALUES
      (
        '${whatsappId}',
        'meta_cloud_api',
        'Meta Cloud API',
        'Direct integration with Meta WhatsApp Business Cloud API. Recommended for businesses with high message volumes.',
        '${metaConfigSchema.replace(/'/g, "''")}',
        '${metaWebhookConfig.replace(/'/g, "''")}',
        true,
        true
      ),
      (
        '${whatsappId}',
        'twilio_whatsapp',
        'Twilio WhatsApp',
        'WhatsApp messaging via Twilio. Good for businesses already using Twilio for other channels.',
        '${twilioWhatsAppConfigSchema.replace(/'/g, "''")}',
        '${twilioWebhookConfig.replace(/'/g, "''")}',
        false,
        true
      ),
      (
        '${whatsappId}',
        'dialogue360',
        'Dialogue360',
        'WhatsApp messaging via Dialogue360 platform.',
        '${dialogue360ConfigSchema.replace(/'/g, "''")}',
        NULL,
        false,
        true
      ),
      (
        '${whatsappId}',
        'infobip',
        'Infobip',
        'WhatsApp messaging via Infobip omnichannel platform.',
        '${infobipConfigSchema.replace(/'/g, "''")}',
        NULL,
        false,
        true
      )
    `);
        // Seed SMS providers
        await queryRunner.query(`
      INSERT INTO "providers" ("channel_id", "code", "name", "description", "config_schema", "is_active", "supports_templates") VALUES
      (
        '${smsId}',
        'twilio_sms',
        'Twilio SMS',
        'SMS messaging via Twilio.',
        '${twilioSmsConfigSchema.replace(/'/g, "''")}',
        false,
        false
      )
    `);
    }
    async down(queryRunner) {
        await queryRunner.query(`DELETE FROM "providers"`);
        await queryRunner.query(`DELETE FROM "channels"`);
    }
}
exports.SeedChannelsAndProviders1733500001000 = SeedChannelsAndProviders1733500001000;
