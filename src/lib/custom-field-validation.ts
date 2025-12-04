import type {
  CustomFieldDefinition,
  CustomFieldValue,
  CustomFieldsData,
} from "@/types/custom-fields"

// ============================================
// Validation Error Types
// ============================================

export type CustomFieldErrors = Record<string, string>

// ============================================
// Individual Field Type Validators
// ============================================

function validateRequired(
  value: CustomFieldValue,
  definition: CustomFieldDefinition
): string | null {
  if (!definition.validation.required) {
    return null
  }

  if (value === null || value === undefined) {
    return `${definition.displayLabel} is required`
  }

  if (typeof value === "string" && value.trim() === "") {
    return `${definition.displayLabel} is required`
  }

  if (Array.isArray(value) && value.length === 0) {
    return `${definition.displayLabel} is required`
  }

  return null
}

function validateText(
  value: CustomFieldValue,
  definition: CustomFieldDefinition
): string | null {
  if (value === null || value === undefined || value === "") {
    return null
  }

  if (typeof value !== "string") {
    return `${definition.displayLabel} must be text`
  }

  const { minLength, maxLength, pattern, patternMessage } = definition.validation

  if (minLength !== undefined && value.length < minLength) {
    return `${definition.displayLabel} must be at least ${minLength} characters`
  }

  if (maxLength !== undefined && value.length > maxLength) {
    return `${definition.displayLabel} must be at most ${maxLength} characters`
  }

  if (pattern) {
    try {
      const regex = new RegExp(pattern)
      if (!regex.test(value)) {
        return patternMessage || `${definition.displayLabel} has an invalid format`
      }
    } catch {
      // Invalid regex pattern - skip validation
    }
  }

  return null
}

function validateNumber(
  value: CustomFieldValue,
  definition: CustomFieldDefinition
): string | null {
  if (value === null || value === undefined || value === "") {
    return null
  }

  const numValue = typeof value === "string" ? parseFloat(value) : value

  if (typeof numValue !== "number" || isNaN(numValue)) {
    return `${definition.displayLabel} must be a valid number`
  }

  const { min, max, decimal } = definition.validation

  if (min !== undefined && numValue < min) {
    return `${definition.displayLabel} must be at least ${min}`
  }

  if (max !== undefined && numValue > max) {
    return `${definition.displayLabel} must be at most ${max}`
  }

  if (decimal === false && !Number.isInteger(numValue)) {
    return `${definition.displayLabel} must be a whole number`
  }

  return null
}

function validateEmail(
  value: CustomFieldValue,
  definition: CustomFieldDefinition
): string | null {
  if (value === null || value === undefined || value === "") {
    return null
  }

  if (typeof value !== "string") {
    return `${definition.displayLabel} must be text`
  }

  // RFC 5322 simplified email regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  if (!emailRegex.test(value)) {
    return `${definition.displayLabel} must be a valid email address`
  }

  return null
}

function validatePhone(
  value: CustomFieldValue,
  definition: CustomFieldDefinition
): string | null {
  if (value === null || value === undefined || value === "") {
    return null
  }

  if (typeof value !== "string") {
    return `${definition.displayLabel} must be text`
  }

  // Allow digits, spaces, dashes, parentheses, and + for international
  const phoneRegex = /^[+]?[\d\s()-]{7,20}$/

  if (!phoneRegex.test(value)) {
    return `${definition.displayLabel} must be a valid phone number`
  }

  return null
}

function validateUrl(
  value: CustomFieldValue,
  definition: CustomFieldDefinition
): string | null {
  if (value === null || value === undefined || value === "") {
    return null
  }

  if (typeof value !== "string") {
    return `${definition.displayLabel} must be text`
  }

  try {
    new URL(value)
    return null
  } catch {
    return `${definition.displayLabel} must be a valid URL`
  }
}

function validateDate(
  value: CustomFieldValue,
  definition: CustomFieldDefinition
): string | null {
  if (value === null || value === undefined || value === "") {
    return null
  }

  let dateValue: Date

  if (value instanceof Date) {
    dateValue = value
  } else if (typeof value === "string") {
    dateValue = new Date(value)
  } else {
    return `${definition.displayLabel} must be a valid date`
  }

  if (isNaN(dateValue.getTime())) {
    return `${definition.displayLabel} must be a valid date`
  }

  return null
}

