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
import { Tenant } from '../../tenants/tenant.entity';
import { User } from '../../users/user.entity';
import { Conversation } from './conversation.entity';
import { MessageDirection, MessageContentType, MessageDeliveryStatus } from '../enums';

/**
 * ConversationMessage entity represents an individual message within a conversation.
 *
 * Messages can be inbound (from customer) or outbound (to customer).
 * The content field is JSONB to support various content types with their specific structures.
 */
@Entity('conversation_messages')
@Index('IDX_conversation_messages_conversation_created', ['conversationId', 'createdAt'])
@Index('IDX_conversation_messages_provider_message_id', ['providerMessageId'])
@Index('IDX_conversation_messages_tenant_conversation_direction', [
  'tenantId',
  'conversationId',
  'direction',
])
export class ConversationMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'conversation_id' })
  conversationId: string;

  @ManyToOne(() => Conversation, (conversation) => conversation.messages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'conversation_id' })
  conversation: Conversation;

  @Column({
    type: 'enum',
    enum: MessageDirection,
    enumName: 'message_direction',
  })
  direction: MessageDirection;

  @Column({
    name: 'content_type',
    type: 'enum',
    enum: MessageContentType,
    enumName: 'message_content_type',
  })
  contentType: MessageContentType;

  /**
   * Message content stored as JSONB.
   * Structure varies by content_type:
   * - text: { body: string }
   * - image/video/audio/document: { url: string, caption?: string, filename?: string, mimeType?: string }
   * - template: { name: string, language: string, components: object[] }
   * - location: { latitude: number, longitude: number, name?: string, address?: string }
   * - sticker: { url: string }
   */
  @Column({ type: 'jsonb' })
  content: Record<string, unknown>;

  @Column({ name: 'provider_message_id', type: 'varchar', length: 255, nullable: true })
  providerMessageId: string | null;

  @Column({
    name: 'delivery_status',
    type: 'enum',
    enum: MessageDeliveryStatus,
    enumName: 'message_delivery_status',
    default: MessageDeliveryStatus.PENDING,
  })
  deliveryStatus: MessageDeliveryStatus;

  @Column({ name: 'sent_by_id', type: 'uuid', nullable: true })
  sentById: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'sent_by_id' })
  sentBy: User | null;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;

  @Column({ name: 'error_code', type: 'varchar', length: 50, nullable: true })
  errorCode: string | null;

  @Column({ name: 'retry_count', default: 0 })
  retryCount: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @Column({ name: 'sent_at', type: 'timestamp with time zone', nullable: true })
  sentAt: Date | null;

  @Column({ name: 'delivered_at', type: 'timestamp with time zone', nullable: true })
  deliveredAt: Date | null;

  @Column({ name: 'read_at', type: 'timestamp with time zone', nullable: true })
  readAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
