import * as React from "react"

import type {
  CustomFieldEntityType,
  CustomFieldsData,
  CustomFieldValue,
} from "@/types/custom-fields"
import { useCustomFieldDefinitions } from "./hooks/useCustomFieldDefinitions"
import { useCustomFieldDefaults } from "./hooks/useCustomFieldDefaults"
import { CustomFieldRenderer } from "./CustomFieldRenderer"
import { Skeleton } from "@/components/ui/skeleton"

export interface CustomFieldsFormSectionProps {
  entityType: CustomFieldEntityType
  values: CustomFieldsData
  onChange: (values: CustomFieldsData) => void
  errors?: Record<string, string>
  disabled?: boolean
  className?: string
}

/**
 * Form section that renders all custom fields for an entity type
 */
export function CustomFieldsFormSection({
  entityType,
  values,
  onChange,
  errors = {},
  disabled = false,
  className,
}: CustomFieldsFormSectionProps) {
  const { definitions, isLoading, error } = useCustomFieldDefinitions(entityType)

  // Initialize defaults when definitions load
  useCustomFieldDefaults(definitions, values, onChange)

  // Memoize the field change handler factory
  const handleFieldChange = React.useCallback(
    (key: string) => (value: CustomFieldValue) => {
      onChange({ ...values, [key]: value })
    },
    [values, onChange]
  )

  if (error) {
    return (
      <div className="p-4 border border-destructive rounded-md">
        <p className="text-sm text-destructive">
          Failed to load custom fields: {error.message}
        </p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-9 w-full" />
          </div>
        ))}
      </div>
    )
  }

  // Filter to only visible fields
  const visibleDefinitions = definitions.filter((d) => d.isVisible)

  if (visibleDefinitions.length === 0) {
    return null // No custom fields defined for this entity type
  }

  return (
    <div className={className}>
      <h3 className="text-sm font-medium text-muted-foreground mb-4">
        Additional Information
      </h3>
      <div className="space-y-4">
        {visibleDefinitions.map((definition) => (
          <CustomFieldRenderer
            key={definition.id}
            definition={definition}
            value={values[definition.fieldKey] ?? null}
            onChange={handleFieldChange(definition.fieldKey)}
            error={errors[definition.fieldKey]}
            disabled={disabled}
          />
        ))}
      </div>
    </div>
  )
}
