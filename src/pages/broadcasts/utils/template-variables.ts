import type { Customer } from "@/pages/customers/types"
import type { WhatsAppTemplate } from "@/pages/whatsapp-templates/types"
import type {
  HeaderConfig,
  TemplateVariablesConfig,
  VariableConfig,
} from "../types"

// ============================================
// Variable Extraction Types
// ============================================

export interface ExtractedVariable {
  index: number
  location: "header" | "body" | "button"
  buttonIndex?: number
  context: string // Surrounding text for display
}

// ============================================
// Variable Extraction Functions
// ============================================

const VARIABLE_REGEX = /\{\{(\d+)\}\}/g

/**
 * Extract variable index from a match (e.g., "{{1}}" -> 1)
 */
function parseVariableIndex(match: string): number {
  const indexMatch = match.match(/\{\{(\d+)\}\}/)
  return indexMatch ? parseInt(indexMatch[1], 10) : 0
}

/**
 * Get context around a variable for display
 * Shows ~20 chars before and after the variable
 */
function getVariableContext(text: string, match: string, maxLength = 50): string {
  const index = text.indexOf(match)
  if (index === -1) return text.slice(0, maxLength)

  const start = Math.max(0, index - 20)
  const end = Math.min(text.length, index + match.length + 20)

  let context = text.slice(start, end)
  if (start > 0) context = "..." + context
  if (end < text.length) context = context + "..."

  return context
}

/**
 * Extract all {{N}} variables from a text string
 */
function extractVariablesFromText(
  text: string,
  location: "header" | "body" | "button",
  buttonIndex?: number
): ExtractedVariable[] {
  const variables: ExtractedVariable[] = []
  const matches = text.matchAll(VARIABLE_REGEX)

  for (const match of matches) {
    const index = parseVariableIndex(match[0])
    if (index > 0) {
      variables.push({
        index,
        location,
        buttonIndex,
        context: getVariableContext(text, match[0]),
      })
    }
  }

  return variables
}

/**
 * Extract all variables from a WhatsApp template
 * Returns variables from header, body, and button URLs
 */
export function extractTemplateVariables(template: WhatsAppTemplate): ExtractedVariable[] {
  const variables: ExtractedVariable[] = []

  // Extract from header text (if TEXT type)
  if (template.header?.type === "TEXT" && template.header.text) {
    variables.push(...extractVariablesFromText(template.header.text, "header"))
  }

  // Extract from body
  if (template.body) {
    variables.push(...extractVariablesFromText(template.body, "body"))
  }

  // Extract from button URLs
  template.buttons.forEach((button, index) => {
    if (button.type === "URL" && button.url) {
      variables.push(...extractVariablesFromText(button.url, "button", index))
    }
  })

  // Sort by location priority and then by index
  const locationOrder = { header: 0, body: 1, button: 2 }
  variables.sort((a, b) => {
    const locDiff = locationOrder[a.location] - locationOrder[b.location]
    if (locDiff !== 0) return locDiff
    if (a.location === "button" && b.location === "button") {
      const btnDiff = (a.buttonIndex ?? 0) - (b.buttonIndex ?? 0)
      if (btnDiff !== 0) return btnDiff
    }
    return a.index - b.index
  })

  return variables
}

/**
 * Count total unique variables in a template
 */
export function countTemplateVariables(template: WhatsAppTemplate): {
  header: number
  body: number
  buttons: number
  total: number
} {
  const extracted = extractTemplateVariables(template)
  const header = extracted.filter((v) => v.location === "header").length
  const body = extracted.filter((v) => v.location === "body").length
  const buttons = extracted.filter((v) => v.location === "button").length

  return { header, body, buttons, total: header + body + buttons }
}

// ============================================
// Variable Substitution Functions
// ============================================

/**
 * Get value from customer based on field path
 * Supports: "name", "whatsappNumber", "customFields.fieldName"
 */
export function getCustomerFieldValue(customer: Customer, fieldPath: string): string {
  if (fieldPath === "name") return customer.name
  if (fieldPath === "whatsappNumber") return customer.whatsappNumber

  // Future: support customFields.fieldName
  if (fieldPath.startsWith("customFields.")) {
    const fieldName = fieldPath.replace("customFields.", "")
    const customFields = (customer as Customer & { customFields?: Record<string, string> })
      .customFields
    return customFields?.[fieldName] ?? ""
  }

  return ""
}

/**
 * Get the value for a variable config, either static or from customer
 */
export function getVariableValue(
  config: VariableConfig,
  customer?: Customer,
  placeholder = "[value]"
): string {
  if (config.sourceType === "STATIC") {
    return config.staticValue || placeholder
  }

  if (config.sourceType === "CUSTOMER_FIELD" && customer && config.customerField) {
    return getCustomerFieldValue(customer, config.customerField) || placeholder
  }

  return placeholder
}

/**
 * Substitute all variables in a text string with their values
 */
export function substituteVariables(
  text: string,
  variables: VariableConfig[],
  customer?: Customer
): string {
  let result = text

  // Create a map for quick lookup
  const variableMap = new Map<number, VariableConfig>()
  variables.forEach((v) => variableMap.set(v.index, v))

  // Replace all {{N}} with their values
  result = result.replace(VARIABLE_REGEX, (match) => {
    const index = parseVariableIndex(match)
    const config = variableMap.get(index)
    if (config) {
      return getVariableValue(config, customer, `{{${index}}}`)
    }
    return match // Keep original if no config
  })

  return result
}

