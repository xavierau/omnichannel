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
export declare class Conversation {
    id: string;
    tenantId: string;
    tenant: Tenant;
    customerId: string | null;
    customer: Customer | null;
    channelAccountId: string;
    channelAccount: ChannelAccount;
    assignedToId: string | null;
    assignedTo: User | null;
    status: ConversationStatus;
    lastMessageAt: Date | null;
    lastMessagePreview: string | null;
    lastMessageDirection: MessageDirection | null;
    unreadCount: number;
    /**
     * Timestamp of the last inbound (customer) message.
     * Used for WhatsApp Cloud API 24-hour messaging window compliance.
     * When null, indicates no customer message has been received yet.
     */
    lastCustomerMessageAt: Date | null;
    metadata: Record<string, unknown> | null;
    messages: ConversationMessage[];
    notes: ConversationNote[];
    assignments: ConversationAssignment[];
    createdAt: Date;
    updatedAt: Date;
}
