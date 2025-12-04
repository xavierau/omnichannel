import type { TranslationFormData } from "../types"

// Validation error types
export interface TranslationFormErrors {
  language?: string
  headerText?: string
  headerMediaUrl?: string
  body?: string
  footer?: string
  buttons?: string
}

// Default form data for new translations
export const defaultTranslationFormData: TranslationFormData = {
  language: "en",
  headerType: "NONE",
  headerText: "",
  headerMediaUrl: "",
  body: "",
  footer: "",
  buttons: [],
}

/**
 * Validates translation form data and returns an errors object.
 * Returns an empty object if validation passes.
 */
export function validateTranslationForm(
  data: TranslationFormData,
  options: { requireLanguage?: boolean } = {}
): TranslationFormErrors {
  const errors: TranslationFormErrors = {}

  // Language validation
  if (options.requireLanguage && !data.language) {
    errors.language = "Language is required"
  }

  // Header validation based on type
  if (data.headerType === "TEXT" && !data.headerText.trim()) {
    errors.headerText = "Header text is required when header type is Text"
  }
  if (
    (data.headerType === "IMAGE" ||
      data.headerType === "VIDEO" ||
      data.headerType === "DOCUMENT") &&
    !data.headerMediaUrl.trim()
  ) {
    errors.headerMediaUrl = "Media URL is required for this header type"
  }

  // Body validation
  if (!data.body.trim()) {
    errors.body = "Template body is required"
  } else if (data.body.trim().length < 10) {
    errors.body = "Template body must be at least 10 characters"
  }

  // Button validation
  for (const button of data.buttons) {
    if (!button.text.trim()) {
      errors.buttons = "All buttons must have text"
      break
    }
    if (button.type === "URL" && !button.url.trim()) {
      errors.buttons = "URL buttons must have a URL"
      break
    }
    if (button.type === "CALL" && !button.phoneNumber.trim()) {
      errors.buttons = "Call buttons must have a phone number"
      break
    }
  }

  return errors
}

/**
 * Validates template name format.
 * Returns an error message or undefined if valid.
 */
export function validateTemplateName(name: string): string | undefined {
  const trimmed = name.trim()
  if (!trimmed) {
    return "Template name is required"
  }
  if (trimmed.length < 2) {
    return "Template name must be at least 2 characters"
  }
  if (!/^[a-z0-9_]+$/.test(trimmed)) {
    return "Template name can only contain lowercase letters, numbers, and underscores"
  }
  return undefined
}
