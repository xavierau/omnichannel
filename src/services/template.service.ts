/**
 * Template Service
 *
 * Handles all WhatsApp template-related API calls including CRUD operations
 * for templates and their translations.
 */

import {
  apiGet,
  apiPost,
  apiPatch,
  apiDelete,
  buildQueryString,
} from './api-client'
import type { PaginatedResponse, ApiResponse } from './api-client'

const API_BASE_URL = '/api/templates'

// ============================================================================
// Constants
// ============================================================================

export const TemplateCategory = {
  MARKETING: 'marketing',
  UTILITY: 'utility',
  AUTHENTICATION: 'authentication',
} as const

export type TemplateCategory = (typeof TemplateCategory)[keyof typeof TemplateCategory]

export const TemplateStatus = {
  APPROVED: 'approved',
  PENDING: 'pending',
  REJECTED: 'rejected',
  DISABLED: 'disabled',
  PAUSED: 'paused',
  PENDING_DELETION: 'pending_deletion',
  IN_APPEAL: 'in_appeal',
  FLAGGED: 'flagged',
  LIMIT_EXCEEDED: 'limit_exceeded',
} as const

export type TemplateStatus = (typeof TemplateStatus)[keyof typeof TemplateStatus]

export const TemplateQuality = {
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
  PENDING: 'pending',
} as const

export type TemplateQuality = (typeof TemplateQuality)[keyof typeof TemplateQuality]

export const HeaderType = {
  TEXT: 'text',
  IMAGE: 'image',
  VIDEO: 'video',
  DOCUMENT: 'document',
  NONE: 'none',
} as const

export type HeaderType = (typeof HeaderType)[keyof typeof HeaderType]

export const ButtonType = {
  QUICK_REPLY: 'quick_reply',
  CALL: 'call',
  URL: 'url',
  COPY_CODE: 'copy_code',
} as const

export type ButtonType = (typeof ButtonType)[keyof typeof ButtonType]

// ============================================================================
// Types
// ============================================================================

export interface TemplateButton {
  id: string
  type: ButtonType
  text: string
  url?: string
  phoneNumber?: string
}

export interface TemplateTranslation {
  id: string
  templateGroupId: string
  language: string
  status: TemplateStatus
  quality: TemplateQuality | null
  headerType: HeaderType | null
  headerContent: string | null
  body: string
  footer: string | null
  buttons: TemplateButton[]
  rejectionReason: string | null
  createdAt: string
  updatedAt: string
}

export interface WhatsAppTemplate {
  id: string
  name: string
  category: TemplateCategory
  channelAccountId: string | null
  customFields: Record<string, unknown>
  translations: TemplateTranslation[]
  createdAt: string
  updatedAt: string
}

export interface TemplateQuery {
  page?: number
  limit?: number
  search?: string
  category?: TemplateCategory
  status?: TemplateStatus
  channelAccountId?: string
  sortBy?: 'name' | 'category' | 'createdAt' | 'updatedAt'
  sortOrder?: 'asc' | 'desc'
}

export interface CreateTemplateData {
  name: string
  category: TemplateCategory
  channelAccountId?: string
  customFields?: Record<string, unknown>
}

export interface UpdateTemplateData {
  name?: string
  category?: TemplateCategory
  channelAccountId?: string
  customFields?: Record<string, unknown>
}

export interface CreateTranslationData {
  language: string
  headerType?: HeaderType
  headerContent?: string
  body: string
  footer?: string
  buttons?: Omit<TemplateButton, 'id'>[]
}

export interface UpdateTranslationData {
  headerType?: HeaderType
  headerContent?: string
  body?: string
  footer?: string
  buttons?: Omit<TemplateButton, 'id'>[]
}

// ============================================================================
// Service
// ============================================================================

export const templateService = {
  /**
   * Get paginated list of templates with optional filters
   */
  async getTemplates(query?: TemplateQuery): Promise<PaginatedResponse<WhatsAppTemplate>> {
    const queryString = buildQueryString({
      page: query?.page,
      limit: query?.limit,
      search: query?.search,
      category: query?.category,
      status: query?.status,
      channelAccountId: query?.channelAccountId,
      sortBy: query?.sortBy,
      sortOrder: query?.sortOrder,
    })

    return apiGet<PaginatedResponse<WhatsAppTemplate>>(`${API_BASE_URL}${queryString}`)
  },

  /**
   * Get only approved templates (for use in broadcasts)
   */
  async getApprovedTemplates(): Promise<WhatsAppTemplate[]> {
    const response = await apiGet<ApiResponse<WhatsAppTemplate[]>>(
      `${API_BASE_URL}/approved`
    )
    return response.data
  },

  /**
   * Get a single template by ID
   */
  async getTemplate(id: string): Promise<WhatsAppTemplate> {
    const response = await apiGet<ApiResponse<WhatsAppTemplate>>(
      `${API_BASE_URL}/${id}`
    )
    return response.data
  },

  /**
   * Create a new template
   */
  async createTemplate(data: CreateTemplateData): Promise<WhatsAppTemplate> {
    const response = await apiPost<ApiResponse<WhatsAppTemplate>, CreateTemplateData>(
      API_BASE_URL,
      data
    )
    return response.data
  },

  /**
   * Update an existing template
   */
  async updateTemplate(
    id: string,
    data: UpdateTemplateData
  ): Promise<WhatsAppTemplate> {
    const response = await apiPatch<ApiResponse<WhatsAppTemplate>, UpdateTemplateData>(
      `${API_BASE_URL}/${id}`,
      data
    )
    return response.data
  },

  /**
   * Delete a template
   */
  async deleteTemplate(id: string): Promise<void> {
    await apiDelete(`${API_BASE_URL}/${id}`)
  },

  /**
   * Add a translation to a template
   */
  async addTranslation(
    templateId: string,
    data: CreateTranslationData
  ): Promise<TemplateTranslation> {
    const response = await apiPost<
      ApiResponse<TemplateTranslation>,
      CreateTranslationData
    >(`${API_BASE_URL}/${templateId}/translations`, data)
    return response.data
  },

  /**
   * Update a template translation
   */
  async updateTranslation(
    templateId: string,
    translationId: string,
    data: UpdateTranslationData
  ): Promise<TemplateTranslation> {
    const response = await apiPatch<
      ApiResponse<TemplateTranslation>,
      UpdateTranslationData
    >(`${API_BASE_URL}/${templateId}/translations/${translationId}`, data)
    return response.data
  },

  /**
   * Delete a template translation
   */
  async deleteTranslation(templateId: string, translationId: string): Promise<void> {
    await apiDelete(`${API_BASE_URL}/${templateId}/translations/${translationId}`)
  },
}
