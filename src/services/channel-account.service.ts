/**
 * Channel Account Service
 *
 * Handles all channel account-related API calls including CRUD operations,
 * connection testing, and template synchronization.
 */

import {
  apiGet,
  apiPost,
  apiPut,
  apiPatch,
  apiDelete,
} from './api-client'
import type { ApiResponse } from './api-client'

const API_BASE_URL = '/api/channel-accounts'

// ============================================================================
// Constants
// ============================================================================

export const ChannelAccountStatus = {
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  ERROR: 'error',
} as const

export type ChannelAccountStatus = (typeof ChannelAccountStatus)[keyof typeof ChannelAccountStatus]

// ============================================================================
// Types
// ============================================================================

export interface ChannelAccount {
  id: string
  channelCode: string
  channelName: string
  providerCode: string
  providerName: string
  name: string
  phoneNumber: string | null
  phoneNumberId: string | null
  isActive: boolean
  isPrimary: boolean
  status: ChannelAccountStatus
  lastTestedAt: string | null
  errorMessage: string | null
  webhookUrl: string | null
  createdAt: string
  updatedAt: string
}

export interface WebhookConfig {
  webhookUrl: string
  verifyToken: string
}

export interface CreateChannelAccountData {
  channelCode: string
  providerCode?: string
  name: string
  phoneNumber?: string
  credentials: MetaCredentials | TwilioCredentials
  teamIds?: string[]
}

export interface MetaCredentials {
  phoneNumberId: string
  whatsappBusinessAccountId: string
  accessToken: string
  appId?: string
  appSecret?: string
}

export interface TwilioCredentials {
  accountSid: string
  authToken: string
  fromNumber: string
}

export interface UpdateChannelAccountData {
  name?: string
  phoneNumber?: string
  isActive?: boolean
  credentials?: MetaCredentials | TwilioCredentials
}

export interface TestConnectionResult {
  success: boolean
  message: string
  details?: Record<string, unknown>
}

export interface SyncTemplatesResult {
  synced: number
  created: number
  updated: number
  failed: number
  errors?: string[]
}

// ============================================================================
// Service
// ============================================================================

export const channelAccountService = {
  /**
   * Get all channel accounts for the current tenant
   */
  async getChannelAccounts(): Promise<ChannelAccount[]> {
    const response = await apiGet<ApiResponse<ChannelAccount[]>>(API_BASE_URL)
    return response.data
  },

  /**
   * Get a single channel account by ID
   */
  async getChannelAccount(id: string): Promise<ChannelAccount> {
    const response = await apiGet<ApiResponse<ChannelAccount>>(
      `${API_BASE_URL}/${id}`
    )
    return response.data
  },

  /**
   * Create a new channel account
   */
  async createChannelAccount(
    data: CreateChannelAccountData
  ): Promise<ChannelAccount> {
    const response = await apiPost<
      ApiResponse<ChannelAccount>,
      CreateChannelAccountData
    >(API_BASE_URL, data)
    return response.data
  },

  /**
   * Update an existing channel account
   */
  async updateChannelAccount(
    id: string,
    data: UpdateChannelAccountData
  ): Promise<ChannelAccount> {
    const response = await apiPut<
      ApiResponse<ChannelAccount>,
      UpdateChannelAccountData
    >(`${API_BASE_URL}/${id}`, data)
    return response.data
  },

  /**
   * Delete a channel account
   */
  async deleteChannelAccount(id: string): Promise<void> {
    await apiDelete(`${API_BASE_URL}/${id}`)
  },

  /**
   * Test the connection of a channel account
   */
  async testConnection(id: string): Promise<TestConnectionResult> {
    const response = await apiPost<ApiResponse<TestConnectionResult>>(
      `${API_BASE_URL}/${id}/test`
    )
    return response.data
  },

  /**
   * Set a channel account as the primary account
   */
  async setPrimary(id: string): Promise<ChannelAccount> {
    const response = await apiPatch<ApiResponse<ChannelAccount>, Record<string, never>>(
      `${API_BASE_URL}/${id}/primary`,
      {}
    )
    return response.data
  },

  /**
   * Sync templates from the WhatsApp Business API
   */
  async syncTemplates(id: string): Promise<SyncTemplatesResult> {
    const response = await apiPost<ApiResponse<SyncTemplatesResult>>(
      `${API_BASE_URL}/${id}/sync-templates`
    )
    return response.data
  },

  /**
   * Get webhook configuration for a channel account
   */
  async getWebhookConfig(id: string): Promise<WebhookConfig> {
    const response = await apiGet<ApiResponse<WebhookConfig>>(
      `${API_BASE_URL}/${id}/webhook-config`
    )
    return response.data
  },
}
