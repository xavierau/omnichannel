/**
 * Custom Field Service
 *
 * Handles all custom field-related API calls including CRUD operations
 * and field reordering.
 */

import {
  apiGet,
  apiPost,
  apiPut,
  apiPatch,
  apiDelete,
  buildQueryString,
} from './api-client'
import type { ApiResponse } from './api-client'
import type {
  CustomFieldDefinition,
  CustomFieldEntityType,
  CustomFieldType,
  ValidationRules,
  SelectOption,
  CustomFieldValue,
} from '@/types/custom-fields'

const API_BASE_URL = '/api/custom-fields'

// ============================================================================
// API Response Types (matching backend DTOs)
// ============================================================================

interface CustomFieldApiResponse {
  id: string
  tenantId: string
  entityType: CustomFieldEntityType
  fieldKey: string
  displayLabel: string
  description: string | null
  fieldType: CustomFieldType
  validation: ValidationRules
  defaultValue: CustomFieldValue | null
  options: SelectOption[] | null
  displayOrder: number
  isVisible: boolean
  isSearchable: boolean
  isFilterable: boolean
  createdAt: string
  updatedAt: string
}

// ============================================================================
// Request Types
// ============================================================================

export interface CreateCustomFieldData {
  entityType: CustomFieldEntityType
  fieldKey: string
  displayLabel: string
  description?: string
  fieldType: CustomFieldType
  validation?: ValidationRules
  defaultValue?: CustomFieldValue
  options?: SelectOption[]
  isVisible?: boolean
  isSearchable?: boolean
  isFilterable?: boolean
}

export interface UpdateCustomFieldData {
  displayLabel?: string
  description?: string
  validation?: ValidationRules
  defaultValue?: CustomFieldValue
  options?: SelectOption[]
  isVisible?: boolean
  isSearchable?: boolean
  isFilterable?: boolean
}

export interface ReorderCustomFieldsData {
  entityType: CustomFieldEntityType
  orderedIds: string[]
}

// ============================================================================
// Mappers
// ============================================================================

function mapApiResponseToDefinition(response: CustomFieldApiResponse): CustomFieldDefinition {
  return {
    id: response.id,
    tenantId: response.tenantId,
    entityType: response.entityType,
    fieldKey: response.fieldKey,
    displayLabel: response.displayLabel,
    description: response.description ?? undefined,
    fieldType: response.fieldType,
    validation: response.validation ?? {},
    defaultValue: response.defaultValue ?? undefined,
    options: response.options ?? undefined,
    displayOrder: response.displayOrder,
    isVisible: response.isVisible,
    isSearchable: response.isSearchable,
    isFilterable: response.isFilterable,
    createdAt: new Date(response.createdAt),
    updatedAt: new Date(response.updatedAt),
  }
}

// ============================================================================
// Service
// ============================================================================

export const customFieldService = {
  /**
   * Get all custom fields, optionally filtered by entity type
   */
  async getCustomFields(entityType?: CustomFieldEntityType): Promise<CustomFieldDefinition[]> {
    const queryString = buildQueryString({ entityType })
    const response = await apiGet<ApiResponse<CustomFieldApiResponse[]>>(
      `${API_BASE_URL}${queryString}`
    )
    return response.data.map(mapApiResponseToDefinition)
  },

  /**
   * Get a single custom field by ID
   */
  async getCustomField(id: string): Promise<CustomFieldDefinition> {
    const response = await apiGet<ApiResponse<CustomFieldApiResponse>>(
      `${API_BASE_URL}/${id}`
    )
    return mapApiResponseToDefinition(response.data)
  },

  /**
   * Create a new custom field
   */
  async createCustomField(data: CreateCustomFieldData): Promise<CustomFieldDefinition> {
    const response = await apiPost<ApiResponse<CustomFieldApiResponse>, CreateCustomFieldData>(
      API_BASE_URL,
      data
    )
    return mapApiResponseToDefinition(response.data)
  },

  /**
   * Update an existing custom field
   */
  async updateCustomField(
    id: string,
    data: UpdateCustomFieldData
  ): Promise<CustomFieldDefinition> {
    const response = await apiPut<ApiResponse<CustomFieldApiResponse>, UpdateCustomFieldData>(
      `${API_BASE_URL}/${id}`,
      data
    )
    return mapApiResponseToDefinition(response.data)
  },

  /**
   * Delete a custom field
   */
  async deleteCustomField(id: string): Promise<void> {
    await apiDelete(`${API_BASE_URL}/${id}`)
  },

  /**
   * Reorder custom fields for an entity type
   */
  async reorderCustomFields(data: ReorderCustomFieldsData): Promise<void> {
    await apiPatch<void, ReorderCustomFieldsData>(`${API_BASE_URL}/reorder`, data)
  },
}
