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
import { Tenant } from '../tenants/tenant.entity';
import { Channel } from '../channels/channel.entity';
import { Provider } from '../providers/provider.entity';

/**
 * Channel account status enum.
 */
export enum ChannelAccountStatus {
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  ERROR = 'error',
}

/**
 * ChannelAccount entity represents a tenant's configured messaging account.
 * Each tenant can have multiple channel accounts (e.g., "Marketing Line", "Support Line").
 * Each account is linked to a specific provider (Meta, Twilio, etc.).
 */
@Entity('channel_accounts')
@Index(['tenantId', 'channelId'])
@Index(['tenantId', 'isPrimary'])
export class ChannelAccount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'tenant_id' })
  tenantId: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'channel_id' })
  channelId: string;

  @ManyToOne(() => Channel, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'channel_id' })
  channel: Channel;

  @Column({ name: 'provider_id' })
  providerId: string;

  @ManyToOne(() => Provider, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'provider_id' })
  provider: Provider;

  @Column({ length: 255 })
  name: string; // Display name: "Marketing Line", "Customer Support"

  @Column({ name: 'phone_number', type: 'varchar', length: 50, nullable: true })
  phoneNumber: string | null; // Display phone number: "+1 555-123-4567"

  /**
   * Provider-specific phone number ID.
   * For Meta/WhatsApp: This is the phone_number_id used in API calls and webhooks.
   * Used for efficient webhook routing without credential decryption.
   */
  @Index('IDX_channel_accounts_phone_number_id')
  @Column({ name: 'phone_number_id', type: 'varchar', length: 100, nullable: true })
  phoneNumberId: string | null;

  /**
   * Encrypted provider credentials (AES-256-GCM).
   * The structure depends on the provider:
   * - Meta: { phoneNumberId, whatsappBusinessAccountId, accessToken, appId, appSecret }
   * - Twilio: { accountSid, authToken, fromNumber }
   */
  @Column({ type: 'text', name: 'encrypted_credentials' })
  encryptedCredentials: string;

  @Column({ type: 'text', name: 'credentials_iv' })
  credentialsIv: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'is_primary', default: false })
  isPrimary: boolean; // Default account for this channel type

  @Column({
    type: 'enum',
    enum: ChannelAccountStatus,
    default: ChannelAccountStatus.DISCONNECTED,
  })
  status: ChannelAccountStatus;

  @Column({ name: 'last_tested_at', type: 'timestamp with time zone', nullable: true })
  lastTestedAt: Date | null;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;

  @Column({ name: 'webhook_url', type: 'varchar', length: 500, nullable: true })
  webhookUrl: string | null;

  @Column({ type: 'text', name: 'webhook_secret_encrypted', nullable: true })
  webhookSecretEncrypted: string | null;

  @Column({ type: 'text', name: 'webhook_secret_iv', nullable: true })
  webhookSecretIv: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
