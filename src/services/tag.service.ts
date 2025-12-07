/**
 * Tag Service
 *
 * Handles all tag-related API calls including CRUD operations.
 */

import {
  apiGet,
  apiPost,
  apiPut,
  apiDelete,
} from './api-client'
import type { ApiResponse } from './api-client'

const API_BASE_URL = '/api/tags'

// ============================================================================
// Constants
// ============================================================================

export const TagColor = {
  PURPLE: 'purple',
  BLUE: 'blue',
  GREEN: 'green',
  GRAY: 'gray',
  YELLOW: 'yellow',
  ORANGE: 'orange',
  RED: 'red',
  PINK: 'pink',
} as const

export type TagColor = (typeof TagColor)[keyof typeof TagColor]

// ============================================================================
// Types
// ============================================================================

export interface Tag {
  id: string
  name: string
  color: TagColor
  createdAt: string
  updatedAt: string
}

export interface CreateTagData {
  name: string
  color?: TagColor
}

export interface UpdateTagData {
  name?: string
  color?: TagColor
}

// ============================================================================
// Service
// ============================================================================

export const tagService = {
  /**
   * Get all tags for the current tenant
   */
  async getTags(): Promise<Tag[]> {
    const response = await apiGet<ApiResponse<Tag[]>>(API_BASE_URL)
    return response.data
  },

  /**
   * Get a single tag by ID
   */
  async getTag(id: string): Promise<Tag> {
    const response = await apiGet<ApiResponse<Tag>>(`${API_BASE_URL}/${id}`)
    return response.data
  },

  /**
   * Create a new tag
   */
  async createTag(data: CreateTagData): Promise<Tag> {
    const response = await apiPost<ApiResponse<Tag>, CreateTagData>(
      API_BASE_URL,
      data
    )
    return response.data
  },

  /**
   * Update an existing tag
   */
  async updateTag(id: string, data: UpdateTagData): Promise<Tag> {
    const response = await apiPut<ApiResponse<Tag>, UpdateTagData>(
      `${API_BASE_URL}/${id}`,
      data
    )
    return response.data
  },

  /**
   * Delete a tag
   */
  async deleteTag(id: string): Promise<void> {
    await apiDelete(`${API_BASE_URL}/${id}`)
  },
}
