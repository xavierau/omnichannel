import * as React from "react"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { Customer } from "@/pages/customers/types"
import type { WhatsAppTemplate } from "@/pages/whatsapp-templates/types"
import { BroadcastForm } from "./BroadcastForm"
import type { Broadcast, BroadcastFormData } from "../types"

interface Group {
  id: string
  name: string
  count: number
}

interface Timezone {
  value: string
  label: string
}

interface BroadcastFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  broadcast?: Broadcast
  availableTemplates: WhatsAppTemplate[]
  availableGroups: Group[]
  availableCustomers: Customer[]
  availableTimezones: Timezone[]
  onSubmit: (data: BroadcastFormData) => Promise<void>
}

export function BroadcastFormDialog({
  open,
  onOpenChange,
  broadcast,
  availableTemplates,
  availableGroups,
  availableCustomers,
  availableTimezones,
  onSubmit,
}: BroadcastFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const isEditMode = broadcast !== undefined

  // Compute initial values from broadcast prop
  const initialValues: BroadcastFormData | undefined = broadcast
    ? {
        name: broadcast.name,
        description: broadcast.description ?? "",
        templateId: broadcast.templateId,
        recipientType: broadcast.recipientType,
        groupId: broadcast.groupId ?? "",
        customerIds: broadcast.customerIds ?? [],
        isImmediate: broadcast.isImmediate,
        scheduledAt: broadcast.scheduledAt,
        timezone: broadcast.timezone,
      }
    : undefined

  const handleSubmit = async (data: BroadcastFormData) => {
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
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "Edit Broadcast" : "Create Broadcast"}
          </DialogTitle>
        </DialogHeader>
        <BroadcastForm
          key={broadcast?.id ?? "new"}
          initialValues={initialValues}
          availableTemplates={availableTemplates}
          availableGroups={availableGroups}
          availableCustomers={availableCustomers}
          availableTimezones={availableTimezones}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isSubmitting={isSubmitting}
        />
      </DialogContent>
    </Dialog>
  )
}
