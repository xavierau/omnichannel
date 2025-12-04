// ============================================
// Custom Fields Type Definitions
// ============================================

/**
 * Supported custom field types
 */
export type CustomFieldType =
  | "TEXT"
  | "TEXTAREA"
  | "NUMBER"
  | "DATE"
  | "DATETIME"
  | "SELECT"
  | "MULTISELECT"
  | "BOOLEAN"
  | "PHONE"
  | "EMAIL"
  | "URL"

/**
 * Entity types that can have custom fields
 */
export type CustomFieldEntityType =
  | "CUSTOMER"
  | "BROADCAST"
  | "TEMPLATE"
  | "CONVERSATION"

/**
 * Option for SELECT and MULTISELECT field types
 */
export interface SelectOption {
  id: string
  label: string
  value: string
  color?: string
  order: number
}

/**
 * Validation rules for custom fields
 */
export interface ValidationRules {
  required?: boolean
  minLength?: number
  maxLength?: number
  pattern?: string
  patternMessage?: string
  min?: number
  max?: number
  decimal?: boolean
  precision?: number
}

/**
 * Complete custom field definition (created by tenant admin)
 */
export interface CustomFieldDefinition {
  id: string
  tenantId: string
  entityType: CustomFieldEntityType
  fieldKey: string
  displayLabel: string
  description?: string
  fieldType: CustomFieldType
  validation: ValidationRules
  defaultValue?: CustomFieldValue
  options?: SelectOption[]
  displayOrder: number
  isVisible: boolean
  isSearchable: boolean
  isFilterable: boolean
  createdAt: Date
  updatedAt: Date
}

/**
 * Possible values for custom fields
 */
export type CustomFieldValue =
  | string
  | number
  | boolean
  | Date
  | string[]
  | null

/**
 * Custom fields data stored on an entity
 */
export type CustomFieldsData = Record<string, CustomFieldValue>

/**
 * Props interface for individual field renderers
 */
export interface FieldRendererProps {
  definition: CustomFieldDefinition
  value: CustomFieldValue
  onChange: (value: CustomFieldValue) => void
  error?: string
  disabled?: boolean
  id: string
}

// ============================================
// Constants
// ============================================

/**
 * Field type metadata for UI display
 */
export const CUSTOM_FIELD_TYPES: {
  value: CustomFieldType
  label: string
  icon: string
}[] = [
  { value: "TEXT", label: "Text", icon: "Type" },
  { value: "TEXTAREA", label: "Text Area", icon: "AlignLeft" },
  { value: "NUMBER", label: "Number", icon: "Hash" },
  { value: "DATE", label: "Date", icon: "Calendar" },
  { value: "DATETIME", label: "Date & Time", icon: "Clock" },
  { value: "SELECT", label: "Dropdown", icon: "ChevronDown" },
  { value: "MULTISELECT", label: "Multi-Select", icon: "CheckSquare" },
  { value: "BOOLEAN", label: "Yes/No", icon: "ToggleLeft" },
  { value: "PHONE", label: "Phone", icon: "Phone" },
  { value: "EMAIL", label: "Email", icon: "Mail" },
  { value: "URL", label: "URL", icon: "Link" },
]

/**
 * Entity type metadata for UI display
 */
export const ENTITY_TYPES: {
  value: CustomFieldEntityType
  label: string
}[] = [
  { value: "CUSTOMER", label: "Customers" },
  { value: "BROADCAST", label: "Broadcasts" },
  { value: "TEMPLATE", label: "Templates" },
  { value: "CONVERSATION", label: "Conversations" },
]

/**
 * Form data for creating/editing a custom field definition
 */
export interface CustomFieldFormData {
  fieldKey: string
  displayLabel: string
  description?: string
  fieldType: CustomFieldType
  validation: ValidationRules
  defaultValue?: CustomFieldValue
  options?: SelectOption[]
  isVisible: boolean
  isSearchable: boolean
  isFilterable: boolean
}

/**
 * Errors for custom field form validation
 */
export interface CustomFieldFormErrors {
  fieldKey?: string
  displayLabel?: string
  description?: string
  fieldType?: string
  options?: string
  validation?: string
}
