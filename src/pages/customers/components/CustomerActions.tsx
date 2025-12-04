import * as React from "react"
import { Eye, MessageCircle, MoreHorizontal, Pencil, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import type { Customer } from "../types"

interface CustomerActionsProps {
  customer: Customer
  onView?: (customer: Customer) => void
  onEdit?: (customer: Customer) => void
  onDelete?: (customer: Customer) => Promise<void>
  onMessage?: (customer: Customer) => void
}

export function CustomerActions({
  customer,
  onView,
  onEdit,
  onDelete,
  onMessage,
}: CustomerActionsProps) {
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false)

  const handleMessage = () => {
    // Clean the phone number for WhatsApp link
    const cleanNumber = customer.whatsappNumber.replace(/[^0-9+]/g, "")
    window.open(`https://wa.me/${cleanNumber.replace("+", "")}`, "_blank")
    onMessage?.(customer)
  }

  const handleDelete = async () => {
    await onDelete?.(customer)
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
          <DropdownMenuItem onClick={() => onView?.(customer)}>
            <Eye className="mr-2 size-4" />
            View
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onEdit?.(customer)}>
            <Pencil className="mr-2 size-4" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleMessage}>
            <MessageCircle className="mr-2 size-4" />
            Message
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setShowDeleteDialog(true)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 size-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete Customer"
        description={`Are you sure you want to delete "${customer.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </>
  )
}
