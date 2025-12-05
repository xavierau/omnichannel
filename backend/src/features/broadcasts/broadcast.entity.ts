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
import { User } from '../users/user.entity';
import { WhatsAppTemplateGroup } from '../templates/template-group.entity';
import { CustomerGroup } from '../groups/group.entity';
import { ChannelAccount } from '../channel-accounts/channel-account.entity';
import { BroadcastStatus, RecipientType } from './enums';
import { TemplateCategory } from '../templates/enums';

export interface VariableConfig {
  index: number;
  sourceType: 'static' | 'customer_field';
  staticValue?: string;
  customerField?: string;
}

export interface HeaderConfig {
  type: 'text' | 'image' | 'video' | 'document';
  textVariable?: VariableConfig;
  mediaUrl?: string;
}

export interface ButtonVariableConfig {
  buttonIndex: number;
  variable: VariableConfig;
}

export interface TemplateVariablesConfig {
  header?: HeaderConfig;
  bodyVariables: VariableConfig[];
  buttonVariables: ButtonVariableConfig[];
}

@Entity('broadcasts')
@Index(['tenantId', 'status'])
@Index(['tenantId', 'scheduledAt'])
export class Broadcast {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'tenant_id' })
  tenantId: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  // Template Reference
  @Index()
  @Column({ name: 'template_id' })
  templateId: string;

  @ManyToOne(() => WhatsAppTemplateGroup, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'template_id' })
  template: WhatsAppTemplateGroup | null;

  @Column({ name: 'template_name', length: 255 })
  templateName: string;

  @Column({
    type: 'enum',
    enum: TemplateCategory,
    name: 'template_category',
  })
  templateCategory: TemplateCategory;

  @Column({ name: 'template_language', length: 10 })
  templateLanguage: string;

  // Channel Account - which WhatsApp number/provider to use
  @Index()
  @Column({ name: 'channel_account_id', nullable: true })
  channelAccountId: string | null;

  @ManyToOne(() => ChannelAccount, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'channel_account_id' })
  channelAccount: ChannelAccount | null;

  // Recipients
  @Column({
    type: 'enum',
    enum: RecipientType,
    name: 'recipient_type',
  })
  recipientType: RecipientType;

  @Column({ name: 'group_id', nullable: true })
  groupId: string | null;

  @ManyToOne(() => CustomerGroup, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'group_id' })
  group: CustomerGroup | null;

  @Column({ type: 'jsonb', name: 'customer_ids', nullable: true })
  customerIds: string[] | null;

  @Column({ name: 'total_recipients', default: 0 })
  totalRecipients: number;

  // Template Variables Configuration
  @Column({ type: 'jsonb', name: 'template_variables' })
  templateVariables: TemplateVariablesConfig;

  // Scheduling
  @Index()
  @Column({ name: 'scheduled_at', type: 'timestamp with time zone', nullable: true })
  scheduledAt: Date | null;

  @Column({ name: 'is_immediate', default: false })
  isImmediate: boolean;

  @Column({ length: 50, default: 'UTC' })
  timezone: string;

  // Status & Metrics
  @Index()
  @Column({
    type: 'enum',
    enum: BroadcastStatus,
    default: BroadcastStatus.DRAFT,
  })
  status: BroadcastStatus;

  @Column({ name: 'sent_count', default: 0 })
  sentCount: number;

  @Column({ name: 'delivered_count', default: 0 })
  deliveredCount: number;

  @Column({ name: 'read_count', default: 0 })
  readCount: number;

  @Column({ name: 'failed_count', default: 0 })
  failedCount: number;

  // Audit
  @Index()
  @Column({ name: 'created_by' })
  createdBy: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'created_by' })
  creator: User | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'started_at', type: 'timestamp with time zone', nullable: true })
  startedAt: Date | null;

  @Column({ name: 'completed_at', type: 'timestamp with time zone', nullable: true })
  completedAt: Date | null;

  @Column({
    type: 'enum',
    enum: BroadcastStatus,
    name: 'previous_status',
    nullable: true,
  })
  previousStatus: BroadcastStatus | null;

  // Custom Fields
  @Column({ type: 'jsonb', name: 'custom_fields', nullable: true, default: {} })
  customFields: Record<string, unknown>;
}
