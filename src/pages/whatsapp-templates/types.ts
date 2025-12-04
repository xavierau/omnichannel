import type { CustomFieldsData } from "@/types/custom-fields"

export type TemplateCategory = "MARKETING" | "UTILITY" | "AUTHENTICATION"
export type TemplateStatus = "APPROVED" | "PENDING" | "REJECTED"
export type TemplateQuality = "HIGH" | "MEDIUM" | "LOW" | "PENDING"
export type HeaderType = "TEXT" | "IMAGE" | "VIDEO" | "DOCUMENT" | "NONE"
export type ButtonType = "QUICK_REPLY" | "CALL" | "URL" | "COPY_CODE"

// Aggregated status for template groups (computed from translations)
export type AggregatedStatus =
  | "ALL_APPROVED"    // All translations approved
  | "SOME_PENDING"    // At least one pending
  | "SOME_REJECTED"   // At least one rejected (no pending)
  | "MIXED"           // Mix of approved and rejected
  | "NO_TRANSLATIONS" // No translations yet

export interface TemplateButton {
  id: string
  type: ButtonType
  text: string
  url?: string
  phoneNumber?: string
}

export interface TemplateHeader {
  type: HeaderType
  text?: string
  mediaUrl?: string
}

// Legacy: Single template with one language (kept for backward compatibility)
export interface WhatsAppTemplate {
  id: string
  name: string
  category: TemplateCategory
  status: TemplateStatus
  quality?: TemplateQuality
  language: string
  header?: TemplateHeader
  body: string
  footer?: string
  buttons: TemplateButton[]
  createdAt: Date
  updatedAt: Date
  rejectionReason?: string
}

// NEW: Translation-specific content and status
export interface TemplateTranslation {
  id: string
  language: string
  status: TemplateStatus
  quality?: TemplateQuality
  header?: TemplateHeader
  body: string
  footer?: string
  buttons: TemplateButton[]
  rejectionReason?: string
  createdAt: Date
  updatedAt: Date
}

// NEW: Template group that contains multiple translations
export interface WhatsAppTemplateGroup {
  id: string
  name: string
  category: TemplateCategory
  translations: TemplateTranslation[]
  customFields?: CustomFieldsData
  createdAt: Date
  updatedAt: Date
}

// Utility function for computing aggregated status
export function getAggregatedStatus(translations: TemplateTranslation[]): AggregatedStatus {
  if (translations.length === 0) return "NO_TRANSLATIONS"

  const hasPending = translations.some((t) => t.status === "PENDING")
  const hasRejected = translations.some((t) => t.status === "REJECTED")
  const hasApproved = translations.some((t) => t.status === "APPROVED")
  const allApproved = translations.every((t) => t.status === "APPROVED")

  if (allApproved) return "ALL_APPROVED"
  if (hasPending) return "SOME_PENDING"
  if (hasRejected && hasApproved) return "MIXED"
  if (hasRejected) return "SOME_REJECTED"
  return "MIXED"
}

export interface TemplateFilters {
  search: string
  categories: TemplateCategory[]
  statuses: TemplateStatus[]
  languages: string[]
  aggregatedStatuses: AggregatedStatus[]
  dateRange: {
    from: Date | undefined
    to: Date | undefined
  }
}

export const defaultFilters: TemplateFilters = {
  search: "",
  categories: [],
  statuses: [],
  languages: [],
  aggregatedStatuses: [],
  dateRange: {
    from: undefined,
    to: undefined,
  },
}

export const AGGREGATED_STATUSES: { value: AggregatedStatus; label: string }[] = [
  { value: "ALL_APPROVED", label: "All Approved" },
  { value: "SOME_PENDING", label: "Some Pending" },
  { value: "SOME_REJECTED", label: "Some Rejected" },
  { value: "MIXED", label: "Mixed Status" },
  { value: "NO_TRANSLATIONS", label: "No Translations" },
]

export const TEMPLATE_CATEGORIES: { value: TemplateCategory; label: string }[] = [
  { value: "MARKETING", label: "Marketing" },
  { value: "UTILITY", label: "Utility" },
  { value: "AUTHENTICATION", label: "Authentication" },
]

export const TEMPLATE_STATUSES: { value: TemplateStatus; label: string }[] = [
  { value: "APPROVED", label: "Approved" },
  { value: "PENDING", label: "Pending" },
  { value: "REJECTED", label: "Rejected" },
]

export const AVAILABLE_LANGUAGES: { value: string; label: string }[] = [
  { value: "en", label: "English" },
  { value: "en_US", label: "English (US)" },
  { value: "en_GB", label: "English (UK)" },
  { value: "zh_CN", label: "Chinese (Simplified)" },
  { value: "zh_TW", label: "Chinese (Traditional)" },
  { value: "zh_HK", label: "Chinese (Hong Kong)" },
  { value: "es", label: "Spanish" },
  { value: "pt_BR", label: "Portuguese (Brazil)" },
  { value: "id", label: "Indonesian" },
  { value: "ms", label: "Malay" },
  { value: "th", label: "Thai" },
  { value: "vi", label: "Vietnamese" },
  { value: "ja", label: "Japanese" },
  { value: "ko", label: "Korean" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "it", label: "Italian" },
  { value: "ar", label: "Arabic" },
  { value: "hi", label: "Hindi" },
]

export const HEADER_TYPES: { value: HeaderType; label: string }[] = [
  { value: "NONE", label: "None" },
  { value: "TEXT", label: "Text" },
  { value: "IMAGE", label: "Image" },
  { value: "VIDEO", label: "Video" },
  { value: "DOCUMENT", label: "Document" },
]

export const BUTTON_TYPES: { value: ButtonType; label: string }[] = [
  { value: "QUICK_REPLY", label: "Quick Reply" },
  { value: "URL", label: "URL" },
  { value: "CALL", label: "Call" },
  { value: "COPY_CODE", label: "Copy Code" },
]

// Form data for create/edit (excludes id, timestamps, status, quality)
export interface TemplateFormData {
  name: string
  category: TemplateCategory
  language: string
  headerType: HeaderType
  headerText: string
  headerMediaUrl: string
  body: string
  footer: string
  buttons: TemplateButtonFormData[]
}

export interface TemplateButtonFormData {
  id: string
  type: ButtonType
  text: string
  url: string
  phoneNumber: string
}

export interface TemplateFormErrors {
  name?: string
  category?: string
  language?: string
  headerText?: string
  headerMediaUrl?: string
  body?: string
  footer?: string
  buttons?: string
}

// NEW: Form data for translation content only (reusable for add/edit translation)
export interface TranslationFormData {
  language: string
  headerType: HeaderType
  headerText: string
  headerMediaUrl: string
  body: string
  footer: string
  buttons: TemplateButtonFormData[]
}

// NEW: Form data for creating a new template with first translation
export interface CreateTemplateFormData {
  name: string
  category: TemplateCategory
  translation: TranslationFormData
}

// NEW: Form data for adding a translation to existing template
export interface AddTranslationFormData {
  templateId: string
  translation: TranslationFormData
}

// NEW: Form data for editing an existing translation
export interface EditTranslationFormData {
  translationId: string
  translation: TranslationFormData
}

// Helper to get language label from code
export function getLanguageLabel(code: string): string {
  const lang = AVAILABLE_LANGUAGES.find((l) => l.value === code)
  return lang?.label ?? code
}
