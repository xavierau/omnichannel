import { Tenant } from '../../tenants/tenant.entity';
import { ChannelAccount } from '../../channel-accounts/channel-account.entity';
import { User } from '../../users/user.entity';
import { ApiKeyPermission } from '../enums/api-key-permission.enum';
/**
 * ApiKey entity represents an API key for AI agents to interact with the messaging platform.
 * Each key is scoped to a tenant and optionally to a specific channel account.
 * Keys are stored as SHA-256 hashes for security.
 */
export declare class ApiKey {
    id: string;
    tenantId: string;
    tenant: Tenant;
    channelAccountId: string | null;
    channelAccount: ChannelAccount | null;
    name: string;
    keyHash: string;
    keyPrefix: string;
    permissions: ApiKeyPermission[];
    expiresAt: Date | null;
    lastUsedAt: Date | null;
    isActive: boolean;
    createdById: string | null;
    createdBy: User | null;
    createdAt: Date;
    updatedAt: Date;
    /**
     * Check if the API key is valid for use.
     * A key is valid if it is active and not expired.
     */
    isValid(): boolean;
    /**
     * Check if the API key has expired.
     */
    isExpired(): boolean;
    /**
     * Check if the API key has a specific permission.
     */
    hasPermission(permission: ApiKeyPermission): boolean;
    /**
     * Check if the API key has all of the specified permissions.
     */
    hasAllPermissions(permissions: ApiKeyPermission[]): boolean;
    /**
     * Check if the API key has any of the specified permissions.
     */
    hasAnyPermission(permissions: ApiKeyPermission[]): boolean;
}
