/**
 * Customer Service
 *
 * Handles all customer-related API calls including CRUD operations,
 * bulk actions, and CSV export.
 */

import {
  apiGet,
  apiPost,
  apiPut,
  apiDelete,
  apiPatch,
  buildQueryString,
  getAuthHeaders,
} from './api-client'
import type { PaginatedResponse, ApiResponse } from './api-client'
import type { Tag } from './tag.service'

const API_BASE_URL = '/api/customers'

// ============================================================================
// Types
// ============================================================================

export interface Customer {
  id: string
  name: string
  whatsappNumber: string
  customFields: Record<string, unknown>
  tags: Tag[]
  createdAt: string
  updatedAt: string
}

export interface CustomerQuery {
  page?: number
  limit?: number
  search?: string
  tagIds?: string[]
  sortBy?: 'name' | 'whatsappNumber' | 'createdAt' | 'updatedAt'
  sortOrder?: 'asc' | 'desc'
}

export interface CreateCustomerData {
  name: string
  whatsappNumber: string
  customFields?: Record<string, unknown>
  tagIds?: string[]
}

export interface UpdateCustomerData {
  name?: string
  whatsappNumber?: string
  customFields?: Record<string, unknown>
  tagIds?: string[]
}

export type BulkTagOperation = 'add' | 'remove' | 'replace'

export interface BulkUpdateTagsData {
  customerIds: string[]
  tagIds: string[]
  operation: BulkTagOperation
}

// ============================================================================
// Service
// ============================================================================

export const customerService = {
  /**
   * Get paginated list of customers with optional filters
   */
  async getCustomers(query?: CustomerQuery): Promise<PaginatedResponse<Customer>> {
    const queryParams: Record<string, string | number | boolean | undefined> = {
      page: query?.page,
      limit: query?.limit,
      search: query?.search,
      sortBy: query?.sortBy,
      sortOrder: query?.sortOrder,
    }

    // Handle tagIds array separately
    let queryString = buildQueryString(queryParams)
    if (query?.tagIds && query.tagIds.length > 0) {
      const tagParams = query.tagIds.map((id) => `tagIds=${encodeURIComponent(id)}`).join('&')
      queryString = queryString ? `${queryString}&${tagParams}` : `?${tagParams}`
    }

    return apiGet<PaginatedResponse<Customer>>(`${API_BASE_URL}${queryString}`)
  },

  /**
   * Get a single customer by ID
   */
  async getCustomer(id: string): Promise<Customer> {
    const response = await apiGet<ApiResponse<Customer>>(`${API_BASE_URL}/${id}`)
    return response.data
  },

  /**
   * Create a new customer
   */
  async createCustomer(data: CreateCustomerData): Promise<Customer> {
    const response = await apiPost<ApiResponse<Customer>, CreateCustomerData>(
      API_BASE_URL,
      data
    )
    return response.data
  },

  /**
   * Update an existing customer
   */
  async updateCustomer(id: string, data: UpdateCustomerData): Promise<Customer> {
    const response = await apiPut<ApiResponse<Customer>, UpdateCustomerData>(
      `${API_BASE_URL}/${id}`,
      data
    )
    return response.data
  },

  /**
   * Delete a customer
   */
  async deleteCustomer(id: string): Promise<void> {
    await apiDelete(`${API_BASE_URL}/${id}`)
  },

  /**
   * Bulk delete customers
   */
  async bulkDelete(ids: string[]): Promise<void> {
    await apiDelete<void>(`${API_BASE_URL}/bulk?ids=${ids.join(',')}`)
  },

  /**
   * Bulk update tags for multiple customers
   */
  async bulkUpdateTags(
    customerIds: string[],
    tagIds: string[],
    operation: BulkTagOperation
  ): Promise<void> {
    await apiPatch<void, BulkUpdateTagsData>(`${API_BASE_URL}/bulk/tags`, {
      customerIds,
      tagIds,
      operation,
    })
  },

  /**
   * Export customers to CSV
   * Returns a blob URL for download
   */
  async exportCsv(): Promise<Blob> {
    const response = await fetch(`${API_BASE_URL}/export`, {
      method: 'GET',
      headers: getAuthHeaders(),
    })

    if (!response.ok) {
      throw new Error('Failed to export customers')
    }

    return response.blob()
  },
}
