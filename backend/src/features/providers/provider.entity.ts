import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Channel } from '../channels/channel.entity';

/**
 * Provider configuration schema defines what credentials are required.
 */
export interface ProviderConfigSchema {
  type: 'object';
  required: string[];
  properties: Record<
    string,
    {
      type: string;
      description: string;
      sensitive?: boolean; // Mark fields that need encryption
    }
  >;
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
@Entity('providers')
@Index(['code'], { unique: true })
export class Provider {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'channel_id' })
  channelId: string;

  @ManyToOne(() => Channel, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'channel_id' })
  channel: Channel;

  @Column({ length: 50 })
  code: string; // 'meta_cloud_api', 'twilio_whatsapp', 'dialogue360', 'infobip'

  @Column({ length: 100 })
  name: string; // 'Meta Cloud API', 'Twilio WhatsApp', etc.

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'jsonb', name: 'config_schema' })
  configSchema: ProviderConfigSchema;

  @Column({ type: 'jsonb', name: 'webhook_config', nullable: true })
  webhookConfig: ProviderWebhookConfig | null;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'supports_templates', default: true })
  supportsTemplates: boolean;

  @Column({ type: 'jsonb', name: 'rate_limits', nullable: true })
  rateLimits: ProviderRateLimitConfig | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
