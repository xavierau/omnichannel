import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { ChevronDown, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Operator } from "../types"
import { OperatorAvatar } from "./OperatorAvatar"

interface OperatorSelectorProps {
  operators: Operator[]
  currentOperator: Operator | null
  onSelect: (operatorId: string) => void
  className?: string
}

/**
 * Status labels for operator availability display.
 */
const STATUS_LABELS: Record<Operator["status"], string> = {
  online: "Online",
  offline: "Offline",
  busy: "Busy",
}

/**
 * OperatorSelector allows switching between operators.
 * Used for demo purposes to simulate different operator perspectives.
 * Displays current operator with status and provides dropdown to switch.
 */
export function OperatorSelector({
  operators,
  currentOperator,
  onSelect,
  className,
}: OperatorSelectorProps) {
  // Sort operators: online first, then busy, then offline
  const sortedOperators = [...operators].sort((a, b) => {
    const statusOrder: Record<Operator["status"], number> = {
      online: 0,
      busy: 1,
      offline: 2,
    }
    return statusOrder[a.status] - statusOrder[b.status]
  })

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            "h-auto gap-2 px-3 py-2 justify-start",
            className
          )}
        >
          {currentOperator ? (
            <>
              <OperatorAvatar
                operator={currentOperator}
                size="sm"
                showStatus
              />
              <div className="flex flex-col items-start text-left">
                <span className="text-sm font-medium">
                  {currentOperator.name}
                </span>
                <span className="text-xs text-muted-foreground">
                  {STATUS_LABELS[currentOperator.status]}
                </span>
              </div>
            </>
          ) : (
            <span className="text-muted-foreground">Select operator</span>
          )}
          <ChevronDown className="ml-auto size-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>Switch Operator (Demo)</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {sortedOperators.map((operator) => {
          const isSelected = currentOperator?.id === operator.id

          return (
            <DropdownMenuItem
              key={operator.id}
              onClick={() => onSelect(operator.id)}
              className="gap-3"
            >
              <OperatorAvatar
                operator={operator}
                size="sm"
                showStatus
              />
              <div className="flex-1">
                <div className="font-medium">{operator.name}</div>
                <div className="text-xs text-muted-foreground">
                  {STATUS_LABELS[operator.status]}
                </div>
              </div>
              {isSelected && <Check className="size-4 text-primary" />}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
