/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react"
import {
  inboxService,
  type Operator as ApiOperator,
} from "@/services/inbox.service"
import type { Operator, OperatorStatus, InboxSettings, VisibilityMode } from "@/pages/inbox/types"

interface OperatorContextType {
  currentOperator: Operator | null
  operators: Operator[]
  isLoading: boolean
  error: string | null
  inboxSettings: InboxSettings
  switchOperator: (operatorId: string) => void
  updateOperatorStatus: (status: OperatorStatus) => void
  updateVisibilityMode: (mode: VisibilityMode) => void
  refreshOperators: () => Promise<void>
}

const OperatorContext = createContext<OperatorContextType | undefined>(undefined)

interface OperatorProviderProps {
  children: ReactNode
}

// Adapter: Transform API Operator to frontend Operator
function toFrontendOperator(apiOperator: ApiOperator): Operator {
  return {
    id: apiOperator.id,
    name: `${apiOperator.firstName} ${apiOperator.lastName}`.trim(),
    email: apiOperator.email,
    status: apiOperator.isOnline ? "online" : "offline",
  }
}

export function OperatorProvider({ children }: OperatorProviderProps) {
  const [operators, setOperators] = useState<Operator[]>([])
  const [currentOperator, setCurrentOperator] = useState<Operator | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [inboxSettings, setInboxSettings] = useState<InboxSettings>({
    visibilityMode: "full_access",
  })

  // Fetch operators from API
  const fetchOperators = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const apiOperators = await inboxService.getOperators()
      const frontendOperators = apiOperators.map(toFrontendOperator)
      setOperators(frontendOperators)

      // Set current operator to first one if not already set
      if (!currentOperator && frontendOperators.length > 0) {
        setCurrentOperator(frontendOperators[0])
      } else if (currentOperator) {
        // Update current operator data if it exists in the new list
        const updatedCurrent = frontendOperators.find((op) => op.id === currentOperator.id)
        if (updatedCurrent) {
          setCurrentOperator(updatedCurrent)
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load operators")
      console.error("Failed to fetch operators:", err)
    } finally {
      setIsLoading(false)
    }
  }, [currentOperator])

  // Fetch operators on mount
  useEffect(() => {
    fetchOperators()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const switchOperator = useCallback(
    (operatorId: string) => {
      const operator = operators.find((op) => op.id === operatorId)
      if (operator) {
        setCurrentOperator(operator)
      }
    },
    [operators]
  )

  const updateOperatorStatus = useCallback((status: OperatorStatus) => {
    if (currentOperator) {
      setCurrentOperator({ ...currentOperator, status })
    }
  }, [currentOperator])

  const updateVisibilityMode = useCallback((mode: VisibilityMode) => {
    setInboxSettings((prev) => ({ ...prev, visibilityMode: mode }))
  }, [])

  const refreshOperators = useCallback(async () => {
    await fetchOperators()
  }, [fetchOperators])

  return (
    <OperatorContext.Provider
      value={{
        currentOperator,
        operators,
        isLoading,
        error,
        inboxSettings,
        switchOperator,
        updateOperatorStatus,
        updateVisibilityMode,
        refreshOperators,
      }}
    >
      {children}
    </OperatorContext.Provider>
  )
}

export function useOperator() {
  const context = useContext(OperatorContext)
  if (context === undefined) {
    throw new Error("useOperator must be used within an OperatorProvider")
  }
  return context
}
