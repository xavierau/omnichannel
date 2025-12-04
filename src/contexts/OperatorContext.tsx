import { createContext, useContext, useState, useCallback, type ReactNode } from "react"
import type { Operator, OperatorStatus, InboxSettings, VisibilityMode } from "@/pages/inbox/types"
import { mockOperators } from "@/pages/inbox/data/mock-operators"

interface OperatorContextType {
  currentOperator: Operator | null
  operators: Operator[]
  inboxSettings: InboxSettings
  switchOperator: (operatorId: string) => void
  updateOperatorStatus: (status: OperatorStatus) => void
  updateVisibilityMode: (mode: VisibilityMode) => void
}

const OperatorContext = createContext<OperatorContextType | undefined>(undefined)

interface OperatorProviderProps {
  children: ReactNode
}

export function OperatorProvider({ children }: OperatorProviderProps) {
  const [operators] = useState<Operator[]>(mockOperators)
  const [currentOperator, setCurrentOperator] = useState<Operator | null>(mockOperators[0] || null)
  const [inboxSettings, setInboxSettings] = useState<InboxSettings>({
    visibilityMode: "full_access",
  })

  const switchOperator = useCallback((operatorId: string) => {
    const operator = operators.find((op) => op.id === operatorId)
    if (operator) {
      setCurrentOperator(operator)
    }
  }, [operators])

  const updateOperatorStatus = useCallback((status: OperatorStatus) => {
    if (currentOperator) {
      setCurrentOperator({ ...currentOperator, status })
    }
  }, [currentOperator])

  const updateVisibilityMode = useCallback((mode: VisibilityMode) => {
    setInboxSettings((prev) => ({ ...prev, visibilityMode: mode }))
  }, [])

  return (
    <OperatorContext.Provider
      value={{
        currentOperator,
        operators,
        inboxSettings,
        switchOperator,
        updateOperatorStatus,
        updateVisibilityMode,
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
