import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Hand,
  LogOut,
  MoreVertical,
  UserPlus,
  CheckCircle,
  XCircle,
  RefreshCw,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { Conversation, ConversationStatus, Operator } from "../types"
import { AssignConversationDialog } from "./AssignConversationDialog"
import { ConversationStatusBadge } from "./ConversationStatusBadge"
import { ChannelBadge } from "./ChannelBadge"

interface ChatHeaderProps {
  conversation: Conversation
  operators: Operator[]
  currentOperatorId: string
  onPickUp: () => void
  onRelease: () => void
  onAssign: (operatorId: string) => void
  onStatusChange: (status: ConversationStatus) => void
  className?: string
}

/**
 * Status options available for changing conversation state.
 */
const STATUS_OPTIONS: {
  value: ConversationStatus
  label: string
  icon: React.ComponentType<{ className?: string }>
}[] = [
  { value: "active", label: "Mark as Active", icon: RefreshCw },
  { value: "waiting", label: "Mark as Waiting", icon: RefreshCw },
  { value: "resolved", label: "Mark as Resolved", icon: CheckCircle },
  { value: "closed", label: "Close Conversation", icon: XCircle },
]

/**
 * ChatHeader displays conversation info and action controls.
 * Provides contextual actions based on conversation state:
 * - Unassigned: "Pick Up" button
 * - Assigned to current operator: "Release" and "Assign" options
 * - Assigned to others: "Take Over" option (in full_access mode)
 */
export function ChatHeader({
  conversation,
  operators,
  currentOperatorId,
  onPickUp,
  onRelease,
  onAssign,
  onStatusChange,
  className,
}: ChatHeaderProps) {
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)

  const isUnassigned = conversation.assignedToId === null
  const isAssignedToMe = conversation.assignedToId === currentOperatorId
  const isAssignedToOther = !isUnassigned && !isAssignedToMe
  const isClosed = conversation.status === "closed"

  return (
    <>
      <header
        className={cn(
          "flex items-center justify-between border-b bg-background px-4 py-3",
          className
        )}
      >
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <ChannelBadge
                channelAccount={conversation.channelAccount}
                variant="full"
                showTooltip={false}
              />
              <h2 className="font-semibold">{conversation.customerName}</h2>
              <ConversationStatusBadge status={conversation.status} />
            </div>
            <p className="text-sm text-muted-foreground">
              {conversation.customerWhatsappNumber}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Primary action button based on assignment state */}
          {isUnassigned && !isClosed && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button onClick={onPickUp} size="sm" className="gap-2">
                  <Hand className="size-4" />
                  Pick Up
                </Button>
              </TooltipTrigger>
              <TooltipContent>Assign this conversation to yourself</TooltipContent>
            </Tooltip>
          )}

          {isAssignedToMe && !isClosed && (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={onRelease}
                    variant="outline"
                    size="sm"
                    className="gap-2"
                  >
                    <LogOut className="size-4" />
                    Release
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  Release this conversation back to the queue
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={() => setAssignDialogOpen(true)}
                    variant="outline"
                    size="sm"
                    className="gap-2"
                  >
                    <UserPlus className="size-4" />
                    Assign
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Assign to another operator</TooltipContent>
              </Tooltip>
            </>
          )}

          {isAssignedToOther && !isClosed && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button onClick={onPickUp} variant="outline" size="sm" className="gap-2">
                  <Hand className="size-4" />
                  Take Over
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Take over this conversation from {conversation.assignedToName}
              </TooltipContent>
            </Tooltip>
          )}

          {/* Status dropdown menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm">
                <MoreVertical className="size-4" />
                <span className="sr-only">More options</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                onClick={() => setAssignDialogOpen(true)}
                disabled={isClosed}
              >
                <UserPlus className="mr-2 size-4" />
                Assign to...
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {STATUS_OPTIONS.filter(
                (option) => option.value !== conversation.status
              ).map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  onClick={() => onStatusChange(option.value)}
                >
                  <option.icon className="mr-2 size-4" />
                  {option.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <AssignConversationDialog
        open={assignDialogOpen}
        onOpenChange={setAssignDialogOpen}
        operators={operators}
        currentAssigneeId={conversation.assignedToId}
        onAssign={onAssign}
      />
    </>
  )
}
