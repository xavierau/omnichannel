import { Tenant } from '../tenants/tenant.entity';
import { Channel } from '../channels/channel.entity';
import { Provider } from '../providers/provider.entity';
/**
 * Channel account status enum.
 */
export declare enum ChannelAccountStatus {
    CONNECTED = "connected",
    DISCONNECTED = "disconnected",
    ERROR = "error"
}
/**
 * ChannelAccount entity represents a tenant's configured messaging account.
 * Each tenant can have multiple channel accounts (e.g., "Marketing Line", "Support Line").
 * Each account is linked to a specific provider (Meta, Twilio, etc.).
 */
export declare class ChannelAccount {
    id: string;
    tenantId: string;
    tenant: Tenant;
    channelId: string;
    channel: Channel;
    providerId: string;
    provider: Provider;
    name: string;
    phoneNumber: string | null;
    /**
     * Provider-specific phone number ID.
     * For Meta/WhatsApp: This is the phone_number_id used in API calls and webhooks.
     * Used for efficient webhook routing without credential decryption.
     */
    phoneNumberId: string | null;
    /**
     * Encrypted provider credentials (AES-256-GCM).
     * The structure depends on the provider:
     * - Meta: { phoneNumberId, whatsappBusinessAccountId, accessToken, appId, appSecret }
     * - Twilio: { accountSid, authToken, fromNumber }
     */
    encryptedCredentials: string;
    credentialsIv: string;
    isActive: boolean;
    isPrimary: boolean;
    status: ChannelAccountStatus;
    lastTestedAt: Date | null;
    errorMessage: string | null;
    webhookUrl: string | null;
    webhookSecretEncrypted: string | null;
    webhookSecretIv: string | null;
    createdAt: Date;
    updatedAt: Date;
}
