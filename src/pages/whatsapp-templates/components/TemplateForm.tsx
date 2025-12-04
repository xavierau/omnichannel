import * as React from "react"
import { Plus, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type {
  TemplateFormData,
  TemplateFormErrors,
  TemplateButtonFormData,
  HeaderType,
  ButtonType,
  TemplateCategory,
} from "../types"
import {
  TEMPLATE_CATEGORIES,
  AVAILABLE_LANGUAGES,
  HEADER_TYPES,
  BUTTON_TYPES,
} from "../types"

interface TemplateFormProps {
  initialValues?: TemplateFormData
  onSubmit: (data: TemplateFormData) => void
  onCancel: () => void
  isSubmitting?: boolean
}

const MAX_BUTTONS = 3

function generateButtonId(): string {
  return `btn_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

function createEmptyButton(): TemplateButtonFormData {
  return {
    id: generateButtonId(),
    type: "QUICK_REPLY",
    text: "",
    url: "",
    phoneNumber: "",
  }
}

const defaultFormData: TemplateFormData = {
  name: "",
  category: "MARKETING",
  language: "en",
  headerType: "NONE",
  headerText: "",
  headerMediaUrl: "",
  body: "",
  footer: "",
  buttons: [],
}

export function TemplateForm({
  initialValues,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: TemplateFormProps) {
  const isEditMode = initialValues !== undefined

  // Form state - initialized from props, NO useEffect
  const [name, setName] = React.useState(initialValues?.name ?? defaultFormData.name)
  const [category, setCategory] = React.useState<TemplateCategory>(
    initialValues?.category ?? defaultFormData.category
  )
  const [language, setLanguage] = React.useState(
    initialValues?.language ?? defaultFormData.language
  )
  const [headerType, setHeaderType] = React.useState<HeaderType>(
    initialValues?.headerType ?? defaultFormData.headerType
  )
  const [headerText, setHeaderText] = React.useState(
    initialValues?.headerText ?? defaultFormData.headerText
  )
  const [headerMediaUrl, setHeaderMediaUrl] = React.useState(
    initialValues?.headerMediaUrl ?? defaultFormData.headerMediaUrl
  )
  const [body, setBody] = React.useState(initialValues?.body ?? defaultFormData.body)
  const [footer, setFooter] = React.useState(initialValues?.footer ?? defaultFormData.footer)
  const [buttons, setButtons] = React.useState<TemplateButtonFormData[]>(
    initialValues?.buttons ?? defaultFormData.buttons
  )
  const [errors, setErrors] = React.useState<TemplateFormErrors>({})

  const validateForm = (): boolean => {
    const newErrors: TemplateFormErrors = {}

    // Name validation: required, minimum 2 characters, only lowercase, numbers, underscores
    if (!name.trim()) {
      newErrors.name = "Template name is required"
    } else if (name.trim().length < 2) {
      newErrors.name = "Template name must be at least 2 characters"
    } else if (!/^[a-z0-9_]+$/.test(name.trim())) {
      newErrors.name = "Template name can only contain lowercase letters, numbers, and underscores"
    }

    // Category validation: required
    if (!category) {
      newErrors.category = "Category is required"
    }

    // Language validation: required
    if (!language) {
      newErrors.language = "Language is required"
    }

    // Header validation based on type
    if (headerType === "TEXT" && !headerText.trim()) {
      newErrors.headerText = "Header text is required when header type is Text"
    }
    if (
      (headerType === "IMAGE" || headerType === "VIDEO" || headerType === "DOCUMENT") &&
      !headerMediaUrl.trim()
    ) {
      newErrors.headerMediaUrl = "Media URL is required for this header type"
    }

    // Body validation: required
    if (!body.trim()) {
      newErrors.body = "Template body is required"
    } else if (body.trim().length < 10) {
      newErrors.body = "Template body must be at least 10 characters"
    }

    // Button validation
    for (const button of buttons) {
      if (!button.text.trim()) {
        newErrors.buttons = "All buttons must have text"
        break
      }
      if (button.type === "URL" && !button.url.trim()) {
        newErrors.buttons = "URL buttons must have a URL"
        break
      }
      if (button.type === "CALL" && !button.phoneNumber.trim()) {
        newErrors.buttons = "Call buttons must have a phone number"
        break
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    onSubmit({
      name: name.trim(),
      category,
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
    })
  }

  // Field change handlers - clear errors on change
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value)
    if (errors.name) {
      setErrors((prev) => ({ ...prev, name: undefined }))
    }
  }

  const handleCategoryChange = (value: TemplateCategory) => {
    setCategory(value)
    if (errors.category) {
      setErrors((prev) => ({ ...prev, category: undefined }))
    }
  }

  const handleLanguageChange = (value: string) => {
    setLanguage(value)
    if (errors.language) {
      setErrors((prev) => ({ ...prev, language: undefined }))
    }
  }

  const handleHeaderTypeChange = (value: HeaderType) => {
    setHeaderType(value)
    // Clear header-related errors when type changes
    setErrors((prev) => ({
      ...prev,
      headerText: undefined,
      headerMediaUrl: undefined,
    }))
  }

  const handleHeaderTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setHeaderText(e.target.value)
    if (errors.headerText) {
      setErrors((prev) => ({ ...prev, headerText: undefined }))
    }
  }

  const handleHeaderMediaUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setHeaderMediaUrl(e.target.value)
    if (errors.headerMediaUrl) {
      setErrors((prev) => ({ ...prev, headerMediaUrl: undefined }))
    }
  }

  const handleBodyChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setBody(e.target.value)
    if (errors.body) {
      setErrors((prev) => ({ ...prev, body: undefined }))
    }
  }

  const handleFooterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFooter(e.target.value)
  }

  // Button array operations
  const handleAddButton = () => {
    if (buttons.length < MAX_BUTTONS) {
      setButtons((prev) => [...prev, createEmptyButton()])
    }
  }

  const handleRemoveButton = (buttonId: string) => {
    setButtons((prev) => prev.filter((btn) => btn.id !== buttonId))
    if (errors.buttons) {
      setErrors((prev) => ({ ...prev, buttons: undefined }))
    }
  }

  const handleButtonTypeChange = (buttonId: string, newType: ButtonType) => {
    setButtons((prev) =>
      prev.map((btn) =>
        btn.id === buttonId
          ? { ...btn, type: newType, url: "", phoneNumber: "" }
          : btn
      )
    )
    if (errors.buttons) {
      setErrors((prev) => ({ ...prev, buttons: undefined }))
    }
  }

  const handleButtonTextChange = (buttonId: string, text: string) => {
    setButtons((prev) =>
      prev.map((btn) => (btn.id === buttonId ? { ...btn, text } : btn))
    )
    if (errors.buttons) {
      setErrors((prev) => ({ ...prev, buttons: undefined }))
    }
  }

  const handleButtonUrlChange = (buttonId: string, url: string) => {
    setButtons((prev) =>
      prev.map((btn) => (btn.id === buttonId ? { ...btn, url } : btn))
    )
    if (errors.buttons) {
      setErrors((prev) => ({ ...prev, buttons: undefined }))
    }
  }

  const handleButtonPhoneChange = (buttonId: string, phoneNumber: string) => {
    setButtons((prev) =>
      prev.map((btn) => (btn.id === buttonId ? { ...btn, phoneNumber } : btn))
    )
    if (errors.buttons) {
      setErrors((prev) => ({ ...prev, buttons: undefined }))
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Name */}
      <div className="space-y-2">
        <label htmlFor="name" className="text-sm font-medium">
          Template Name <span className="text-destructive">*</span>
        </label>
        <Input
          id="name"
          type="text"
          value={name}
          onChange={handleNameChange}
          placeholder="e.g., order_confirmation"
          aria-invalid={!!errors.name}
          disabled={isSubmitting}
        />
        <p className="text-xs text-muted-foreground">
          Only lowercase letters, numbers, and underscores allowed
        </p>
        {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
      </div>

      {/* Category and Language row */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label htmlFor="category" className="text-sm font-medium">
            Category <span className="text-destructive">*</span>
          </label>
          <Select
            value={category}
            onValueChange={handleCategoryChange}
            disabled={isSubmitting}
          >
            <SelectTrigger id="category" aria-invalid={!!errors.category}>
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
          {errors.category && (
            <p className="text-sm text-destructive">{errors.category}</p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="language" className="text-sm font-medium">
            Language <span className="text-destructive">*</span>
          </label>
          <Select
            value={language}
            onValueChange={handleLanguageChange}
            disabled={isSubmitting}
          >
            <SelectTrigger id="language" aria-invalid={!!errors.language}>
              <SelectValue placeholder="Select language" />
            </SelectTrigger>
            <SelectContent>
              {AVAILABLE_LANGUAGES.map((lang) => (
                <SelectItem key={lang.value} value={lang.value}>
                  {lang.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.language && (
            <p className="text-sm text-destructive">{errors.language}</p>
          )}
        </div>
      </div>

      {/* Header Section */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Header</label>
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
        <label htmlFor="body" className="text-sm font-medium">
          Body <span className="text-destructive">*</span>
        </label>
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
        <label htmlFor="footer" className="text-sm font-medium">
          Footer
        </label>
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
          <label className="text-sm font-medium">Buttons (max {MAX_BUTTONS})</label>
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
          <div
            key={button.id}
            className="rounded-md border border-input p-3 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Button {index + 1}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleRemoveButton(button.id)}
                disabled={isSubmitting}
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Type</label>
                <Select
                  value={button.type}
                  onValueChange={(value: ButtonType) =>
                    handleButtonTypeChange(button.id, value)
                  }
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
                  onChange={(e) => handleButtonTextChange(button.id, e.target.value)}
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
                  onChange={(e) => handleButtonUrlChange(button.id, e.target.value)}
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
                  onChange={(e) => handleButtonPhoneChange(button.id, e.target.value)}
                  placeholder="+1234567890"
                  disabled={isSubmitting}
                />
              </div>
            )}
          </div>
        ))}

        {errors.buttons && (
          <p className="text-sm text-destructive">{errors.buttons}</p>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-2 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting
            ? isEditMode
              ? "Saving..."
              : "Creating..."
            : isEditMode
              ? "Save Changes"
              : "Create Template"}
        </Button>
      </div>
    </form>
  )
}
