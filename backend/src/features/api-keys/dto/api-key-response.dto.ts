import { ApiKeyPermission } from '../enums/api-key-permission.enum';

/**
 * Response DTO for API key list and get operations.
 * Excludes sensitive data (keyHash is never returned).
 */
export interface ApiKeyResponseDto {
  id: string;
  name: string;
  keyPrefix: string;
  channelAccountId: string | null;
  channelAccountName: string | null;
  permissions: ApiKeyPermission[];
  expiresAt: string | null;
  lastUsedAt: string | null;
  isActive: boolean;
  createdById: string | null;
  createdByName: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Response DTO for API key creation.
 * Includes the raw key (only returned once during creation).
 *
 * SECURITY WARNING: The rawKey should only be shown to the user once.
 * It is never stored in plain text and cannot be retrieved again.
 */
export interface CreateApiKeyResponseDto {
  id: string;
  name: string;
  keyPrefix: string;
  rawKey: string;
  channelAccountId: string | null;
  permissions: ApiKeyPermission[];
  expiresAt: string | null;
  createdAt: string;
}

/**
 * Paginated response for listing API keys.
 */
export interface ApiKeyListResponseDto {
  data: ApiKeyResponseDto[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
