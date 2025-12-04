import { useMemo, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Check, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Operator } from "../types"
import { OperatorAvatar } from "./OperatorAvatar"

interface AssignConversationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  operators: Operator[]
  currentAssigneeId: string | null
  onAssign: (operatorId: string) => void
}

/**
 * Status label text for operator availability.
 */
const STATUS_LABELS: Record<Operator["status"], string> = {
  online: "Online",
  offline: "Offline",
  busy: "Busy",
}

/**
 * AssignConversationDialog provides a searchable list of operators
 * for assigning conversations.
 * Highlights the current assignee and allows filtering operators by name.
 */
export function AssignConversationDialog({
  open,
  onOpenChange,
  operators,
  currentAssigneeId,
  onAssign,
}: AssignConversationDialogProps) {
  const [searchQuery, setSearchQuery] = useState("")

  // Filter operators based on search query
  const filteredOperators = useMemo(() => {
    if (!searchQuery.trim()) {
      return operators
    }
    const query = searchQuery.toLowerCase()
    return operators.filter(
      (op) =>
        op.name.toLowerCase().includes(query) ||
        op.email.toLowerCase().includes(query)
    )
  }, [operators, searchQuery])

  // Sort operators: online first, then busy, then offline
  const sortedOperators = useMemo(() => {
    const statusOrder: Record<Operator["status"], number> = {
      online: 0,
      busy: 1,
      offline: 2,
    }
    return [...filteredOperators].sort(
      (a, b) => statusOrder[a.status] - statusOrder[b.status]
    )
  }, [filteredOperators])

  function handleAssign(operatorId: string) {
    onAssign(operatorId)
    onOpenChange(false)
    setSearchQuery("")
  }

  function handleOpenChange(nextOpen: boolean) {
    onOpenChange(nextOpen)
    if (!nextOpen) {
      setSearchQuery("")
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Conversation</DialogTitle>
          <DialogDescription>
            Select an operator to assign this conversation to.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search operators..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <ScrollArea className="max-h-[300px]">
          <div className="space-y-1">
            {sortedOperators.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No operators found
              </p>
            ) : (
              sortedOperators.map((operator) => {
                const isCurrentAssignee = operator.id === currentAssigneeId
                const isAvailable = operator.status === "online"

                return (
                  <Button
                    key={operator.id}
                    variant="ghost"
                    className={cn(
                      "w-full justify-start gap-3 px-3 py-2 h-auto",
                      isCurrentAssignee && "bg-accent"
                    )}
                    onClick={() => handleAssign(operator.id)}
                    disabled={!isAvailable && !isCurrentAssignee}
                  >
                    <OperatorAvatar
                      operator={operator}
                      size="md"
                      showStatus
                    />
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{operator.name}</span>
                        {isCurrentAssignee && (
                          <Check className="size-4 text-primary" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {STATUS_LABELS[operator.status]}
                      </p>
                    </div>
                  </Button>
                )
              })
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
