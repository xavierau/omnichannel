import * as React from "react"
import { Download, MoreHorizontal, Plus, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import type { WhatsAppTemplateGroup } from "../types"

interface TemplateGroupActionsProps {
  group: WhatsAppTemplateGroup
  onAddTranslation?: (group: WhatsAppTemplateGroup) => void
  onExport?: (group: WhatsAppTemplateGroup) => void
  onDelete?: (group: WhatsAppTemplateGroup) => Promise<void>
}

export function TemplateGroupActions({
  group,
  onAddTranslation,
  onExport,
  onDelete,
}: TemplateGroupActionsProps) {
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false)

  // Can only delete if all translations are PENDING or REJECTED
  const canDelete = group.translations.every(
    (t) => t.status === "PENDING" || t.status === "REJECTED"
  )

  const handleDelete = async () => {
    await onDelete?.(group)
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
          <DropdownMenuItem onClick={() => onAddTranslation?.(group)}>
            <Plus className="mr-2 size-4" />
            Add Translation
          </DropdownMenuItem>

          <DropdownMenuItem onClick={() => onExport?.(group)}>
            <Download className="mr-2 size-4" />
            Export All
          </DropdownMenuItem>

          {canDelete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setShowDeleteDialog(true)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 size-4" />
                Delete Template
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete Template"
        description={`Are you sure you want to delete "${group.name}" and all its ${group.translations.length} translation(s)? This action cannot be undone.`}
        confirmText="Delete All"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </>
  )
}
