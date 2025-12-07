import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Tenant } from '../../tenants/tenant.entity';
import { User } from '../../users/user.entity';
import { Conversation } from './conversation.entity';
import { AssignmentAction } from '../enums';

/**
 * ConversationAssignment entity provides an audit trail for conversation
 * assignment changes.
 *
 * This table is append-only - assignments are never updated or deleted,
 * providing a complete history of who handled the conversation.
 */
@Entity('conversation_assignments')
@Index('IDX_conversation_assignments_tenant_conversation_created', [
  'tenantId',
  'conversationId',
  'createdAt',
])
export class ConversationAssignment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'conversation_id' })
  conversationId: string;

  @ManyToOne(() => Conversation, (conversation) => conversation.assignments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'conversation_id' })
  conversation: Conversation;

  @Column({ name: 'from_user_id', type: 'uuid', nullable: true })
  fromUserId: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'from_user_id' })
  fromUser: User | null;

  @Column({ name: 'to_user_id', type: 'uuid', nullable: true })
  toUserId: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'to_user_id' })
  toUser: User | null;

  @Column({
    type: 'enum',
    enum: AssignmentAction,
    enumName: 'assignment_action',
  })
  action: AssignmentAction;

  @Column({ name: 'performed_by_id', type: 'uuid', nullable: true })
  performedById: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'performed_by_id' })
  performedBy: User | null;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
