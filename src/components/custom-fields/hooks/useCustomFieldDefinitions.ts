import * as React from "react"
import type {
  CustomFieldDefinition,
  CustomFieldEntityType,
} from "@/types/custom-fields"
import { getCustomFieldsForEntity } from "@/pages/settings/data/mock-custom-fields"

interface UseCustomFieldDefinitionsResult {
  definitions: CustomFieldDefinition[]
  isLoading: boolean
  error: Error | null
  refetch: () => void
}

/**
 * Hook to fetch custom field definitions for an entity type
 */
export function useCustomFieldDefinitions(
  entityType: CustomFieldEntityType
): UseCustomFieldDefinitionsResult {
  const [definitions, setDefinitions] = React.useState<CustomFieldDefinition[]>(
    []
  )
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<Error | null>(null)
  const [fetchKey, setFetchKey] = React.useState(0)

  React.useEffect(() => {
    let isMounted = true

    async function fetchDefinitions() {
      setIsLoading(true)
      setError(null)

      try {
        // Simulate async fetch (in real app, this would be an API call)
        await new Promise((resolve) => setTimeout(resolve, 100))

        const data = getCustomFieldsForEntity(entityType)

        if (isMounted) {
          setDefinitions(data.sort((a, b) => a.displayOrder - b.displayOrder))
          setIsLoading(false)
        }
      } catch (err) {
        if (isMounted) {
          setError(
            err instanceof Error
              ? err
              : new Error("Failed to fetch field definitions")
          )
          setIsLoading(false)
        }
      }
    }

    fetchDefinitions()

    return () => {
      isMounted = false
    }
  }, [entityType, fetchKey])

  const refetch = React.useCallback(() => {
    setFetchKey((k) => k + 1)
  }, [])

  return { definitions, isLoading, error, refetch }
}
