import type { CustomFieldDefinition, CustomFieldValue } from "@/types/custom-fields"
import { getFieldRenderer } from "./renderers"

export interface CustomFieldRendererProps {
  definition: CustomFieldDefinition
  value: CustomFieldValue
  onChange: (value: CustomFieldValue) => void
  error?: string
  disabled?: boolean
}

/**
 * Orchestrator component that renders the appropriate field type
 * based on the field definition
 */
export function CustomFieldRenderer({
  definition,
  value,
  onChange,
  error,
  disabled = false,
}: CustomFieldRendererProps) {
  const fieldId = `custom-field-${definition.fieldKey}`

  // Get the appropriate renderer from the registry
  const FieldRenderer = getFieldRenderer(definition.fieldType)

  return (
    <div className="space-y-2">
      {/* Label - skip for BOOLEAN as it has inline label */}
      {definition.fieldType !== "BOOLEAN" && (
        <label htmlFor={fieldId} className="text-sm font-medium">
          {definition.displayLabel}
          {definition.validation.required && (
            <span className="text-destructive ml-1">*</span>
          )}
        </label>
      )}

      {/* BOOLEAN label is before the checkbox */}
      {definition.fieldType === "BOOLEAN" && (
        <label htmlFor={fieldId} className="text-sm font-medium">
          {definition.displayLabel}
          {definition.validation.required && (
            <span className="text-destructive ml-1">*</span>
          )}
        </label>
      )}

      {/* Field renderer */}
      <FieldRenderer
        definition={definition}
        value={value}
        onChange={onChange}
        error={error}
        disabled={disabled}
        id={fieldId}
      />

      {/* Error message */}
      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Description (only for non-BOOLEAN fields without errors) */}
      {!error &&
        definition.description &&
        definition.fieldType !== "BOOLEAN" && (
          <p className="text-sm text-muted-foreground">{definition.description}</p>
        )}
    </div>
  )
}
