import * as React from "react"
import {
  Copy,
  Eye,
  MoreHorizontal,
  Pencil,
  RotateCcw,
  Send,
  SendHorizonal,
  Trash2,
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
import type { WhatsAppTemplateGroup, TemplateTranslation } from "../types"
import { getLanguageLabel } from "../types"

interface TranslationActionsProps {
  group: WhatsAppTemplateGroup
  translation: TemplateTranslation
  onView?: (group: WhatsAppTemplateGroup, translation: TemplateTranslation) => void
  onEdit?: (group: WhatsAppTemplateGroup, translation: TemplateTranslation) => void
  onDuplicate?: (group: WhatsAppTemplateGroup, translation: TemplateTranslation) => void
  onSendTest?: (group: WhatsAppTemplateGroup, translation: TemplateTranslation) => void
  onUseBroadcast?: (group: WhatsAppTemplateGroup, translation: TemplateTranslation) => void
  onSubmitApproval?: (group: WhatsAppTemplateGroup, translation: TemplateTranslation) => void
  onDelete?: (group: WhatsAppTemplateGroup, translation: TemplateTranslation) => Promise<void>
}

export function TranslationActions({
  group,
  translation,
  onView,
  onEdit,
  onDuplicate,
  onSendTest,
  onUseBroadcast,
  onSubmitApproval,
  onDelete,
}: TranslationActionsProps) {
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false)

  const canEdit =
    translation.status === "PENDING" || translation.status === "REJECTED"
  const canDelete =
    translation.status === "PENDING" || translation.status === "REJECTED"
  const canSubmitApproval = translation.status === "REJECTED"
  const canSendTest = translation.status === "APPROVED"
  const canUseBroadcast = translation.status === "APPROVED"

  const handleDelete = async () => {
    await onDelete?.(group, translation)
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
          <DropdownMenuItem onClick={() => onView?.(group, translation)}>
            <Eye className="mr-2 size-4" />
            View
          </DropdownMenuItem>

          {canEdit && (
            <DropdownMenuItem onClick={() => onEdit?.(group, translation)}>
              <Pencil className="mr-2 size-4" />
              Edit
            </DropdownMenuItem>
          )}

          <DropdownMenuItem onClick={() => onDuplicate?.(group, translation)}>
            <Copy className="mr-2 size-4" />
            Duplicate to New Language
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {canSendTest && (
            <DropdownMenuItem onClick={() => onSendTest?.(group, translation)}>
              <Send className="mr-2 size-4" />
              Send Test
            </DropdownMenuItem>
          )}

          {canUseBroadcast && (
            <DropdownMenuItem onClick={() => onUseBroadcast?.(group, translation)}>
              <SendHorizonal className="mr-2 size-4" />
              Use in Broadcast
            </DropdownMenuItem>
          )}

          {canSubmitApproval && (
            <DropdownMenuItem onClick={() => onSubmitApproval?.(group, translation)}>
              <RotateCcw className="mr-2 size-4" />
              Submit for Approval
            </DropdownMenuItem>
          )}

          {canDelete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setShowDeleteDialog(true)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 size-4" />
                Delete Translation
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete Translation"
        description={`Are you sure you want to delete the ${getLanguageLabel(translation.language)} translation of "${group.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </>
  )
}