function validateSelect(
  value: CustomFieldValue,
  definition: CustomFieldDefinition
): string | null {
  if (value === null || value === undefined || value === "") {
    return null
  }

  if (typeof value !== "string") {
    return `${definition.displayLabel} must be a single selection`
  }

  const validValues = definition.options?.map((o) => o.value) || []

  if (!validValues.includes(value)) {
    return `${definition.displayLabel} has an invalid selection`
  }

  return null
}

function validateMultiSelect(
  value: CustomFieldValue,
  definition: CustomFieldDefinition
): string | null {
  if (value === null || value === undefined) {
    return null
  }

  if (!Array.isArray(value)) {
    return `${definition.displayLabel} must be a list of selections`
  }

  const validValues = definition.options?.map((o) => o.value) || []

  for (const v of value) {
    if (typeof v !== "string" || !validValues.includes(v)) {
      return `${definition.displayLabel} contains an invalid selection`
    }
  }

  return null
}

function validateBoolean(
  value: CustomFieldValue,
  definition: CustomFieldDefinition
): string | null {
  if (value === null || value === undefined) {
    return null
  }

  if (typeof value !== "boolean") {
    return `${definition.displayLabel} must be yes or no`
  }

  return null
}

// ============================================
// Main Validation Functions
// ============================================

/**
 * Validate a single field value against its definition
 */
export function validateFieldValue(
  definition: CustomFieldDefinition,
  value: CustomFieldValue
): string | null {
  // Check required first
  const requiredError = validateRequired(value, definition)
  if (requiredError) {
    return requiredError
  }

  // If value is empty and not required, skip type validation
  if (value === null || value === undefined || value === "") {
    return null
  }

  // Type-specific validation
  switch (definition.fieldType) {
    case "TEXT":
    case "TEXTAREA":
      return validateText(value, definition)

    case "NUMBER":
      return validateNumber(value, definition)

    case "EMAIL":
      return validateEmail(value, definition)

    case "PHONE":
      return validatePhone(value, definition)

    case "URL":
      return validateUrl(value, definition)

    case "DATE":
    case "DATETIME":
      return validateDate(value, definition)

    case "SELECT":
      return validateSelect(value, definition)

    case "MULTISELECT":
      return validateMultiSelect(value, definition)

    case "BOOLEAN":
      return validateBoolean(value, definition)

    default:
      return null
  }
}

/**
 * Validate all custom fields for an entity
 * Returns an error map with field keys as keys
 */
export function validateCustomFields(
  definitions: CustomFieldDefinition[],
  values: CustomFieldsData
): CustomFieldErrors {
  const errors: CustomFieldErrors = {}

  for (const definition of definitions) {
    const value = values[definition.fieldKey] ?? null
    const error = validateFieldValue(definition, value)

    if (error) {
      errors[definition.fieldKey] = error
    }
  }

  return errors
}

/**
 * Check if custom fields are valid (no errors)
 */
export function isCustomFieldsValid(
  definitions: CustomFieldDefinition[],
  values: CustomFieldsData
): boolean {
  const errors = validateCustomFields(definitions, values)
  return Object.keys(errors).length === 0
}

// ============================================
// Field Key Validation (for admin form)
// ============================================

/**
 * Validate a field key for uniqueness and format
 */
export function validateFieldKey(
  key: string,
  existingKeys: string[],
  currentKey?: string
): string | null {
  if (!key || key.trim() === "") {
    return "Field key is required"
  }

  // Must start with letter, contain only lowercase letters, numbers, underscores
  const keyRegex = /^[a-z][a-z0-9_]*$/
  if (!keyRegex.test(key)) {
    return "Key must start with a letter and contain only lowercase letters, numbers, and underscores"
  }

  // Check uniqueness (exclude current key when editing)
  const otherKeys = currentKey
    ? existingKeys.filter((k) => k !== currentKey)
    : existingKeys

  if (otherKeys.includes(key)) {
    return "This field key already exists"
  }

  // Max length
  if (key.length > 50) {
    return "Field key must be 50 characters or less"
  }

  return null
}

/**
 * Generate a field key from a display label
 */
export function generateFieldKey(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 50)
}
