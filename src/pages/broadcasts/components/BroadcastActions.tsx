import * as React from "react"
import {
  BarChart3,
  Calendar,
  Copy,
  Eye,
  MoreHorizontal,
  Pause,
  Pencil,
  Play,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import type { Broadcast } from "../types"

interface BroadcastActionsProps {
  broadcast: Broadcast
  onViewDetails?: (broadcast: Broadcast) => void
  onEdit?: (broadcast: Broadcast) => void
  onSchedule?: (broadcast: Broadcast) => void
  onPause?: (broadcast: Broadcast) => void
  onResume?: (broadcast: Broadcast) => void
  onCancel?: (broadcast: Broadcast) => Promise<void>
  onRetry?: (broadcast: Broadcast) => void
  onDuplicate?: (broadcast: Broadcast) => void
  onViewReport?: (broadcast: Broadcast) => void
  onDelete?: (broadcast: Broadcast) => Promise<void>
}

export function BroadcastActions({
  broadcast,
  onViewDetails,
  onEdit,
  onSchedule,
  onPause,
  onResume,
  onCancel,
  onRetry,
  onDuplicate,
  onViewReport,
  onDelete,
}: BroadcastActionsProps) {
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false)
  const [showCancelDialog, setShowCancelDialog] = React.useState(false)

  const { status } = broadcast

  // Define what actions are available based on status
  const canEdit = status === "DRAFT" || status === "SCHEDULED"
  const canSchedule = status === "DRAFT"
  const canPause = status === "SCHEDULED" || status === "SENDING"
  const canResume = status === "PAUSED"
  const canCancel = status === "SCHEDULED" || status === "PAUSED"
  const canRetry = status === "FAILED"
  const canDuplicate = status === "COMPLETED" || status === "CANCELLED" || status === "FAILED"
  const canViewReport = status === "COMPLETED" || status === "FAILED"
  const canDelete = status === "DRAFT" || status === "COMPLETED" || status === "CANCELLED" || status === "FAILED"
  const canViewDetails = status !== "DRAFT"

  const handleDelete = async () => {
    await onDelete?.(broadcast)
  }

  const handleCancel = async () => {
    await onCancel?.(broadcast)
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="size-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {canViewDetails && (
            <DropdownMenuItem onClick={() => onViewDetails?.(broadcast)}>
              <Eye className="mr-2 size-4" />
              View Details
            </DropdownMenuItem>
          )}

          {canViewReport && (
            <DropdownMenuItem onClick={() => onViewReport?.(broadcast)}>
              <BarChart3 className="mr-2 size-4" />
              View Report
            </DropdownMenuItem>
          )}

          {canEdit && (
            <DropdownMenuItem onClick={() => onEdit?.(broadcast)}>
              <Pencil className="mr-2 size-4" />
              Edit
            </DropdownMenuItem>
          )}

          {canSchedule && (
            <DropdownMenuItem onClick={() => onSchedule?.(broadcast)}>
              <Calendar className="mr-2 size-4" />
              Schedule
            </DropdownMenuItem>
          )}

          {(canViewDetails || canViewReport || canEdit || canSchedule) && (
            <DropdownMenuSeparator />
          )}

          {canPause && (
            <DropdownMenuItem onClick={() => onPause?.(broadcast)}>
              <Pause className="mr-2 size-4" />
              Pause
            </DropdownMenuItem>
          )}

          {canResume && (
            <DropdownMenuItem onClick={() => onResume?.(broadcast)}>
              <Play className="mr-2 size-4" />
              Resume
            </DropdownMenuItem>
          )}

          {canRetry && (
            <DropdownMenuItem onClick={() => onRetry?.(broadcast)}>
              <RefreshCw className="mr-2 size-4" />
              Retry
            </DropdownMenuItem>
          )}

          {canCancel && (
            <DropdownMenuItem
              onClick={() => setShowCancelDialog(true)}
              className="text-orange-600 focus:text-orange-600"
            >
              <X className="mr-2 size-4" />
              Cancel
            </DropdownMenuItem>
          )}

          {(canPause || canResume || canRetry || canCancel) && (
            <DropdownMenuSeparator />
          )}

          {canDuplicate && (
            <DropdownMenuItem onClick={() => onDuplicate?.(broadcast)}>
              <Copy className="mr-2 size-4" />
              Duplicate
            </DropdownMenuItem>
          )}

          {canDelete && (
            <>
              {canDuplicate && <DropdownMenuSeparator />}
              <DropdownMenuItem
                onClick={() => setShowDeleteDialog(true)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 size-4" />
                Delete
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete Broadcast"
        description={`Are you sure you want to delete "${broadcast.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
        onConfirm={handleDelete}
      />

      <ConfirmDialog
        open={showCancelDialog}
        onOpenChange={setShowCancelDialog}
        title="Cancel Broadcast"
        description={`Are you sure you want to cancel "${broadcast.name}"? Any pending messages will not be sent.`}
        confirmText="Cancel Broadcast"
        variant="destructive"
        onConfirm={handleCancel}
      />
    </>
  )
}
