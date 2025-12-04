import type { HeaderType, TemplateCategory } from "@/pages/whatsapp-templates/types"
import type { CustomFieldsData } from "@/types/custom-fields"
import { getVisibleCustomFieldsForEntity } from "@/pages/settings/data/mock-custom-fields"

// ============================================
// Template Variable Configuration Types
// ============================================

// Variable source: static value OR customer field mapping
export type VariableSourceType = "STATIC" | "CUSTOMER_FIELD"

export interface VariableConfig {
  index: number // Variable number (1, 2, 3...)
  sourceType: VariableSourceType
  staticValue?: string // Used when sourceType = "STATIC"
  customerField?: string // Used when sourceType = "CUSTOMER_FIELD" (e.g., "name", "whatsappNumber")
}

export interface HeaderConfig {
  type: HeaderType
  // For TEXT headers with variable
  textVariable?: VariableConfig
  // For media headers
  mediaUrl?: string
  mediaFile?: File // For upload (frontend only, not persisted)
}

export interface ButtonVariableConfig {
  buttonIndex: number // Which button (0, 1, 2...)
  variable: VariableConfig // The URL suffix variable
}

export interface TemplateVariablesConfig {
  header?: HeaderConfig
  bodyVariables: VariableConfig[]
  buttonVariables: ButtonVariableConfig[]
}

// Predefined mappable customer fields (Phase 1 - limited set)
export const CUSTOMER_MAPPABLE_FIELDS = [
  { value: "name", label: "Customer Name" },
  { value: "whatsappNumber", label: "WhatsApp Number" },
] as const

export type CustomerMappableField = (typeof CUSTOMER_MAPPABLE_FIELDS)[number]["value"]

/**
 * Get all mappable customer fields including custom fields
 */
export function getCustomerMappableFields(): { value: string; label: string }[] {
  const baseFields = CUSTOMER_MAPPABLE_FIELDS.map((f) => ({
    value: f.value,
    label: f.label,
  }))

  const customFields = getVisibleCustomFieldsForEntity("CUSTOMER").map((f) => ({
    value: `customFields.${f.fieldKey}`,
    label: f.displayLabel,
  }))

  return [...baseFields, ...customFields]
}

// ============================================
// Broadcast Status and Types
// ============================================

export type BroadcastStatus =
  | "DRAFT"
  | "SCHEDULED"
  | "SENDING"
  | "COMPLETED"
  | "PAUSED"
  | "CANCELLED"
  | "FAILED"

export type RecipientType = "GROUP" | "CUSTOMERS"

export interface Broadcast {
  id: string
  name: string
  description?: string

  // Template reference
  templateId: string
  templateName: string
  templateCategory: TemplateCategory

  // Recipients
  recipientType: RecipientType
  groupId?: string
  groupName?: string
  customerIds?: string[]
  totalRecipients: number

  // Scheduling
  scheduledAt: Date | null
  isImmediate: boolean
  timezone: string

  // Status & Progress
  status: BroadcastStatus
  sentCount: number
  deliveredCount: number
  readCount: number
  failedCount: number

  // Metadata
  createdBy: string
  createdAt: Date
  updatedAt: Date
  completedAt?: Date

  // Custom fields
  customFields?: CustomFieldsData
}

export interface BroadcastFilters {
  search: string
  statuses: BroadcastStatus[]
  templateCategories: TemplateCategory[]
  dateRange: {
    from: Date | undefined
    to: Date | undefined
  }
}

export const defaultFilters: BroadcastFilters = {
  search: "",
  statuses: [],
  templateCategories: [],
  dateRange: {
    from: undefined,
    to: undefined,
  },
}

export const BROADCAST_STATUSES: { value: BroadcastStatus; label: string }[] = [
  { value: "DRAFT", label: "Draft" },
  { value: "SCHEDULED", label: "Scheduled" },
  { value: "SENDING", label: "Sending" },
  { value: "COMPLETED", label: "Completed" },
  { value: "PAUSED", label: "Paused" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "FAILED", label: "Failed" },
]

export const TEMPLATE_CATEGORIES: { value: TemplateCategory; label: string }[] = [
  { value: "MARKETING", label: "Marketing" },
  { value: "UTILITY", label: "Utility" },
  { value: "AUTHENTICATION", label: "Authentication" },
]

// Form data for creating/editing broadcasts
export interface BroadcastFormData {
  name: string
  description: string
  templateId: string
  recipientType: RecipientType
  groupId: string
  customerIds: string[]
  isImmediate: boolean
  scheduledAt: Date | null
  timezone: string
  // Template variable configuration
  templateVariables?: TemplateVariablesConfig
  // Custom fields
  customFields?: CustomFieldsData
}

// Validation errors for broadcast form
export interface BroadcastFormErrors {
  name?: string
  templateId?: string
  groupId?: string
  customerIds?: string
  scheduledAt?: string
  templateVariables?: string
  headerMedia?: string
}
