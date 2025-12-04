import * as React from "react"
import {
  Copy,
  Eye,
  History,
  MoreHorizontal,
  Pencil,
  Send,
  SendHorizonal,
  Trash2,
  RotateCcw,
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
import type { WhatsAppTemplate } from "../types"

interface TemplateActionsProps {
  template: WhatsAppTemplate
  onView?: (template: WhatsAppTemplate) => void
  onEdit?: (template: WhatsAppTemplate) => void
  onDuplicate?: (template: WhatsAppTemplate) => void
  onSendTest?: (template: WhatsAppTemplate) => void
  onUseBroadcast?: (template: WhatsAppTemplate) => void
  onSubmitApproval?: (template: WhatsAppTemplate) => void
  onViewHistory?: (template: WhatsAppTemplate) => void
  onDelete?: (template: WhatsAppTemplate) => Promise<void>
}

export function TemplateActions({
  template,
  onView,
  onEdit,
  onDuplicate,
  onSendTest,
  onUseBroadcast,
  onSubmitApproval,
  onViewHistory,
  onDelete,
}: TemplateActionsProps) {
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false)

  const canEdit = template.status === "PENDING" || template.status === "REJECTED"
  const canDelete = template.status === "PENDING" || template.status === "REJECTED"
  const canSubmitApproval = template.status === "REJECTED"
  const canSendTest = template.status === "APPROVED"
  const canUseBroadcast = template.status === "APPROVED"

  const handleDelete = async () => {
    await onDelete?.(template)
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
          <DropdownMenuItem onClick={() => onView?.(template)}>
            <Eye className="mr-2 size-4" />
            View
          </DropdownMenuItem>

          {canEdit && (
            <DropdownMenuItem onClick={() => onEdit?.(template)}>
              <Pencil className="mr-2 size-4" />
              Edit
            </DropdownMenuItem>
          )}

          <DropdownMenuItem onClick={() => onDuplicate?.(template)}>
            <Copy className="mr-2 size-4" />
            Duplicate
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {canSendTest && (
            <DropdownMenuItem onClick={() => onSendTest?.(template)}>
              <Send className="mr-2 size-4" />
              Send Test
            </DropdownMenuItem>
          )}

          {canUseBroadcast && (
            <DropdownMenuItem onClick={() => onUseBroadcast?.(template)}>
              <SendHorizonal className="mr-2 size-4" />
              Use in Broadcast
            </DropdownMenuItem>
          )}

          {canSubmitApproval && (
            <DropdownMenuItem onClick={() => onSubmitApproval?.(template)}>
              <RotateCcw className="mr-2 size-4" />
              Submit for Approval
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={() => onViewHistory?.(template)}>
            <History className="mr-2 size-4" />
            View History
          </DropdownMenuItem>

          {canDelete && (
            <>
              <DropdownMenuSeparator />
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
        title="Delete Template"
        description={`Are you sure you want to delete "${template.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </>
  )
}
