/**
 * Broadcast Service
 *
 * Handles all broadcast-related API calls including CRUD operations,
 * scheduling, status management, and exports.
 */

import {
  apiGet,
  apiPost,
  apiPatch,
  apiDelete,
  buildQueryString,
  getAuthHeaders,
} from './api-client'
import type { PaginatedResponse, ApiResponse } from './api-client'
import { TemplateCategory } from './template.service'

const API_BASE_URL = '/api/broadcasts'

// ============================================================================
// Constants
// ============================================================================

export const BroadcastStatus = {
  DRAFT: 'draft',
  SCHEDULED: 'scheduled',
  SENDING: 'sending',
  COMPLETED: 'completed',
  PAUSED: 'paused',
  CANCELLED: 'cancelled',
  FAILED: 'failed',
} as const

export type BroadcastStatus = (typeof BroadcastStatus)[keyof typeof BroadcastStatus]

export const RecipientType = {
  GROUP: 'group',
  CUSTOMERS: 'customers',
} as const

export type RecipientType = (typeof RecipientType)[keyof typeof RecipientType]

// ============================================================================
// Types
// ============================================================================

export interface VariableConfig {
  index: number
  sourceType: 'static' | 'customer_field'
  staticValue?: string
  customerField?: string
}

export interface HeaderConfig {
  type: 'text' | 'image' | 'video' | 'document'
  textVariable?: VariableConfig
  mediaUrl?: string
}

export interface ButtonVariableConfig {
  buttonIndex: number
  variable: VariableConfig
}

export interface TemplateVariablesConfig {
  header?: HeaderConfig
  bodyVariables: VariableConfig[]
  buttonVariables: ButtonVariableConfig[]
}

export interface Broadcast {
  id: string
  name: string
  description: string | null
  templateId: string
  templateName: string
  templateCategory: TemplateCategory
  templateLanguage: string
  channelAccountId: string | null
  recipientType: RecipientType
  groupId: string | null
  customerIds: string[] | null
  totalRecipients: number
  templateVariables: TemplateVariablesConfig
  scheduledAt: string | null
  isImmediate: boolean
  timezone: string
  status: BroadcastStatus
  sentCount: number
  deliveredCount: number
  readCount: number
  failedCount: number
  createdBy: string
  createdAt: string
  updatedAt: string
  startedAt: string | null
  completedAt: string | null
  previousStatus: BroadcastStatus | null
  customFields: Record<string, unknown>
}

export interface BroadcastReport {
  broadcast: Broadcast
  metrics: {
    totalRecipients: number
    sentCount: number
    deliveredCount: number
    readCount: number
    failedCount: number
    deliveryRate: number
    readRate: number
    failureRate: number
  }
  timeline: Array<{
    timestamp: string
    event: string
    count: number
  }>
}

export interface BroadcastQuery {
  page?: number
  limit?: number
  search?: string
  status?: BroadcastStatus
  sortBy?: 'name' | 'status' | 'scheduledAt' | 'createdAt' | 'updatedAt'
  sortOrder?: 'asc' | 'desc'
}

export interface CreateBroadcastData {
  name: string
  description?: string
  templateId: string
  channelAccountId?: string
  recipientType: RecipientType
  groupId?: string
  customerIds?: string[]
  templateVariables: TemplateVariablesConfig
  scheduledAt?: string
  isImmediate?: boolean
  timezone?: string
}

export interface UpdateBroadcastData {
  name?: string
  description?: string
  templateId?: string
  channelAccountId?: string
  recipientType?: RecipientType
  groupId?: string
  customerIds?: string[]
  templateVariables?: TemplateVariablesConfig
  scheduledAt?: string
  isImmediate?: boolean
  timezone?: string
}

// ============================================================================
// Service
// ============================================================================

