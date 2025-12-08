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
export declare class ConversationMessage {
    id: string;
    tenantId: string;
    tenant: Tenant;
    conversationId: string;
    conversation: Conversation;
    direction: MessageDirection;
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
    content: Record<string, unknown>;
    providerMessageId: string | null;
    deliveryStatus: MessageDeliveryStatus;
    sentById: string | null;
    sentBy: User | null;
    errorMessage: string | null;
    errorCode: string | null;
    retryCount: number;
    metadata: Record<string, unknown> | null;
    sentAt: Date | null;
    deliveredAt: Date | null;
    readAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}
