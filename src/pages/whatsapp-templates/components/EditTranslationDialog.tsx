import * as React from "react"
import { AlertCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type {
  EditTranslationFormData,
  TranslationFormData,
  WhatsAppTemplateGroup,
  TemplateTranslation,
} from "../types"
import { getLanguageLabel } from "../types"
import {
  defaultTranslationFormData,
  validateTranslationForm,
} from "../utils/validation"
import { TranslationForm } from "./TranslationForm"

interface EditTranslationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  templateGroup: WhatsAppTemplateGroup | null
  translation: TemplateTranslation | null
  onSubmit: (data: EditTranslationFormData) => Promise<void>
}

/**
 * EditTranslationDialog - Edits an existing translation.
 *
 * This dialog handles:
 * - Displaying template name and language (read-only)
 * - Pre-filled translation form
 * - Only editable if status is PENDING or REJECTED
 * - Shows rejection reason if applicable
 */
export const EditTranslationDialog = React.memo(function EditTranslationDialog({
  open,
  onOpenChange,
  templateGroup,
  translation,
  onSubmit,
}: EditTranslationDialogProps) {
  // Translation form state
  const [translationData, setTranslationData] = React.useState<TranslationFormData>(
    defaultTranslationFormData
  )
  const [isTranslationValid, setIsTranslationValid] = React.useState(false)

  // Submission state
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  // Check if translation is editable
  const isEditable = React.useMemo(() => {
    if (!translation) return false
    return translation.status === "PENDING" || translation.status === "REJECTED"
  }, [translation])

  // Transform translation entity to form data
  const formInitialValues = React.useMemo((): TranslationFormData | undefined => {
    if (!translation) return undefined

    return {
      language: translation.language,
      headerType: translation.header?.type ?? "NONE",
      headerText: translation.header?.text ?? "",
      headerMediaUrl: translation.header?.mediaUrl ?? "",
      body: translation.body,
      footer: translation.footer ?? "",
      buttons: translation.buttons.map((btn) => ({
        id: btn.id,
        type: btn.type,
        text: btn.text,
        url: btn.url ?? "",
        phoneNumber: btn.phoneNumber ?? "",
      })),
    }
  }, [translation])

  // Reset form when dialog opens or translation changes
  React.useEffect(() => {
    if (open && formInitialValues) {
      setTranslationData(formInitialValues)
      setIsTranslationValid(true)
    }
  }, [open, formInitialValues])

  // Handle translation form data changes
  const handleTranslationFormChange = React.useCallback(
    (data: TranslationFormData, isValid: boolean) => {
      setTranslationData(data)
      setIsTranslationValid(isValid)
    },
    []
  )

  // Handle form submission
  const handleSubmit = React.useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()

      if (!translation || !isEditable) return

      // Validate translation form
      const errors = validateTranslationForm(translationData, {
        requireLanguage: false,
      })

      if (Object.keys(errors).length > 0) {
        return
      }

      setIsSubmitting(true)
      try {
        await onSubmit({
          translationId: translation.id,
          translation: translationData,
        })
        onOpenChange(false)
      } finally {
        setIsSubmitting(false)
      }
    },
    [translation, isEditable, translationData, onSubmit, onOpenChange]
  )

  // Handle cancel
  const handleCancel = React.useCallback(() => {
    onOpenChange(false)
  }, [onOpenChange])

  // Early return if no template group or translation
  if (!templateGroup || !translation) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Translation</DialogTitle>
          <DialogDescription>
            Edit the {getLanguageLabel(translation.language)} translation for "
            {templateGroup.name}".
          </DialogDescription>
        </DialogHeader>

        {/* Read-only warning for approved translations */}
        {!isEditable && (
          <div className="flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 p-4">
            <AlertCircle className="size-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800">
                This translation cannot be edited
              </p>
              <p className="text-sm text-amber-700 mt-1">
                Approved translations cannot be modified. If you need to make
                changes, please create a new version of this template.
              </p>
            </div>
          </div>
        )}

        {/* Rejection reason alert */}
        {translation.status === "REJECTED" && translation.rejectionReason && (
          <div className="flex items-start gap-3 rounded-md border border-red-200 bg-red-50 p-4">
            <AlertCircle className="size-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800">Rejection Reason</p>
              <p className="text-sm text-red-700 mt-1">
                {translation.rejectionReason}
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Template Info (Read-only) */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">
              Template Information
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="template-name-readonly">Template Name</Label>
                <Input
                  id="template-name-readonly"
                  type="text"
                  value={templateGroup.name}
                  disabled
                  aria-readonly="true"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="template-language-readonly">Language</Label>
                <Input
                  id="template-language-readonly"
                  type="text"
                  value={getLanguageLabel(translation.language)}
                  disabled
                  aria-readonly="true"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="template-category-readonly">Category</Label>
                <Input
                  id="template-category-readonly"
                  type="text"
                  value={templateGroup.category}
                  disabled
                  aria-readonly="true"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="translation-status-readonly">Status</Label>
                <Input
                  id="translation-status-readonly"
                  type="text"
                  value={translation.status}
                  disabled
                  aria-readonly="true"
                />
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t" />

          {/* Translation Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">
              Translation Content
            </h3>
            <TranslationForm
              key={`edit-translation-${translation.id}`}
              initialValues={formInitialValues}
              showLanguageSelector={false}
              onFormDataChange={handleTranslationFormChange}
              isSubmitting={isSubmitting || !isEditable}
            />
          </div>

          {/* Form Actions */}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              {isEditable ? "Cancel" : "Close"}
            </Button>
            {isEditable && (
              <Button type="submit" disabled={isSubmitting || !isTranslationValid}>
                {isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
})
