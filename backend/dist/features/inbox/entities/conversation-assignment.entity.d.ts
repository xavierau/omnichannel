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
export declare class ConversationAssignment {
    id: string;
    tenantId: string;
    tenant: Tenant;
    conversationId: string;
    conversation: Conversation;
    fromUserId: string | null;
    fromUser: User | null;
    toUserId: string | null;
    toUser: User | null;
    action: AssignmentAction;
    performedById: string | null;
    performedBy: User | null;
    reason: string | null;
    createdAt: Date;
}
