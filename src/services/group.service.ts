/**
 * Group Service
 *
 * Handles all customer group-related API calls including CRUD operations
 * and member retrieval.
 */

import {
  apiGet,
  apiPost,
  apiPatch,
  apiDelete,
  buildQueryString,
} from './api-client'
import type { PaginatedResponse, ApiResponse } from './api-client'
import type { Customer } from './customer.service'

const API_BASE_URL = '/api/groups'

// ============================================================================
// Types
// ============================================================================

export interface GroupCriteriaCondition {
  fieldKey: string
  operator: 'equals' | 'contains' | 'greaterThan' | 'lessThan'
  value: string | number | boolean
}

export interface GroupCriteria {
  tagIds?: string[]
  createdAfter?: string
  createdBefore?: string
  customFieldConditions?: GroupCriteriaCondition[]
}

export interface CustomerGroup {
  id: string
  name: string
  description: string | null
  isStatic: boolean
  memberIds: string[] | null
  criteria: GroupCriteria | null
  memberCount?: number
  createdAt: string
  updatedAt: string
}

export interface GroupQuery {
  page?: number
  limit?: number
  search?: string
  sortBy?: 'name' | 'createdAt' | 'updatedAt'
  sortOrder?: 'asc' | 'desc'
}

export interface GroupMembersQuery {
  page?: number
  limit?: number
}

export interface CreateGroupData {
  name: string
  description?: string
  isStatic?: boolean
  memberIds?: string[]
  criteria?: GroupCriteria
}

export interface UpdateGroupData {
  name?: string
  description?: string
  isStatic?: boolean
  memberIds?: string[]
  criteria?: GroupCriteria
}

// ============================================================================
// Service
// ============================================================================

export const groupService = {
  /**
   * Get paginated list of customer groups
   */
  async getGroups(query?: GroupQuery): Promise<PaginatedResponse<CustomerGroup>> {
    const queryString = buildQueryString({
      page: query?.page,
      limit: query?.limit,
      search: query?.search,
      sortBy: query?.sortBy,
      sortOrder: query?.sortOrder,
    })

    return apiGet<PaginatedResponse<CustomerGroup>>(`${API_BASE_URL}${queryString}`)
  },

  /**
   * Get a single group by ID
   */
  async getGroup(id: string): Promise<CustomerGroup> {
    const response = await apiGet<ApiResponse<CustomerGroup>>(`${API_BASE_URL}/${id}`)
    return response.data
  },

  /**
   * Get members of a group with pagination
   */
  async getGroupMembers(
    id: string,
    query?: GroupMembersQuery
  ): Promise<PaginatedResponse<Customer>> {
    const queryString = buildQueryString({
      page: query?.page,
      limit: query?.limit,
    })

    return apiGet<PaginatedResponse<Customer>>(
      `${API_BASE_URL}/${id}/members${queryString}`
    )
  },

  /**
   * Create a new customer group
   */
  async createGroup(data: CreateGroupData): Promise<CustomerGroup> {
    const response = await apiPost<ApiResponse<CustomerGroup>, CreateGroupData>(
      API_BASE_URL,
      data
    )
    return response.data
  },

  /**
   * Update an existing group
   */
  async updateGroup(id: string, data: UpdateGroupData): Promise<CustomerGroup> {
    const response = await apiPatch<ApiResponse<CustomerGroup>, UpdateGroupData>(
      `${API_BASE_URL}/${id}`,
      data
    )
    return response.data
  },

  /**
   * Delete a group
   */
  async deleteGroup(id: string): Promise<void> {
    await apiDelete(`${API_BASE_URL}/${id}`)
  },
}
