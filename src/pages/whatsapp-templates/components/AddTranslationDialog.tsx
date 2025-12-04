import * as React from "react"

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
  AddTranslationFormData,
  TranslationFormData,
  WhatsAppTemplateGroup,
} from "../types"
import {
  defaultTranslationFormData,
  validateTranslationForm,
} from "../utils/validation"
import { TranslationForm } from "./TranslationForm"

interface AddTranslationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  templateGroup: WhatsAppTemplateGroup | null
  /** Optional initial values for pre-filling the form (e.g., when duplicating) */
  initialTranslation?: Partial<TranslationFormData>
  onSubmit: (data: AddTranslationFormData) => Promise<void>
}

/**
 * AddTranslationDialog - Adds a new translation to an existing template.
 *
 * This dialog handles:
 * - Displaying template name (read-only)
 * - Language selection (excluding already existing languages)
 * - Translation form (header, body, footer, buttons)
 *
 * Supports pre-filling with initial translation data for duplication workflows.
 */
export const AddTranslationDialog = React.memo(function AddTranslationDialog({
  open,
  onOpenChange,
  templateGroup,
  initialTranslation,
  onSubmit,
}: AddTranslationDialogProps) {
  // Translation form state
  const [translationData, setTranslationData] = React.useState<TranslationFormData>(
    defaultTranslationFormData
  )
  const [isTranslationValid, setIsTranslationValid] = React.useState(false)

  // Submission state
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  // Compute excluded languages (already have translations)
  const excludedLanguages = React.useMemo(() => {
    if (!templateGroup) return []
    return templateGroup.translations.map((t) => t.language)
  }, [templateGroup])

  // Compute initial values for the form
  const formInitialValues = React.useMemo((): TranslationFormData | undefined => {
    if (!initialTranslation) return undefined

    return {
      language: initialTranslation.language ?? defaultTranslationFormData.language,
      headerType: initialTranslation.headerType ?? defaultTranslationFormData.headerType,
      headerText: initialTranslation.headerText ?? defaultTranslationFormData.headerText,
      headerMediaUrl:
        initialTranslation.headerMediaUrl ?? defaultTranslationFormData.headerMediaUrl,
      body: initialTranslation.body ?? defaultTranslationFormData.body,
      footer: initialTranslation.footer ?? defaultTranslationFormData.footer,
      buttons: initialTranslation.buttons ?? defaultTranslationFormData.buttons,
    }
  }, [initialTranslation])

  // Reset form when dialog opens or template changes
  React.useEffect(() => {
    if (open) {
      setTranslationData(formInitialValues ?? defaultTranslationFormData)
      setIsTranslationValid(false)
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

      if (!templateGroup) return

      // Validate translation form
      const errors = validateTranslationForm(translationData, {
        requireLanguage: true,
      })

      if (Object.keys(errors).length > 0) {
        return
      }

      setIsSubmitting(true)
      try {
        await onSubmit({
          templateId: templateGroup.id,
          translation: translationData,
        })
        onOpenChange(false)
      } finally {
        setIsSubmitting(false)
      }
    },
    [templateGroup, translationData, onSubmit, onOpenChange]
  )

  // Handle cancel
  const handleCancel = React.useCallback(() => {
    onOpenChange(false)
  }, [onOpenChange])

  // Early return if no template group
  if (!templateGroup) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Translation</DialogTitle>
          <DialogDescription>
            Add a new language translation to the "{templateGroup.name}" template.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Template Info (Read-only) */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">
              Template Information
            </h3>

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
              <Label htmlFor="template-category-readonly">Category</Label>
              <Input
                id="template-category-readonly"
                type="text"
                value={templateGroup.category}
                disabled
                aria-readonly="true"
              />
            </div>
          </div>

          {/* Divider */}
          <div className="border-t" />

          {/* Translation Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">
              New Translation
            </h3>
            <TranslationForm
              key={`add-translation-${templateGroup.id}`}
              initialValues={formInitialValues}
              excludedLanguages={excludedLanguages}
              showLanguageSelector={true}
              onFormDataChange={handleTranslationFormChange}
              isSubmitting={isSubmitting}
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
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !isTranslationValid}>
              {isSubmitting ? "Adding..." : "Add Translation"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
})