/**
 * Substitute variables in a template for preview
 */
export function substituteTemplateVariables(
  template: WhatsAppTemplate,
  config: TemplateVariablesConfig,
  customer?: Customer
): {
  headerText?: string
  body: string
  buttonUrls: Map<number, string>
} {
  // Substitute body
  const body = substituteVariables(template.body, config.bodyVariables, customer)

  // Substitute header text
  let headerText: string | undefined
  if (template.header?.type === "TEXT" && template.header.text) {
    const headerVars = config.header?.textVariable ? [config.header.textVariable] : []
    headerText = substituteVariables(template.header.text, headerVars, customer)
  }

  // Substitute button URLs
  const buttonUrls = new Map<number, string>()
  template.buttons.forEach((button, index) => {
    if (button.type === "URL" && button.url) {
      const buttonConfig = config.buttonVariables.find((bv) => bv.buttonIndex === index)
      if (buttonConfig) {
        buttonUrls.set(index, substituteVariables(button.url, [buttonConfig.variable], customer))
      } else {
        buttonUrls.set(index, button.url)
      }
    }
  })

  return { headerText, body, buttonUrls }
}

// ============================================
// Validation Functions
// ============================================

/**
 * Validate that all required variables have configuration
 */
export function validateVariableConfig(
  template: WhatsAppTemplate,
  config: TemplateVariablesConfig
): { isValid: boolean; missingVariables: ExtractedVariable[] } {
  const extracted = extractTemplateVariables(template)
  const missingVariables: ExtractedVariable[] = []

  for (const variable of extracted) {
    let hasConfig = false

    if (variable.location === "header") {
      hasConfig = !!config.header?.textVariable && isVariableConfigComplete(config.header.textVariable)
    } else if (variable.location === "body") {
      const bodyConfig = config.bodyVariables.find((v) => v.index === variable.index)
      hasConfig = !!bodyConfig && isVariableConfigComplete(bodyConfig)
    } else if (variable.location === "button") {
      const buttonConfig = config.buttonVariables.find(
        (bv) => bv.buttonIndex === variable.buttonIndex
      )
      hasConfig = !!buttonConfig && isVariableConfigComplete(buttonConfig.variable)
    }

    if (!hasConfig) {
      missingVariables.push(variable)
    }
  }

  return {
    isValid: missingVariables.length === 0,
    missingVariables,
  }
}

/**
 * Check if a variable config has a value set
 */
function isVariableConfigComplete(config: VariableConfig): boolean {
  if (config.sourceType === "STATIC") {
    return !!config.staticValue && config.staticValue.trim().length > 0
  }
  if (config.sourceType === "CUSTOMER_FIELD") {
    return !!config.customerField && config.customerField.trim().length > 0
  }
  return false
}

/**
 * Validate header media configuration
 */
export function validateHeaderConfig(
  template: WhatsAppTemplate,
  config?: HeaderConfig
): { isValid: boolean; error?: string } {
  if (!template.header) {
    return { isValid: true }
  }

  const headerType = template.header.type

  // No validation needed for NONE or TEXT without variables
  if (headerType === "NONE") {
    return { isValid: true }
  }

  // For media headers, check that URL or file is provided
  if (headerType === "IMAGE" || headerType === "VIDEO" || headerType === "DOCUMENT") {
    if (!config?.mediaUrl && !config?.mediaFile) {
      return {
        isValid: false,
        error: `${headerType.toLowerCase()} is required for this template`,
      }
    }
  }

  return { isValid: true }
}

// ============================================
// Initialization Helpers
// ============================================

/**
 * Create initial variable config from extracted variables
 */
export function initializeVariableConfig(
  template: WhatsAppTemplate
): TemplateVariablesConfig {
  const extracted = extractTemplateVariables(template)

  const config: TemplateVariablesConfig = {
    bodyVariables: [],
    buttonVariables: [],
  }

  // Initialize header config
  if (template.header) {
    config.header = {
      type: template.header.type,
    }

    // If header has text variable
    const headerVar = extracted.find((v) => v.location === "header")
    if (headerVar) {
      config.header.textVariable = {
        index: headerVar.index,
        sourceType: "STATIC",
        staticValue: "",
      }
    }

    // Copy existing media URL if present
    if (template.header.mediaUrl) {
      config.header.mediaUrl = template.header.mediaUrl
    }
  }

  // Initialize body variables
  const bodyVars = extracted.filter((v) => v.location === "body")
  config.bodyVariables = bodyVars.map((v) => ({
    index: v.index,
    sourceType: "STATIC" as const,
    staticValue: "",
  }))

  // Initialize button variables
  const buttonVars = extracted.filter((v) => v.location === "button")
  config.buttonVariables = buttonVars.map((v) => ({
    buttonIndex: v.buttonIndex ?? 0,
    variable: {
      index: v.index,
      sourceType: "STATIC" as const,
      staticValue: "",
    },
  }))

  return config
}

/**
 * Create a default TemplateVariablesConfig (empty)
 */
export function createEmptyVariableConfig(): TemplateVariablesConfig {
  return {
    bodyVariables: [],
    buttonVariables: [],
  }
}
