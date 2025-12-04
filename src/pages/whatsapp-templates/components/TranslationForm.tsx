import * as React from "react"
import { Plus, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
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
  TranslationFormData,
  TemplateButtonFormData,
  HeaderType,
  ButtonType,
} from "../types"
import {
  AVAILABLE_LANGUAGES,
  HEADER_TYPES,
  BUTTON_TYPES,
} from "../types"
import {
  type TranslationFormErrors,
  defaultTranslationFormData,
  validateTranslationForm,
} from "../utils/validation"

// Constants
const MAX_BUTTONS = 3

// Form props
interface TranslationFormProps {
  initialValues?: TranslationFormData
  excludedLanguages?: string[]
  showLanguageSelector?: boolean
  languageReadOnly?: boolean
  onFormDataChange?: (data: TranslationFormData, isValid: boolean) => void
  isSubmitting?: boolean
}

// Helper to generate unique button IDs
function generateButtonId(): string {
  return `btn_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

// Helper to create an empty button
function createEmptyButton(): TemplateButtonFormData {
  return {
    id: generateButtonId(),
    type: "QUICK_REPLY",
    text: "",
    url: "",
    phoneNumber: "",
  }
}

/**
 * TranslationForm - A reusable form component for translation content.
 *
 * This component handles the translation-specific fields (language, header, body, footer, buttons)
 * and can be used by CreateTemplateDialog, AddTranslationDialog, and EditTranslationDialog.
 *
 * The component reports its current form data and validity to the parent via onFormDataChange
 * callback, allowing the parent to control submission.
 */
export const TranslationForm = React.memo(function TranslationForm({
  initialValues,
  excludedLanguages = [],
  showLanguageSelector = true,
  languageReadOnly = false,
  onFormDataChange,
  isSubmitting = false,
}: TranslationFormProps) {
  // Compute initial language, ensuring it's not in the excluded list
  const initialLanguage = React.useMemo(() => {
    const providedLanguage = initialValues?.language ?? defaultTranslationFormData.language
    // If the provided language is excluded, use empty string to force selection
    if (excludedLanguages.includes(providedLanguage)) {
      return ""
    }
    return providedLanguage
  }, [initialValues?.language, excludedLanguages])

  // Form state
  const [language, setLanguage] = React.useState(initialLanguage)
  const [headerType, setHeaderType] = React.useState<HeaderType>(
    initialValues?.headerType ?? defaultTranslationFormData.headerType
  )
  const [headerText, setHeaderText] = React.useState(
    initialValues?.headerText ?? defaultTranslationFormData.headerText
  )
  const [headerMediaUrl, setHeaderMediaUrl] = React.useState(
    initialValues?.headerMediaUrl ?? defaultTranslationFormData.headerMediaUrl
  )
  const [body, setBody] = React.useState(
    initialValues?.body ?? defaultTranslationFormData.body
  )
  const [footer, setFooter] = React.useState(
    initialValues?.footer ?? defaultTranslationFormData.footer
  )
  const [buttons, setButtons] = React.useState<TemplateButtonFormData[]>(
    initialValues?.buttons ?? defaultTranslationFormData.buttons
  )
  const [errors, setErrors] = React.useState<TranslationFormErrors>({})

  // Filter available languages based on excluded list
  const availableLanguages = React.useMemo(() => {
    return AVAILABLE_LANGUAGES.filter(
      (lang) => !excludedLanguages.includes(lang.value)
    )
  }, [excludedLanguages])

  // Reset language when initialLanguage changes (handles dialog reopening)
  React.useEffect(() => {
    setLanguage(initialLanguage)
  }, [initialLanguage])

  // Build form data from current state
  const buildFormData = React.useCallback((): TranslationFormData => {
    return {
      language,
      headerType,
      headerText: headerType === "TEXT" ? headerText.trim() : "",
      headerMediaUrl:
        headerType === "IMAGE" || headerType === "VIDEO" || headerType === "DOCUMENT"
          ? headerMediaUrl.trim()
          : "",
      body: body.trim(),
      footer: footer.trim(),
      buttons: buttons.map((btn) => ({
        ...btn,
        text: btn.text.trim(),
        url: btn.type === "URL" ? btn.url.trim() : "",
        phoneNumber: btn.type === "CALL" ? btn.phoneNumber.trim() : "",
      })),
    }
  }, [language, headerType, headerText, headerMediaUrl, body, footer, buttons])

  // Notify parent of form data changes
  React.useEffect(() => {
    if (onFormDataChange) {
      const formData = buildFormData()
      const validationErrors = validateTranslationForm(formData, {
        requireLanguage: showLanguageSelector,
      })
      const isValid = Object.keys(validationErrors).length === 0
      onFormDataChange(formData, isValid)
    }
  }, [buildFormData, onFormDataChange, showLanguageSelector])

  // Clear specific error when field changes
  const clearError = React.useCallback((field: keyof TranslationFormErrors) => {
    setErrors((prev) => {
      if (prev[field]) {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      }
      return prev
    })
  }, [])

  // Field change handlers
  const handleLanguageChange = React.useCallback(
    (value: string) => {
      setLanguage(value)
      clearError("language")
    },
    [clearError]
  )

  const handleHeaderTypeChange = React.useCallback((value: HeaderType) => {
    setHeaderType(value)
    setErrors((prev) => ({
      ...prev,
      headerText: undefined,
      headerMediaUrl: undefined,
    }))
  }, [])

  const handleHeaderTextChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setHeaderText(e.target.value)
      clearError("headerText")
    },
    [clearError]
  )

  const handleHeaderMediaUrlChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setHeaderMediaUrl(e.target.value)
      clearError("headerMediaUrl")
    },
    [clearError]
  )

  const handleBodyChange = React.useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setBody(e.target.value)
      clearError("body")
    },
    [clearError]
  )

  const handleFooterChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setFooter(e.target.value)
    },
    []
  )

  // Button array operations
  const handleAddButton = React.useCallback(() => {
    if (buttons.length < MAX_BUTTONS) {
      setButtons((prev) => [...prev, createEmptyButton()])
    }
  }, [buttons.length])

  const handleRemoveButton = React.useCallback(
    (buttonId: string) => {
      setButtons((prev) => prev.filter((btn) => btn.id !== buttonId))
      clearError("buttons")
    },
    [clearError]
  )

  const handleButtonTypeChange = React.useCallback(
    (buttonId: string, newType: ButtonType) => {
      setButtons((prev) =>
        prev.map((btn) =>
          btn.id === buttonId
            ? { ...btn, type: newType, url: "", phoneNumber: "" }
            : btn
        )
      )
      clearError("buttons")
    },
    [clearError]
  )

  const handleButtonTextChange = React.useCallback(
    (buttonId: string, text: string) => {
      setButtons((prev) =>
        prev.map((btn) => (btn.id === buttonId ? { ...btn, text } : btn))
      )
      clearError("buttons")
    },
    [clearError]
  )

  const handleButtonUrlChange = React.useCallback(
    (buttonId: string, url: string) => {
      setButtons((prev) =>
        prev.map((btn) => (btn.id === buttonId ? { ...btn, url } : btn))
      )
      clearError("buttons")
    },
    [clearError]
  )

  const handleButtonPhoneChange = React.useCallback(
    (buttonId: string, phoneNumber: string) => {
      setButtons((prev) =>
        prev.map((btn) => (btn.id === buttonId ? { ...btn, phoneNumber } : btn))
      )
      clearError("buttons")
    },
    [clearError]
  )

  return (
    <div className="space-y-4">
      {/* Language Selector */}
      {showLanguageSelector && (
        <div className="space-y-2">
          <Label htmlFor="language">
            Language <span className="text-destructive">*</span>
          </Label>
          {languageReadOnly ? (
            <Input
              id="language"
              type="text"
              value={
                AVAILABLE_LANGUAGES.find((l) => l.value === language)?.label ??
                language
              }
              disabled
              aria-readonly="true"
            />
          ) : (
            <Select
              value={language}
              onValueChange={handleLanguageChange}
              disabled={isSubmitting}
            >
              <SelectTrigger id="language" aria-invalid={!!errors.language}>
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                {availableLanguages.map((lang) => (
                  <SelectItem key={lang.value} value={lang.value}>
                    {lang.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {errors.language && (
            <p className="text-sm text-destructive">{errors.language}</p>
          )}
        </div>
      )}

      {/* Header Section */}
      <div className="space-y-2">
        <Label>Header</Label>
        <Select
          value={headerType}
          onValueChange={handleHeaderTypeChange}
          disabled={isSubmitting}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select header type" />
          </SelectTrigger>
          <SelectContent>
            {HEADER_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Conditional header text field */}
        {headerType === "TEXT" && (
          <div className="space-y-2 pt-2">
            <Input
              id="headerText"
              type="text"
              value={headerText}
              onChange={handleHeaderTextChange}
              placeholder="Enter header text"
              aria-invalid={!!errors.headerText}
              disabled={isSubmitting}
            />
            {errors.headerText && (
              <p className="text-sm text-destructive">{errors.headerText}</p>
            )}
          </div>
        )}

        {/* Conditional media URL field */}
        {(headerType === "IMAGE" ||
          headerType === "VIDEO" ||
          headerType === "DOCUMENT") && (
          <div className="space-y-2 pt-2">
            <Input
              id="headerMediaUrl"
              type="url"
              value={headerMediaUrl}
              onChange={handleHeaderMediaUrlChange}
              placeholder={`Enter ${headerType.toLowerCase()} URL`}
              aria-invalid={!!errors.headerMediaUrl}
              disabled={isSubmitting}
            />
            {errors.headerMediaUrl && (
              <p className="text-sm text-destructive">{errors.headerMediaUrl}</p>
            )}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="space-y-2">
        <Label htmlFor="body">
          Body <span className="text-destructive">*</span>
        </Label>
        <textarea
          id="body"
          value={body}
          onChange={handleBodyChange}
          placeholder="Enter template message. Use {{1}}, {{2}}, etc. for variables."
          disabled={isSubmitting}
          rows={4}
          aria-invalid={!!errors.body}
          className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-50"
        />
        <p className="text-xs text-muted-foreground">
          Use {"{{1}}"}, {"{{2}}"}, etc. for dynamic variables
        </p>
        {errors.body && <p className="text-sm text-destructive">{errors.body}</p>}
      </div>

      {/* Footer */}
      <div className="space-y-2">
        <Label htmlFor="footer">Footer</Label>
        <Input
          id="footer"
          type="text"
          value={footer}
          onChange={handleFooterChange}
          placeholder="Enter footer text (optional)"
          disabled={isSubmitting}
        />
      </div>

      {/* Buttons Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Buttons (max {MAX_BUTTONS})</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddButton}
            disabled={isSubmitting || buttons.length >= MAX_BUTTONS}
          >
            <Plus className="mr-1 size-4" />
            Add Button
          </Button>
        </div>

        {buttons.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No buttons added. Click "Add Button" to add interactive buttons.
          </p>
        )}

        {buttons.map((button, index) => (
          <ButtonFieldGroup
            key={button.id}
            button={button}
            index={index}
            isSubmitting={isSubmitting}
            onTypeChange={handleButtonTypeChange}
            onTextChange={handleButtonTextChange}
            onUrlChange={handleButtonUrlChange}
            onPhoneChange={handleButtonPhoneChange}
            onRemove={handleRemoveButton}
          />
        ))}

        {errors.buttons && (
          <p className="text-sm text-destructive">{errors.buttons}</p>
        )}
      </div>
    </div>
  )
})

// Extracted button field group component for better performance
interface ButtonFieldGroupProps {
  button: TemplateButtonFormData
  index: number
  isSubmitting: boolean
  onTypeChange: (id: string, type: ButtonType) => void
  onTextChange: (id: string, text: string) => void
  onUrlChange: (id: string, url: string) => void
  onPhoneChange: (id: string, phone: string) => void
  onRemove: (id: string) => void
}

const ButtonFieldGroup = React.memo(function ButtonFieldGroup({
  button,
  index,
  isSubmitting,
  onTypeChange,
  onTextChange,
  onUrlChange,
  onPhoneChange,
  onRemove,
}: ButtonFieldGroupProps) {
  const handleTypeChange = React.useCallback(
    (value: ButtonType) => onTypeChange(button.id, value),
    [button.id, onTypeChange]
  )

  const handleTextChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) =>
      onTextChange(button.id, e.target.value),
    [button.id, onTextChange]
  )

  const handleUrlChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) =>
      onUrlChange(button.id, e.target.value),
    [button.id, onUrlChange]
  )

  const handlePhoneChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) =>
      onPhoneChange(button.id, e.target.value),
    [button.id, onPhoneChange]
  )

  const handleRemove = React.useCallback(
    () => onRemove(button.id),
    [button.id, onRemove]
  )

  return (
    <div className="rounded-md border border-input p-3 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Button {index + 1}</span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleRemove}
          disabled={isSubmitting}
          aria-label={`Remove button ${index + 1}`}
        >
          <Trash2 className="size-4 text-destructive" />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">Type</label>
          <Select
            value={button.type}
            onValueChange={handleTypeChange}
            disabled={isSubmitting}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BUTTON_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">Text</label>
          <Input
            type="text"
            value={button.text}
            onChange={handleTextChange}
            placeholder="Button text"
            disabled={isSubmitting}
          />
        </div>
      </div>

      {/* Conditional URL field for URL buttons */}
      {button.type === "URL" && (
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">URL</label>
          <Input
            type="url"
            value={button.url}
            onChange={handleUrlChange}
            placeholder="https://example.com"
            disabled={isSubmitting}
          />
        </div>
      )}

      {/* Conditional phone field for CALL buttons */}
      {button.type === "CALL" && (
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">Phone Number</label>
          <Input
            type="tel"
            value={button.phoneNumber}
            onChange={handlePhoneChange}
            placeholder="+1234567890"
            disabled={isSubmitting}
          />
        </div>
      )}
    </div>
  )
})
