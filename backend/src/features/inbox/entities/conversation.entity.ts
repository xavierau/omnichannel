import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { Tenant } from '../../tenants/tenant.entity';
import { Customer } from '../../customers/customer.entity';
import { ChannelAccount } from '../../channel-accounts/channel-account.entity';
import { User } from '../../users/user.entity';
import { ConversationStatus, MessageDirection } from '../enums';
import { ConversationMessage } from './conversation-message.entity';
import { ConversationNote } from './conversation-note.entity';
import { ConversationAssignment } from './conversation-assignment.entity';

/**
 * Conversation entity represents a messaging thread between a customer
 * and the organization through a specific channel account.
 *
 * A conversation is unique per tenant-customer-channel combination.
 */
@Entity('conversations')
@Index('UQ_conversations_tenant_customer_channel', ['tenantId', 'customerId', 'channelAccountId'], {
  unique: true,
})
@Index('IDX_conversations_tenant_status', ['tenantId', 'status'])
@Index('IDX_conversations_tenant_assigned_to', ['tenantId', 'assignedToId'])
@Index('IDX_conversations_tenant_channel_account', ['tenantId', 'channelAccountId'])
@Index('IDX_conversations_tenant_last_message_at', ['tenantId', 'lastMessageAt'])
export class Conversation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'customer_id', type: 'uuid', nullable: true })
  customerId: string | null;

  @ManyToOne(() => Customer, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer | null;

  @Column({ name: 'channel_account_id' })
  channelAccountId: string;

  @ManyToOne(() => ChannelAccount, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'channel_account_id' })
  channelAccount: ChannelAccount;

  @Column({ name: 'assigned_to_id', type: 'uuid', nullable: true })
  assignedToId: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assigned_to_id' })
  assignedTo: User | null;

  @Column({
    type: 'enum',
    enum: ConversationStatus,
    enumName: 'conversation_status',
    default: ConversationStatus.UNASSIGNED,
  })
  status: ConversationStatus;

  @Column({ name: 'last_message_at', type: 'timestamp with time zone', nullable: true })
  lastMessageAt: Date | null;

  @Column({ name: 'last_message_preview', type: 'varchar', length: 255, nullable: true })
  lastMessagePreview: string | null;

  @Column({
    name: 'last_message_direction',
    type: 'enum',
    enum: MessageDirection,
    enumName: 'message_direction',
    nullable: true,
  })
  lastMessageDirection: MessageDirection | null;

  @Column({ name: 'unread_count', default: 0 })
  unreadCount: number;

  /**
   * Timestamp of the last inbound (customer) message.
   * Used for WhatsApp Cloud API 24-hour messaging window compliance.
   * When null, indicates no customer message has been received yet.
   */
  @Column({ name: 'last_customer_message_at', type: 'timestamp with time zone', nullable: true })
  lastCustomerMessageAt: Date | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @OneToMany(() => ConversationMessage, (message) => message.conversation)
  messages: ConversationMessage[];

  @OneToMany(() => ConversationNote, (note) => note.conversation)
  notes: ConversationNote[];

  @OneToMany(() => ConversationAssignment, (assignment) => assignment.conversation)
  assignments: ConversationAssignment[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
