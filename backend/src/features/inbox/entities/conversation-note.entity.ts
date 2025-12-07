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
import { Customer } from '../../customers/customer.entity';
import { User } from '../../users/user.entity';
import { Conversation } from './conversation.entity';
import { NoteScope } from '../enums';

/**
 * Mention represents a user reference within a note.
 */
export interface NoteMention {
  userId: string;
  offset: number;
  length: number;
}

/**
 * ConversationNote entity represents an internal note attached to a conversation
 * or customer.
 *
 * Notes support @mentions of team members for collaboration.
 */
@Entity('conversation_notes')
@Index('IDX_conversation_notes_tenant_conversation', ['tenantId', 'conversationId'])
@Index('IDX_conversation_notes_tenant_customer', ['tenantId', 'customerId'])
export class ConversationNote {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'conversation_id' })
  conversationId: string;

  @ManyToOne(() => Conversation, (conversation) => conversation.notes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'conversation_id' })
  conversation: Conversation;

  @Column({ name: 'customer_id', type: 'uuid', nullable: true })
  customerId: string | null;

  @ManyToOne(() => Customer, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer | null;

  @Column({ name: 'created_by_id', type: 'uuid', nullable: true })
  createdById: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: User | null;

  @Column({
    type: 'enum',
    enum: NoteScope,
    enumName: 'note_scope',
    default: NoteScope.CONVERSATION,
  })
  scope: NoteScope;

  @Column({ type: 'text' })
  content: string;

  /**
   * Array of user mentions within the note content.
   * Each mention includes the user ID and the position in the content string.
   */
  @Column({ type: 'jsonb', default: [] })
  mentions: NoteMention[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
