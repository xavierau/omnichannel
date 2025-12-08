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
export declare class ConversationNote {
    id: string;
    tenantId: string;
    tenant: Tenant;
    conversationId: string;
    conversation: Conversation;
    customerId: string | null;
    customer: Customer | null;
    createdById: string | null;
    createdBy: User | null;
    scope: NoteScope;
    content: string;
    /**
     * Array of user mentions within the note content.
     * Each mention includes the user ID and the position in the content string.
     */
    mentions: NoteMention[];
    createdAt: Date;
    updatedAt: Date;
}
