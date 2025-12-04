import * as React from "react"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { TemplateForm } from "./TemplateForm"
import type { WhatsAppTemplate, TemplateFormData } from "../types"

interface TemplateFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  template?: WhatsAppTemplate
  onSubmit: (data: TemplateFormData) => Promise<void>
}

export function TemplateFormDialog({
  open,
  onOpenChange,
  template,
  onSubmit,
}: TemplateFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const isEditMode = template !== undefined

  // Transform template entity to form data
  const initialValues: TemplateFormData | undefined = template
    ? {
        name: template.name,
        category: template.category,
        language: template.language,
        headerType: template.header?.type ?? "NONE",
        headerText: template.header?.text ?? "",
        headerMediaUrl: template.header?.mediaUrl ?? "",
        body: template.body,
        footer: template.footer ?? "",
        buttons: template.buttons.map((btn) => ({
          id: btn.id,
          type: btn.type,
          text: btn.text,
          url: btn.url ?? "",
          phoneNumber: btn.phoneNumber ?? "",
        })),
      }
    : undefined

  const handleSubmit = async (data: TemplateFormData) => {
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "Edit Template" : "Create Template"}
          </DialogTitle>
        </DialogHeader>
        <TemplateForm
          key={template?.id ?? "new"}
          initialValues={initialValues}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isSubmitting={isSubmitting}
        />
      </DialogContent>
    </Dialog>
  )
}
