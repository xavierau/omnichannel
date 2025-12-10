/**
 * Permissions that can be granted to an API key.
 * These control what operations the API key holder can perform.
 */
export type ApiKeyPermission =
  | 'conversation:read'
  | 'conversation:update_status'
  | 'conversation:assign'
  | 'message:send'

/**
 * Represents an API key entity as returned from the API.
 * Note: The actual key value is only returned once during creation.
 */
export interface ApiKey {
  id: string
  name: string
  keyPrefix: string
  permissions: ApiKeyPermission[]
  channelAccountId: string | null
  isActive: boolean
  lastUsedAt: string | null
  expiresAt: string | null
  createdAt: string
}

/**
 * Data transfer object for creating a new API key.
 */
export interface CreateApiKeyDto {
  name: string
  channelAccountId?: string
  permissions: ApiKeyPermission[]
  expiresAt?: string
}

/**
 * Response returned when creating a new API key.
 * The rawKey is only provided once and should be stored securely by the client.
 */
export interface CreateApiKeyResponse {
  rawKey: string
  apiKey: ApiKey
}
