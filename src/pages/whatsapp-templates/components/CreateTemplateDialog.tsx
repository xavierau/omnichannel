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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type {
  CreateTemplateFormData,
  TemplateCategory,
  TranslationFormData,
} from "../types"
import { TEMPLATE_CATEGORIES } from "../types"
import {
  defaultTranslationFormData,
  validateTranslationForm,
  validateTemplateName,
} from "../utils/validation"
import { TranslationForm } from "./TranslationForm"

interface CreateTemplateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: CreateTemplateFormData) => Promise<void>
}

interface TemplateNameErrors {
  name?: string
  category?: string
}

/**
 * CreateTemplateDialog - Creates a new template with its first translation.
 *
 * This dialog handles:
 * - Template name input with lowercase_with_underscores validation
 * - Category selection (MARKETING, UTILITY, AUTHENTICATION)
 * - First translation form (language, header, body, footer, buttons)
 */
export const CreateTemplateDialog = React.memo(function CreateTemplateDialog({
  open,
  onOpenChange,
  onSubmit,
}: CreateTemplateDialogProps) {
  // Template-level state
  const [name, setName] = React.useState("")
  const [category, setCategory] = React.useState<TemplateCategory>("MARKETING")
  const [nameErrors, setNameErrors] = React.useState<TemplateNameErrors>({})

  // Translation form state (managed by TranslationForm, tracked here for submission)
  const [translationData, setTranslationData] = React.useState<TranslationFormData>(
    defaultTranslationFormData
  )
  const [isTranslationValid, setIsTranslationValid] = React.useState(false)

  // Submission state
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  // Reset form when dialog opens/closes
  React.useEffect(() => {
    if (open) {
      setName("")
      setCategory("MARKETING")
      setNameErrors({})
      setTranslationData(defaultTranslationFormData)
      setIsTranslationValid(false)
    }
  }, [open])

  // Handle translation form data changes
  const handleTranslationFormChange = React.useCallback(
    (data: TranslationFormData, isValid: boolean) => {
      setTranslationData(data)
      setIsTranslationValid(isValid)
    },
    []
  )

  // Validate the entire form
  const validateForm = React.useCallback((): boolean => {
    const newNameErrors: TemplateNameErrors = {}

    // Validate template name
    const nameError = validateTemplateName(name)
    if (nameError) {
      newNameErrors.name = nameError
    }

    // Validate category
    if (!category) {
      newNameErrors.category = "Category is required"
    }

    setNameErrors(newNameErrors)

    // Check translation validation
    const translationErrors = validateTranslationForm(translationData, {
      requireLanguage: true,
    })

    return (
      Object.keys(newNameErrors).length === 0 &&
      Object.keys(translationErrors).length === 0
    )
  }, [name, category, translationData])

  // Handle form submission
  const handleSubmit = React.useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()

      if (!validateForm()) {
        return
      }

      setIsSubmitting(true)
      try {
        await onSubmit({
          name: name.trim(),
          category,
          translation: translationData,
        })
        onOpenChange(false)
      } finally {
        setIsSubmitting(false)
      }
    },
    [validateForm, name, category, translationData, onSubmit, onOpenChange]
  )

  // Handle cancel
  const handleCancel = React.useCallback(() => {
    onOpenChange(false)
  }, [onOpenChange])

  // Field change handlers
  const handleNameChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setName(e.target.value)
      if (nameErrors.name) {
        setNameErrors((prev) => ({ ...prev, name: undefined }))
      }
    },
    [nameErrors.name]
  )

  const handleCategoryChange = React.useCallback(
    (value: TemplateCategory) => {
      setCategory(value)
      if (nameErrors.category) {
        setNameErrors((prev) => ({ ...prev, category: undefined }))
      }
    },
    [nameErrors.category]
  )

  // Compute if form is ready for submission
  const isFormValid = React.useMemo(() => {
    const nameError = validateTemplateName(name)
    return !nameError && category && isTranslationValid
  }, [name, category, isTranslationValid])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Template</DialogTitle>
          <DialogDescription>
            Create a new WhatsApp message template with its first language
            translation.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Template Info Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">
              Template Information
            </h3>

            {/* Template Name */}
            <div className="space-y-2">
              <Label htmlFor="template-name">
                Template Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="template-name"
                type="text"
                value={name}
                onChange={handleNameChange}
                placeholder="e.g., order_confirmation"
                aria-invalid={!!nameErrors.name}
                aria-describedby="template-name-hint"
                disabled={isSubmitting}
                autoFocus
              />
              <p id="template-name-hint" className="text-xs text-muted-foreground">
                Only lowercase letters, numbers, and underscores allowed
              </p>
              {nameErrors.name && (
                <p className="text-sm text-destructive" role="alert">
                  {nameErrors.name}
                </p>
              )}
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label htmlFor="template-category">
                Category <span className="text-destructive">*</span>
              </Label>
              <Select
                value={category}
                onValueChange={handleCategoryChange}
                disabled={isSubmitting}
              >
                <SelectTrigger
                  id="template-category"
                  aria-invalid={!!nameErrors.category}
                >
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {TEMPLATE_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {nameErrors.category && (
                <p className="text-sm text-destructive" role="alert">
                  {nameErrors.category}
                </p>
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="border-t" />

          {/* Translation Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">
              First Translation
            </h3>
            <TranslationForm
              key="create-template-translation"
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
            <Button type="submit" disabled={isSubmitting || !isFormValid}>
              {isSubmitting ? "Creating..." : "Create Template"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
})
