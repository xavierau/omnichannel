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
 * Message delivery status enum.
 */
export enum MessageStatus {
  PENDING = 'pending',
  QUEUED = 'queued',
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed',
}

/**
 * MessageLog entity tracks individual message delivery status.
 * Each message sent through the system gets a log entry for tracking.
 */
@Entity('message_logs')
@Index(['tenantId', 'broadcastId'])
@Index(['tenantId', 'createdAt'])
@Index(['providerMessageId'])
@Index(['status'])
export class MessageLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'tenant_id' })
  tenantId: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'broadcast_id', nullable: true })
  broadcastId: string | null;

  // Note: We don't add ManyToOne to Broadcast here to avoid circular dependencies
  // The relationship can be handled at query time if needed

  @Column({ name: 'customer_id', nullable: true })
  customerId: string | null;

  @Column({ name: 'channel_account_id', nullable: true })
  channelAccountId: string | null;

  @Column({ name: 'channel_id' })
  channelId: string;

  @ManyToOne(() => Channel)
  @JoinColumn({ name: 'channel_id' })
  channel: Channel;

  @Column({ name: 'provider_id' })
  providerId: string;

  @ManyToOne(() => Provider)
  @JoinColumn({ name: 'provider_id' })
  provider: Provider;

  @Column({ length: 255 })
  recipient: string; // Phone number or email

  @Column({
    type: 'enum',
    enum: MessageStatus,
    default: MessageStatus.PENDING,
  })
  status: MessageStatus;

  @Column({ name: 'provider_message_id', length: 255, nullable: true })
  providerMessageId: string | null; // ID from the provider (wamid for Meta, etc.)

  @Column({ type: 'jsonb', name: 'template_data', nullable: true })
  templateData: Record<string, unknown> | null;

  @Column({ type: 'text', name: 'error_message', nullable: true })
  errorMessage: string | null;

  @Column({ name: 'error_code', length: 50, nullable: true })
  errorCode: string | null;

  @Column({ type: 'jsonb', name: 'provider_response', nullable: true })
  providerResponse: Record<string, unknown> | null;

  @Column({ name: 'sent_at', type: 'timestamp with time zone', nullable: true })
  sentAt: Date | null;

  @Column({ name: 'delivered_at', type: 'timestamp with time zone', nullable: true })
  deliveredAt: Date | null;

  @Column({ name: 'read_at', type: 'timestamp with time zone', nullable: true })
  readAt: Date | null;

  @Column({ name: 'failed_at', type: 'timestamp with time zone', nullable: true })
  failedAt: Date | null;

  @Column({ name: 'retry_count', default: 0 })
  retryCount: number;

  @Column({ name: 'used_fallback', default: false })
  usedFallback: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
