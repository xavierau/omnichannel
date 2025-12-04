import * as React from "react"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"

import type {
  CustomFieldDefinition,
  CustomFieldType,
  CustomFieldEntityType,
  SelectOption,
} from "@/types/custom-fields"
import { CUSTOM_FIELD_TYPES } from "@/types/custom-fields"
import { validateFieldKey, generateFieldKey } from "@/lib/custom-field-validation"
import { SelectOptionsEditor } from "./SelectOptionsEditor"
import { NumberConstraintsEditor } from "./NumberConstraintsEditor"
import { TextConstraintsEditor } from "./TextConstraintsEditor"

interface CustomFieldFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  entityType: CustomFieldEntityType
  initialValues?: CustomFieldDefinition
  existingKeys: string[]
  onSubmit: (
    data: Omit<CustomFieldDefinition, "id" | "createdAt" | "updatedAt" | "tenantId" | "displayOrder">
  ) => void
}

// Determine which constraint sections to show based on type
function getConstraintSections(type: CustomFieldType) {
  return {
    showOptions: type === "SELECT" || type === "MULTISELECT",
    showNumberConstraints: type === "NUMBER",
    showTextConstraints: ["TEXT", "TEXTAREA", "PHONE", "EMAIL", "URL"].includes(
      type
    ),
  }
}

