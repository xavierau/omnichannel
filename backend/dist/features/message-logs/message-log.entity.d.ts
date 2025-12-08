import { Tenant } from '../tenants/tenant.entity';
import { Channel } from '../channels/channel.entity';
import { Provider } from '../providers/provider.entity';
/**
 * Message delivery status enum.
 */
export declare enum MessageStatus {
    PENDING = "pending",
    QUEUED = "queued",
    SENT = "sent",
    DELIVERED = "delivered",
    READ = "read",
    FAILED = "failed"
}
/**
 * MessageLog entity tracks individual message delivery status.
 * Each message sent through the system gets a log entry for tracking.
 */
export declare class MessageLog {
    id: string;
    tenantId: string;
    tenant: Tenant;
    broadcastId: string | null;
    customerId: string | null;
    channelAccountId: string | null;
    channelId: string;
    channel: Channel;
    providerId: string;
    provider: Provider;
    recipient: string;
    status: MessageStatus;
    providerMessageId: string | null;
    templateData: Record<string, unknown> | null;
    errorMessage: string | null;
    errorCode: string | null;
    providerResponse: Record<string, unknown> | null;
    sentAt: Date | null;
    deliveredAt: Date | null;
    readAt: Date | null;
    failedAt: Date | null;
    retryCount: number;
    usedFallback: boolean;
    createdAt: Date;
    updatedAt: Date;
}