export const broadcastService = {
  /**
   * Get paginated list of broadcasts with optional filters
   */
  async getBroadcasts(query?: BroadcastQuery): Promise<PaginatedResponse<Broadcast>> {
    const queryString = buildQueryString({
      page: query?.page,
      limit: query?.limit,
      search: query?.search,
      status: query?.status,
      sortBy: query?.sortBy,
      sortOrder: query?.sortOrder,
    })

    return apiGet<PaginatedResponse<Broadcast>>(`${API_BASE_URL}${queryString}`)
  },

  /**
   * Get a single broadcast by ID
   */
  async getBroadcast(id: string): Promise<Broadcast> {
    const response = await apiGet<ApiResponse<Broadcast>>(`${API_BASE_URL}/${id}`)
    return response.data
  },

  /**
   * Get detailed report for a broadcast
   */
  async getBroadcastReport(id: string): Promise<BroadcastReport> {
    const response = await apiGet<ApiResponse<BroadcastReport>>(
      `${API_BASE_URL}/${id}/report`
    )
    return response.data
  },

  /**
   * Create a new broadcast
   */
  async createBroadcast(data: CreateBroadcastData): Promise<Broadcast> {
    const response = await apiPost<ApiResponse<Broadcast>, CreateBroadcastData>(
      API_BASE_URL,
      data
    )
    return response.data
  },

  /**
   * Update an existing broadcast (only in draft status)
   */
  async updateBroadcast(id: string, data: UpdateBroadcastData): Promise<Broadcast> {
    const response = await apiPatch<ApiResponse<Broadcast>, UpdateBroadcastData>(
      `${API_BASE_URL}/${id}`,
      data
    )
    return response.data
  },

  /**
   * Delete a broadcast (only in draft status)
   */
  async deleteBroadcast(id: string): Promise<void> {
    await apiDelete(`${API_BASE_URL}/${id}`)
  },

  /**
   * Schedule a broadcast for future sending
   */
  async schedule(id: string): Promise<Broadcast> {
    const response = await apiPost<ApiResponse<Broadcast>>(
      `${API_BASE_URL}/${id}/schedule`
    )
    return response.data
  },

  /**
   * Send a broadcast immediately
   */
  async send(id: string): Promise<Broadcast> {
    const response = await apiPost<ApiResponse<Broadcast>>(
      `${API_BASE_URL}/${id}/send`
    )
    return response.data
  },

  /**
   * Pause a sending or scheduled broadcast
   */
  async pause(id: string): Promise<Broadcast> {
    const response = await apiPost<ApiResponse<Broadcast>>(
      `${API_BASE_URL}/${id}/pause`
    )
    return response.data
  },

  /**
   * Resume a paused broadcast
   */
  async resume(id: string): Promise<Broadcast> {
    const response = await apiPost<ApiResponse<Broadcast>>(
      `${API_BASE_URL}/${id}/resume`
    )
    return response.data
  },

  /**
   * Cancel a scheduled or sending broadcast
   */
  async cancel(id: string): Promise<Broadcast> {
    const response = await apiPost<ApiResponse<Broadcast>>(
      `${API_BASE_URL}/${id}/cancel`
    )
    return response.data
  },

  /**
   * Retry failed recipients in a broadcast
   */
  async retry(id: string): Promise<Broadcast> {
    const response = await apiPost<ApiResponse<Broadcast>>(
      `${API_BASE_URL}/${id}/retry`
    )
    return response.data
  },

  /**
   * Bulk pause multiple broadcasts
   */
  async bulkPause(ids: string[]): Promise<void> {
    await apiPost<void, { ids: string[] }>(`${API_BASE_URL}/bulk-pause`, { ids })
  },

  /**
   * Bulk cancel multiple broadcasts
   */
  async bulkCancel(ids: string[]): Promise<void> {
    await apiPost<void, { ids: string[] }>(`${API_BASE_URL}/bulk-cancel`, { ids })
  },

  /**
   * Bulk delete multiple broadcasts
   */
  async bulkDelete(ids: string[]): Promise<void> {
    await apiDelete<void>(`${API_BASE_URL}/bulk?ids=${ids.join(',')}`)
  },

  /**
   * Export broadcasts to CSV
   */
  async exportCsv(): Promise<Blob> {
    const response = await fetch(`${API_BASE_URL}/export/csv`, {
      method: 'GET',
      headers: getAuthHeaders(),
    })

    if (!response.ok) {
      throw new Error('Failed to export broadcasts as CSV')
    }

    return response.blob()
  },

  /**
   * Export broadcasts to Excel
   */
  async exportExcel(): Promise<Blob> {
    const response = await fetch(`${API_BASE_URL}/export/excel`, {
      method: 'GET',
      headers: getAuthHeaders(),
    })

    if (!response.ok) {
      throw new Error('Failed to export broadcasts as Excel')
    }

    return response.blob()
  },
}