export function CustomFieldFormDialog({
  open,
  onOpenChange,
  entityType,
  initialValues,
  existingKeys,
  onSubmit,
}: CustomFieldFormDialogProps) {
  const isEditMode = !!initialValues

  // Basic fields
  const [displayLabel, setDisplayLabel] = React.useState(
    initialValues?.displayLabel ?? ""
  )
  const [fieldKey, setFieldKey] = React.useState(initialValues?.fieldKey ?? "")
  const [fieldType, setFieldType] = React.useState<CustomFieldType>(
    initialValues?.fieldType ?? "TEXT"
  )
  const [description, setDescription] = React.useState(
    initialValues?.description ?? ""
  )

  // Validation & visibility
  const [required, setRequired] = React.useState(
    initialValues?.validation.required ?? false
  )
  const [isVisible, setIsVisible] = React.useState(
    initialValues?.isVisible ?? true
  )
  const [isSearchable, setIsSearchable] = React.useState(
    initialValues?.isSearchable ?? false
  )
  const [isFilterable, setIsFilterable] = React.useState(
    initialValues?.isFilterable ?? false
  )

  // Type-specific state
  const [options, setOptions] = React.useState<SelectOption[]>(
    initialValues?.options ?? []
  )
  const [minValue, setMinValue] = React.useState<number | undefined>(
    initialValues?.validation.min
  )
  const [maxValue, setMaxValue] = React.useState<number | undefined>(
    initialValues?.validation.max
  )
  const [allowDecimal, setAllowDecimal] = React.useState(
    initialValues?.validation.decimal !== false
  )
  const [precision, setPrecision] = React.useState<number | undefined>(
    initialValues?.validation.precision
  )
  const [minLength, setMinLength] = React.useState<number | undefined>(
    initialValues?.validation.minLength
  )
  const [maxLength, setMaxLength] = React.useState<number | undefined>(
    initialValues?.validation.maxLength
  )
  const [pattern, setPattern] = React.useState(
    initialValues?.validation.pattern ?? ""
  )
  const [patternMessage, setPatternMessage] = React.useState(
    initialValues?.validation.patternMessage ?? ""
  )

  const [errors, setErrors] = React.useState<Record<string, string>>({})

  // Derive which sections to show
  const constraintSections = getConstraintSections(fieldType)

  // Auto-generate key from label (only for new fields)
  React.useEffect(() => {
    if (!isEditMode && displayLabel) {
      setFieldKey(generateFieldKey(displayLabel))
    }
  }, [displayLabel, isEditMode])

  // Reset type-specific fields when type changes
  const prevFieldTypeRef = React.useRef<CustomFieldType>(fieldType)
  React.useEffect(() => {
    // Only reset when fieldType actually changes (not on initial mount)
    if (prevFieldTypeRef.current === fieldType) {
      return
    }
    prevFieldTypeRef.current = fieldType

    const sections = getConstraintSections(fieldType)
    if (!sections.showOptions) {
      setOptions([])
    }
    if (!sections.showNumberConstraints) {
      setMinValue(undefined)
      setMaxValue(undefined)
      setAllowDecimal(true)
      setPrecision(undefined)
    }
    if (!sections.showTextConstraints) {
      setMinLength(undefined)
      setMaxLength(undefined)
      setPattern("")
      setPatternMessage("")
    }
  }, [fieldType])

  // Reset form when dialog closes
  React.useEffect(() => {
    if (!open) {
      setDisplayLabel(initialValues?.displayLabel ?? "")
      setFieldKey(initialValues?.fieldKey ?? "")
      setFieldType(initialValues?.fieldType ?? "TEXT")
      setDescription(initialValues?.description ?? "")
      setRequired(initialValues?.validation.required ?? false)
      setIsVisible(initialValues?.isVisible ?? true)
      setIsSearchable(initialValues?.isSearchable ?? false)
      setIsFilterable(initialValues?.isFilterable ?? false)
      setOptions(initialValues?.options ?? [])
      setMinValue(initialValues?.validation.min)
      setMaxValue(initialValues?.validation.max)
      setAllowDecimal(initialValues?.validation.decimal !== false)
      setPrecision(initialValues?.validation.precision)
      setMinLength(initialValues?.validation.minLength)
      setMaxLength(initialValues?.validation.maxLength)
      setPattern(initialValues?.validation.pattern ?? "")
      setPatternMessage(initialValues?.validation.patternMessage ?? "")
      setErrors({})
    }
  }, [open, initialValues])

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!displayLabel.trim()) {
      newErrors.displayLabel = "Label is required"
    }

    const keyError = validateFieldKey(
      fieldKey,
      existingKeys,
      initialValues?.fieldKey
    )
    if (keyError) {
      newErrors.fieldKey = keyError
    }

    if (constraintSections.showOptions && options.length === 0) {
      newErrors.options = "At least one option is required"
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
      entityType,
      fieldKey: fieldKey.trim(),
      displayLabel: displayLabel.trim(),
      description: description.trim() || undefined,
      fieldType,
      validation: {
        required,
        ...(constraintSections.showNumberConstraints && {
          min: minValue,
          max: maxValue,
          decimal: allowDecimal,
          precision: allowDecimal ? precision : undefined,
        }),
        ...(constraintSections.showTextConstraints && {
          minLength,
          maxLength,
          pattern: pattern || undefined,
          patternMessage: patternMessage || undefined,
        }),
      },
      options: constraintSections.showOptions ? options : undefined,
      isVisible,
      isSearchable,
      isFilterable,
    })

    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "Edit Custom Field" : "Add Custom Field"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Label */}
          <div className="space-y-2">
            <label htmlFor="field-label" className="text-sm font-medium">
              Label <span className="text-destructive">*</span>
            </label>
            <Input
              id="field-label"
              value={displayLabel}
              onChange={(e) => setDisplayLabel(e.target.value)}
              placeholder="e.g., Company Name"
              aria-invalid={!!errors.displayLabel}
            />
            {errors.displayLabel && (
              <p className="text-sm text-destructive">{errors.displayLabel}</p>
            )}
          </div>

          {/* Key */}
          <div className="space-y-2">
            <label htmlFor="field-key" className="text-sm font-medium">
              Field Key <span className="text-destructive">*</span>
            </label>
            <Input
              id="field-key"
              value={fieldKey}
              onChange={(e) => setFieldKey(e.target.value)}
              placeholder="e.g., company_name"
              disabled={isEditMode}
              aria-invalid={!!errors.fieldKey}
              className="font-mono"
            />
            {errors.fieldKey && (
              <p className="text-sm text-destructive">{errors.fieldKey}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Used for API integration. Cannot be changed after creation.
            </p>
          </div>

          {/* Type */}
          <div className="space-y-2">
            <label htmlFor="field-type" className="text-sm font-medium">
              Type <span className="text-destructive">*</span>
            </label>
            <Select
              value={fieldType}
              onValueChange={(v) => setFieldType(v as CustomFieldType)}
              disabled={isEditMode}
            >
              <SelectTrigger id="field-type" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CUSTOM_FIELD_TYPES.map((ft) => (
                  <SelectItem key={ft.value} value={ft.value}>
                    {ft.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isEditMode && (
              <p className="text-xs text-muted-foreground">
                Type cannot be changed after creation.
              </p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label htmlFor="field-description" className="text-sm font-medium">
              Description
            </label>
            <Input
              id="field-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Help text shown to users"
            />
          </div>

          {/* Required toggle */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="field-required"
              checked={required}
              onCheckedChange={(checked) => setRequired(checked === true)}
            />
            <label htmlFor="field-required" className="text-sm font-medium">
              Required field
            </label>
          </div>

          {/* Visibility toggles */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="field-visible"
                checked={isVisible}
                onCheckedChange={(checked) => setIsVisible(checked === true)}
              />
              <label htmlFor="field-visible" className="text-sm">
                Visible in forms and tables
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="field-searchable"
                checked={isSearchable}
                onCheckedChange={(checked) => setIsSearchable(checked === true)}
              />
              <label htmlFor="field-searchable" className="text-sm">
                Include in search
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="field-filterable"
                checked={isFilterable}
                onCheckedChange={(checked) => setIsFilterable(checked === true)}
              />
              <label htmlFor="field-filterable" className="text-sm">
                Available as filter
              </label>
            </div>
          </div>

          {/* Conditional sections based on type */}
          {constraintSections.showOptions && (
            <SelectOptionsEditor
              options={options}
              onChange={setOptions}
              error={errors.options}
            />
          )}

          {constraintSections.showNumberConstraints && (
            <NumberConstraintsEditor
              minValue={minValue}
              maxValue={maxValue}
              allowDecimal={allowDecimal}
              precision={precision}
              onMinChange={setMinValue}
              onMaxChange={setMaxValue}
              onAllowDecimalChange={setAllowDecimal}
              onPrecisionChange={setPrecision}
            />
          )}

          {constraintSections.showTextConstraints && (
            <TextConstraintsEditor
              fieldType={fieldType}
              minLength={minLength}
              maxLength={maxLength}
              pattern={pattern}
              patternMessage={patternMessage}
              onMinLengthChange={setMinLength}
              onMaxLengthChange={setMaxLength}
              onPatternChange={setPattern}
              onPatternMessageChange={setPatternMessage}
            />
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit">
              {isEditMode ? "Save Changes" : "Add Field"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
