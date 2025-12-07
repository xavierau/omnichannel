import * as React from "react"
import type {
  CustomFieldDefinition,
  CustomFieldsData,
} from "@/types/custom-fields"

/**
 * Computes default values for custom fields
 */
function computeDefaults(definitions: CustomFieldDefinition[]): CustomFieldsData {
  const defaults: CustomFieldsData = {}

  for (const def of definitions) {
    if (def.defaultValue !== undefined && def.defaultValue !== null) {
      defaults[def.fieldKey] = def.defaultValue
    } else {
      // Set sensible defaults based on type
      switch (def.fieldType) {
        case "BOOLEAN":
          defaults[def.fieldKey] = false
          break
        case "MULTISELECT":
          defaults[def.fieldKey] = []
          break
        default:
          defaults[def.fieldKey] = null
      }
    }
  }

  return defaults
}

/**
 * Hook to initialize default values when definitions load.
 * Only sets defaults for keys that don't already have values.
 */
export function useCustomFieldDefaults(
  definitions: CustomFieldDefinition[],
  values: CustomFieldsData,
  onChange: (values: CustomFieldsData) => void
): void {
  // Use ref to avoid stale closure issues with onChange
  const onChangeRef = React.useRef(onChange)

  // Update ref in useEffect to avoid updating during render
  React.useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  // Track if we've initialized for current definitions
  const initializedRef = React.useRef<string | null>(null)

  React.useEffect(() => {
    if (definitions.length === 0) return

    // Create a stable key for current definitions
    const definitionKey = definitions.map((d) => d.id).join(",")

    // Only initialize once per set of definitions
    if (initializedRef.current === definitionKey) return

    const defaults = computeDefaults(definitions)

    // Check if there are new defaults to apply
    const hasNewDefaults = definitions.some(
      (def) => values[def.fieldKey] === undefined && defaults[def.fieldKey] !== undefined
    )

    if (hasNewDefaults) {
      // Merge: existing values take precedence over defaults
      const merged: CustomFieldsData = { ...defaults }
      for (const key of Object.keys(values)) {
        if (values[key] !== undefined) {
          merged[key] = values[key]
        }
      }
      onChangeRef.current(merged)
    }

    initializedRef.current = definitionKey
  }, [definitions, values])
}
