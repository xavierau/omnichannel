import type { ColumnDef } from "@tanstack/react-table"
import { format } from "date-fns"
import type {
  CustomFieldDefinition,
  CustomFieldValue,
  CustomFieldsData,
} from "@/types/custom-fields"

// ============================================
// Value Formatters
// ============================================

function formatTextValue(value: CustomFieldValue): string {
  if (value === null || value === undefined) return "-"
  return String(value)
}

function formatNumberValue(
  value: CustomFieldValue,
  definition: CustomFieldDefinition
): string {
  if (value === null || value === undefined) return "-"
  const num = Number(value)
  if (isNaN(num)) return "-"

  if (definition.validation.precision !== undefined) {
    return num.toFixed(definition.validation.precision)
  }
  return num.toLocaleString()
}

function formatDateValue(
  value: CustomFieldValue,
  definition: CustomFieldDefinition
): string {
  if (value === null || value === undefined) return "-"

  const date = value instanceof Date ? value : new Date(value as string)
  if (isNaN(date.getTime())) return "-"

  const formatString = definition.fieldType === "DATETIME" ? "MMM d, yyyy h:mm a" : "MMM d, yyyy"
  return format(date, formatString)
}

function formatBooleanValue(value: CustomFieldValue): string {
  if (value === null || value === undefined) return "-"
  return value ? "Yes" : "No"
}

function formatSelectValue(
  value: CustomFieldValue,
  definition: CustomFieldDefinition
): string {
  if (value === null || value === undefined || value === "") return "-"

  const option = definition.options?.find((o) => o.value === value)
  return option?.label ?? String(value)
}

function formatMultiSelectValue(
  value: CustomFieldValue,
  definition: CustomFieldDefinition
): string {
  if (!Array.isArray(value) || value.length === 0) return "-"

  return value
    .map((v) => {
      const option = definition.options?.find((o) => o.value === v)
      return option?.label ?? v
    })
    .join(", ")
}

/**
 * Format a custom field value for display
 */
export function formatCustomFieldValue(
  value: CustomFieldValue,
  definition: CustomFieldDefinition
): string {
  switch (definition.fieldType) {
    case "TEXT":
    case "TEXTAREA":
    case "PHONE":
    case "EMAIL":
    case "URL":
      return formatTextValue(value)

    case "NUMBER":
      return formatNumberValue(value, definition)

    case "DATE":
    case "DATETIME":
      return formatDateValue(value, definition)

    case "BOOLEAN":
      return formatBooleanValue(value)

    case "SELECT":
      return formatSelectValue(value, definition)

    case "MULTISELECT":
      return formatMultiSelectValue(value, definition)

    default:
      return formatTextValue(value)
  }
}

// ============================================
// Column Generator
// ============================================

interface EntityWithCustomFields {
  customFields?: CustomFieldsData
}

/**
 * Generate table columns for custom fields
 */
export function generateCustomFieldColumns<T extends EntityWithCustomFields>(
  definitions: CustomFieldDefinition[]
): ColumnDef<T>[] {
  // Filter to visible fields and sort by display order
  const visibleDefinitions = definitions
    .filter((d) => d.isVisible)
    .sort((a, b) => a.displayOrder - b.displayOrder)

  return visibleDefinitions.map((definition) => ({
    id: `customField_${definition.fieldKey}`,
    accessorFn: (row) => row.customFields?.[definition.fieldKey] ?? null,
    header: definition.displayLabel,
    cell: ({ row }) => {
      const value = row.original.customFields?.[definition.fieldKey] ?? null
      return formatCustomFieldValue(value, definition)
    },
    // Enable sorting for appropriate field types
    enableSorting: ["TEXT", "NUMBER", "DATE", "DATETIME", "SELECT"].includes(
      definition.fieldType
    ),
    // Enable filtering for filterable fields
    filterFn: definition.isFilterable ? "auto" : undefined,
    meta: {
      customField: true,
      fieldKey: definition.fieldKey,
      fieldType: definition.fieldType,
      definition,
    },
  }))
}

/**
 * Get filter options for a select/multiselect custom field
 */
export function getCustomFieldFilterOptions(
  definition: CustomFieldDefinition
): { value: string; label: string }[] {
  if (!definition.options) return []

  return definition.options
    .sort((a, b) => a.order - b.order)
    .map((o) => ({
      value: o.value,
      label: o.label,
    }))
}

/**
 * Check if a custom field value matches a filter
 */
export function matchesCustomFieldFilter(
  value: CustomFieldValue,
  filter: string | string[],
  definition: CustomFieldDefinition
): boolean {
  if (!filter || (Array.isArray(filter) && filter.length === 0)) {
    return true
  }

  if (value === null || value === undefined) {
    return false
  }

  switch (definition.fieldType) {
    case "SELECT":
      if (Array.isArray(filter)) {
        return filter.includes(value as string)
      }
      return value === filter

    case "MULTISELECT":
      if (!Array.isArray(value)) return false
      if (Array.isArray(filter)) {
        return filter.some((f) => value.includes(f))
      }
      return value.includes(filter)

    case "BOOLEAN":
      if (filter === "true") return value === true
      if (filter === "false") return value === false
      return true

    case "TEXT":
    case "TEXTAREA":
    case "EMAIL":
    case "PHONE":
    case "URL": {
      const stringValue = String(value).toLowerCase()
      if (Array.isArray(filter)) {
        return filter.some((f) => stringValue.includes(f.toLowerCase()))
      }
      return stringValue.includes(filter.toLowerCase())
    }

    default:
      return true
  }
}
