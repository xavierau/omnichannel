import type { TagColor } from "@/components/ui/tag-badge"
import type { CustomFieldsData } from "@/types/custom-fields"

export interface Customer {
  id: string
  name: string
  whatsappNumber: string
  tags: Tag[]
  customFields?: CustomFieldsData
  createdAt: Date
  updatedAt: Date
}

export interface Tag {
  id: string
  name: string
  color: TagColor
}

export interface CustomerFilters {
  search: string
  tags: string[]
  dateRange: {
    from: Date | undefined
    to: Date | undefined
  }
}

export const defaultFilters: CustomerFilters = {
  search: "",
  tags: [],
  dateRange: {
    from: undefined,
    to: undefined,
  },
}

export interface CustomerFormData {
  name: string
  whatsappNumber: string
  tagIds: string[]
  customFields?: CustomFieldsData
}

export interface CustomerFormErrors {
  name?: string
  whatsappNumber?: string
  customFields?: Record<string, string>
}
