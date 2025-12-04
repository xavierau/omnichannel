import * as React from "react"
import { Info } from "lucide-react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { WhatsAppTemplate } from "@/pages/whatsapp-templates/types"
import type {
  ButtonVariableConfig,
  HeaderConfig,
  TemplateVariablesConfig,
  VariableConfig,
  VariableSourceType,
} from "../types"
import { getCustomerMappableFields } from "../types"
import { extractTemplateVariables, type ExtractedVariable } from "../utils/template-variables"
import { MediaUploader } from "./MediaUploader"

interface TemplateVariableConfigProps {
  template: WhatsAppTemplate
  config: TemplateVariablesConfig
  onChange: (config: TemplateVariablesConfig) => void
  errors?: {
    templateVariables?: string
    headerMedia?: string
  }
  disabled?: boolean
}

export function TemplateVariableConfig({
  template,
  config,
  onChange,
  errors,
  disabled = false,
}: TemplateVariableConfigProps) {
  const extractedVariables = React.useMemo(
    () => extractTemplateVariables(template),
    [template]
  )

  const headerVariables = extractedVariables.filter((v) => v.location === "header")
  const bodyVariables = extractedVariables.filter((v) => v.location === "body")
  const buttonVariables = extractedVariables.filter((v) => v.location === "button")

  const hasMediaHeader =
    template.header?.type === "IMAGE" ||
    template.header?.type === "VIDEO" ||
    template.header?.type === "DOCUMENT"

  const hasTextHeaderVariable = headerVariables.length > 0
  const hasBodyVariables = bodyVariables.length > 0
  const hasButtonVariables = buttonVariables.length > 0
  const hasAnyVariables =
    hasMediaHeader || hasTextHeaderVariable || hasBodyVariables || hasButtonVariables

  if (!hasAnyVariables) {
    return (
      <div className="rounded-lg border border-input bg-muted/30 p-4">
        <p className="text-sm text-muted-foreground">
          This template has no variables to configure.
        </p>
      </div>
    )
  }

  // Handle header config changes
  const handleHeaderChange = (headerConfig: HeaderConfig) => {
    onChange({
      ...config,
      header: headerConfig,
    })
  }

  // Handle body variable changes
  const handleBodyVariableChange = (index: number, varConfig: VariableConfig) => {
    const newBodyVariables = [...config.bodyVariables]
    const existingIndex = newBodyVariables.findIndex((v) => v.index === index)

    if (existingIndex >= 0) {
      newBodyVariables[existingIndex] = varConfig
    } else {
      newBodyVariables.push(varConfig)
    }

    onChange({
      ...config,
      bodyVariables: newBodyVariables,
    })
  }

  // Handle button variable changes
  const handleButtonVariableChange = (
    buttonIndex: number,
    varConfig: VariableConfig
  ) => {
    const newButtonVariables = [...config.buttonVariables]
    const existingIndex = newButtonVariables.findIndex(
      (bv) => bv.buttonIndex === buttonIndex
    )

    const buttonVarConfig: ButtonVariableConfig = {
      buttonIndex,
      variable: varConfig,
    }

    if (existingIndex >= 0) {
      newButtonVariables[existingIndex] = buttonVarConfig
    } else {
      newButtonVariables.push(buttonVarConfig)
    }

    onChange({
      ...config,
      buttonVariables: newButtonVariables,
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold">Template Variables</h3>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="size-4 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-xs">
              <p>
                Configure values for each variable in your template. Choose between
                static values (same for all recipients) or map to customer fields
                (personalized per recipient).
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Header Section */}
      {(hasMediaHeader || hasTextHeaderVariable) && (
        <div className="space-y-4 rounded-lg border border-input p-4">
          <h4 className="text-sm font-medium text-muted-foreground">Header</h4>

          {/* Media Header */}
          {hasMediaHeader && template.header && (
            <MediaUploader
              headerType={template.header.type as "IMAGE" | "VIDEO" | "DOCUMENT"}
              value={{
                url: config.header?.mediaUrl,
                file: config.header?.mediaFile,
              }}
              onChange={(mediaValue) => {
                handleHeaderChange({
                  type: template.header!.type,
                  ...config.header,
                  mediaUrl: mediaValue.url,
                  mediaFile: mediaValue.file,
                })
              }}
              error={errors?.headerMedia}
              disabled={disabled}
            />
          )}

          {/* Text Header Variable */}
          {hasTextHeaderVariable && template.header?.type === "TEXT" && (
            <VariableInput
              variable={headerVariables[0]}
              config={config.header?.textVariable}
              onChange={(varConfig) => {
                handleHeaderChange({
                  type: "TEXT",
                  ...config.header,
                  textVariable: varConfig,
                })
              }}
              disabled={disabled}
            />
          )}
        </div>
      )}

      {/* Body Variables Section */}
      {hasBodyVariables && (
        <div className="space-y-4 rounded-lg border border-input p-4">
          <h4 className="text-sm font-medium text-muted-foreground">Body Variables</h4>
          <div className="space-y-4">
            {bodyVariables.map((variable) => (
              <VariableInput
                key={`body-${variable.index}`}
                variable={variable}
                config={config.bodyVariables.find((v) => v.index === variable.index)}
                onChange={(varConfig) =>
                  handleBodyVariableChange(variable.index, varConfig)
                }
                disabled={disabled}
              />
            ))}
          </div>
        </div>
      )}

      {/* Button Variables Section */}
      {hasButtonVariables && (
        <div className="space-y-4 rounded-lg border border-input p-4">
          <h4 className="text-sm font-medium text-muted-foreground">
            Button URL Variables
          </h4>
          <div className="space-y-4">
            {buttonVariables.map((variable) => {
              const button = template.buttons[variable.buttonIndex ?? 0]
              return (
                <VariableInput
                  key={`button-${variable.buttonIndex}-${variable.index}`}
                  variable={variable}
                  config={
                    config.buttonVariables.find(
                      (bv) => bv.buttonIndex === variable.buttonIndex
                    )?.variable
                  }
                  onChange={(varConfig) =>
                    handleButtonVariableChange(variable.buttonIndex ?? 0, varConfig)
                  }
                  buttonLabel={button?.text}
                  disabled={disabled}
                />
              )
            })}
          </div>
        </div>
      )}

      {/* Validation Error */}
      {errors?.templateVariables && (
        <p className="text-sm text-destructive">{errors.templateVariables}</p>
      )}
    </div>
  )
}

// ============================================
// Variable Input Component
// ============================================

interface VariableInputProps {
  variable: ExtractedVariable
  config?: VariableConfig
  onChange: (config: VariableConfig) => void
  buttonLabel?: string
  disabled?: boolean
}

function VariableInput({
  variable,
  config,
  onChange,
  buttonLabel,
  disabled = false,
}: VariableInputProps) {
  // Get dynamic customer mappable fields (includes custom fields)
  const customerMappableFields = React.useMemo(() => getCustomerMappableFields(), [])

  const sourceType: VariableSourceType = config?.sourceType ?? "STATIC"
  const staticValue = config?.staticValue ?? ""
  const customerField = config?.customerField ?? ""

  const handleSourceTypeChange = (newSourceType: VariableSourceType) => {
    onChange({
      index: variable.index,
      sourceType: newSourceType,
      staticValue: newSourceType === "STATIC" ? staticValue : undefined,
      customerField: newSourceType === "CUSTOMER_FIELD" ? customerField : undefined,
    })
  }

  const handleStaticValueChange = (value: string) => {
    onChange({
      index: variable.index,
      sourceType: "STATIC",
      staticValue: value,
    })
  }

  const handleCustomerFieldChange = (field: string) => {
    onChange({
      index: variable.index,
      sourceType: "CUSTOMER_FIELD",
      customerField: field,
    })
  }

  const locationLabel =
    variable.location === "button" && buttonLabel
      ? `"${buttonLabel}" button`
      : variable.location

  return (
    <div className="space-y-2 rounded-md bg-muted/30 p-3">
      {/* Variable Label */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <Label className="text-sm font-medium">
            {`{{${variable.index}}}`}
            <span className="ml-2 text-xs text-muted-foreground">({locationLabel})</span>
          </Label>
          <p className="mt-0.5 text-xs text-muted-foreground font-mono">
            {variable.context}
          </p>
        </div>
      </div>

      {/* Source Type Toggle */}
      <div className="flex gap-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name={`source-${variable.location}-${variable.index}`}
            value="STATIC"
            checked={sourceType === "STATIC"}
            onChange={() => handleSourceTypeChange("STATIC")}
            disabled={disabled}
            className="size-4 accent-primary"
          />
          <span className="text-sm">Static Value</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name={`source-${variable.location}-${variable.index}`}
            value="CUSTOMER_FIELD"
            checked={sourceType === "CUSTOMER_FIELD"}
            onChange={() => handleSourceTypeChange("CUSTOMER_FIELD")}
            disabled={disabled}
            className="size-4 accent-primary"
          />
          <span className="text-sm">Customer Field</span>
        </label>
      </div>

      {/* Value Input */}
      {sourceType === "STATIC" ? (
        <Input
          type="text"
          placeholder="Enter value..."
          value={staticValue}
          onChange={(e) => handleStaticValueChange(e.target.value)}
          disabled={disabled}
          className="mt-1"
        />
      ) : (
        <Select
          value={customerField}
          onValueChange={handleCustomerFieldChange}
          disabled={disabled}
        >
          <SelectTrigger className="mt-1">
            <SelectValue placeholder="Select customer field..." />
          </SelectTrigger>
          <SelectContent>
            {customerMappableFields.map((field) => (
              <SelectItem key={field.value} value={field.value}>
                {field.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  )
}
