/**
 * API Key Service
 *
 * Handles all API key management operations including CRUD and revocation.
 */

import { apiGet, apiPost, apiDelete } from './api-client'
import type { ApiResponse } from './api-client'
import type { ApiKey, ApiKeyPermission } from '@/types/api-key'

const API_BASE_URL = '/api/api-keys'

// ============================================================================
// Types (re-export for convenience)
// ============================================================================

export type { ApiKey, ApiKeyPermission } from '@/types/api-key'

export interface CreateApiKeyData {
  name: string
  channelAccountId?: string | null
  permissions: ApiKeyPermission[]
  expiresAt?: string | null
}

export interface CreateApiKeyResponse {
  id: string
  name: string
  keyPrefix: string
  rawKey: string
  channelAccountId: string | null
  permissions: ApiKeyPermission[]
  expiresAt: string | null
  createdAt: string
}

interface ApiKeyListResponse {
  data: ApiKey[]
  meta: {
    total: number
  }
}

// ============================================================================
// Service
// ============================================================================

export const apiKeyService = {
  /**
   * Get all API keys for the current tenant
   */
  async getApiKeys(): Promise<ApiKey[]> {
    const response = await apiGet<ApiKeyListResponse>(API_BASE_URL)
    return response.data
  },

  /**
   * Create a new API key
   * Returns the raw key which is only available once
   */
  async createApiKey(data: CreateApiKeyData): Promise<CreateApiKeyResponse> {
    const response = await apiPost<ApiResponse<CreateApiKeyResponse>, CreateApiKeyData>(
      API_BASE_URL,
      data
    )
    return response.data
  },

  /**
   * Revoke (deactivate) an API key
   */
  async revokeApiKey(id: string): Promise<void> {
    await apiDelete(`${API_BASE_URL}/${id}`)
  },
}
