import { ApiKeyPermission } from '../enums/api-key-permission.enum';
/**
 * DTO for creating a new API key.
 *
 * Security considerations:
 * - Name is limited to 100 characters to match database schema
 * - Channel account ID must be a valid UUID if provided
 * - Permissions must be valid enum values from ApiKeyPermission
 * - At least one permission is required
 * - Expiration date is optional but must be a valid ISO date string if provided
 */
export declare class CreateApiKeyDto {
    name: string;
    channelAccountId?: string | null;
    permissions: ApiKeyPermission[];
    expiresAt?: string | null;
}
