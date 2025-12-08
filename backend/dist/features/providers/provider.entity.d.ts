import { Channel } from '../channels/channel.entity';
/**
 * Provider configuration schema defines what credentials are required.
 */
export interface ProviderConfigSchema {
    type: 'object';
    required: string[];
    properties: Record<string, {
        type: string;
        description: string;
        sensitive?: boolean;
    }>;
}
/**
 * Webhook configuration for provider callbacks.
 */
export interface ProviderWebhookConfig {
    signatureHeader: string;
    signatureAlgorithm: 'sha256' | 'sha1';
    verificationMethod: 'hmac' | 'asymmetric';
}
/**
 * Rate limit configuration.
 */
export interface ProviderRateLimitConfig {
    messagesPerSecond?: number;
    messagesPerMinute?: number;
    messagesPerDay?: number;
}
/**
 * Provider entity represents messaging providers (Meta, Twilio, etc.).
 * Providers are system-level definitions linked to a channel type.
 */
export declare class Provider {
    id: string;
    channelId: string;
    channel: Channel;
    code: string;
    name: string;
    description: string | null;
    configSchema: ProviderConfigSchema;
    webhookConfig: ProviderWebhookConfig | null;
    isActive: boolean;
    supportsTemplates: boolean;
    rateLimits: ProviderRateLimitConfig | null;
    createdAt: Date;
    updatedAt: Date;
}
