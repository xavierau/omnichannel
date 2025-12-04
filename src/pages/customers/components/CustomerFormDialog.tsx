import * as React from "react"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { CustomerForm } from "./CustomerForm"
import type { Customer, Tag, CustomerFormData } from "../types"

interface CustomerFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  customer?: Customer
  availableTags: Tag[]
  onSubmit: (data: CustomerFormData) => Promise<void>
}

export function CustomerFormDialog({
  open,
  onOpenChange,
  customer,
  availableTags,
  onSubmit,
}: CustomerFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const isEditMode = customer !== undefined

  // Compute initial values from customer prop
  const initialValues: CustomerFormData | undefined = customer
    ? {
        name: customer.name,
        whatsappNumber: customer.whatsappNumber,
        tagIds: customer.tags.map((tag) => tag.id),
      }
    : undefined

  const handleSubmit = async (data: CustomerFormData) => {
    setIsSubmitting(true)
    try {
      await onSubmit(data)
      onOpenChange(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "Edit Customer" : "Add Customer"}
          </DialogTitle>
        </DialogHeader>
        <CustomerForm
          key={customer?.id ?? "new"}
          initialValues={initialValues}
          availableTags={availableTags}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isSubmitting={isSubmitting}
        />
      </DialogContent>
    </Dialog>
  )
}
