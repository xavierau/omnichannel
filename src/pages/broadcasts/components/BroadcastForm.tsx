import * as React from "react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { Customer } from "@/pages/customers/types"
import type { WhatsAppTemplate } from "@/pages/whatsapp-templates/types"
import type {
  BroadcastFormData,
  BroadcastFormErrors,
  RecipientType,
  TemplateVariablesConfig,
} from "../types"
import {
  createEmptyVariableConfig,
  extractTemplateVariables,
  initializeVariableConfig,
  validateHeaderConfig,
  validateVariableConfig,
} from "../utils/template-variables"
import { TemplatePreview } from "./TemplatePreview"
import { TemplateVariableConfig } from "./TemplateVariableConfig"

interface Group {
  id: string
  name: string
  count: number
}

interface Timezone {
  value: string
  label: string
}

interface BroadcastFormProps {
  initialValues?: BroadcastFormData
  availableTemplates: WhatsAppTemplate[]
  availableGroups: Group[]
  availableCustomers: Customer[]
  availableTimezones: Timezone[]
  onSubmit: (data: BroadcastFormData) => void
  onCancel: () => void
  isSubmitting?: boolean
}

const defaultFormData: BroadcastFormData = {
  name: "",
  description: "",
  templateId: "",
  recipientType: "GROUP",
  groupId: "",
  customerIds: [],
  isImmediate: true,
  scheduledAt: null,
  timezone: "Asia/Hong_Kong",
  templateVariables: undefined,
}

export function BroadcastForm({
  initialValues,
  availableTemplates,
  availableGroups,
  availableCustomers,
  availableTimezones,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: BroadcastFormProps) {
  const isEditMode = initialValues !== undefined

  // Form state
  const [name, setName] = React.useState(initialValues?.name ?? defaultFormData.name)
  const [description, setDescription] = React.useState(
    initialValues?.description ?? defaultFormData.description
  )
  const [templateId, setTemplateId] = React.useState(
    initialValues?.templateId ?? defaultFormData.templateId
  )
  const [recipientType, setRecipientType] = React.useState<RecipientType>(
    initialValues?.recipientType ?? defaultFormData.recipientType
  )
  const [groupId, setGroupId] = React.useState(
    initialValues?.groupId ?? defaultFormData.groupId
  )
  const [customerIds, setCustomerIds] = React.useState<string[]>(
    initialValues?.customerIds ?? defaultFormData.customerIds
  )
  const [isImmediate, setIsImmediate] = React.useState(
    initialValues?.isImmediate ?? defaultFormData.isImmediate
  )
  const [scheduledAt, setScheduledAt] = React.useState<Date | null>(
    initialValues?.scheduledAt ?? defaultFormData.scheduledAt
  )
  const [timezone, setTimezone] = React.useState(
    initialValues?.timezone ?? defaultFormData.timezone
  )
  const [templateVariables, setTemplateVariables] = React.useState<TemplateVariablesConfig>(
    initialValues?.templateVariables ?? createEmptyVariableConfig()
  )
  const [errors, setErrors] = React.useState<BroadcastFormErrors>({})

  // Get the selected template object
  const selectedTemplate = React.useMemo(
    () => availableTemplates.find((t) => t.id === templateId) ?? null,
    [availableTemplates, templateId]
  )

  // Check if template has variables
  const templateHasVariables = React.useMemo(() => {
    if (!selectedTemplate) return false
    const extracted = extractTemplateVariables(selectedTemplate)
    const hasMediaHeader =
      selectedTemplate.header?.type === "IMAGE" ||
      selectedTemplate.header?.type === "VIDEO" ||
      selectedTemplate.header?.type === "DOCUMENT"
    return extracted.length > 0 || hasMediaHeader
  }, [selectedTemplate])

  const validateForm = (): boolean => {
    const newErrors: BroadcastFormErrors = {}

    // Name validation: required, minimum 2 characters
    if (!name.trim()) {
      newErrors.name = "Name is required"
    } else if (name.trim().length < 2) {
      newErrors.name = "Name must be at least 2 characters"
    }

    // Template validation: required
    if (!templateId) {
      newErrors.templateId = "Template is required"
    }

    // Template variables validation
    if (selectedTemplate && templateHasVariables) {
      // Validate variable configurations
      const { isValid, missingVariables } = validateVariableConfig(
        selectedTemplate,
        templateVariables
      )
      if (!isValid) {
        const missingIndexes = missingVariables.map((v) => `{{${v.index}}}`).join(", ")
        newErrors.templateVariables = `Missing values for: ${missingIndexes}`
      }

      // Validate header media
      const headerValidation = validateHeaderConfig(selectedTemplate, templateVariables.header)
      if (!headerValidation.isValid) {
        newErrors.headerMedia = headerValidation.error
      }
    }

    // Recipient validation based on type
    if (recipientType === "GROUP") {
      if (!groupId) {
        newErrors.groupId = "Group is required"
      }
    } else {
      if (customerIds.length === 0) {
        newErrors.customerIds = "At least one customer is required"
      }
    }

    // Schedule validation
    if (!isImmediate && !scheduledAt) {
      newErrors.scheduledAt = "Scheduled date and time is required"
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
      description: description.trim(),
      templateId,
      recipientType,
      groupId: recipientType === "GROUP" ? groupId : "",
      customerIds: recipientType === "CUSTOMERS" ? customerIds : [],
      isImmediate,
      scheduledAt: isImmediate ? null : scheduledAt,
      timezone,
      templateVariables: templateHasVariables ? templateVariables : undefined,
    })
  }

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value)
    if (errors.name) {
      setErrors((prev) => ({ ...prev, name: undefined }))
    }
  }

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDescription(e.target.value)
  }

  const handleTemplateChange = (value: string) => {
    setTemplateId(value)
    if (errors.templateId) {
      setErrors((prev) => ({ ...prev, templateId: undefined }))
    }

    // Initialize variable config for the new template
    const newTemplate = availableTemplates.find((t) => t.id === value)
    if (newTemplate) {
      setTemplateVariables(initializeVariableConfig(newTemplate))
      // Clear any template variable errors
      setErrors((prev) => ({
        ...prev,
        templateVariables: undefined,
        headerMedia: undefined,
      }))
    } else {
      setTemplateVariables(createEmptyVariableConfig())
    }
  }

  const handleTemplateVariablesChange = (config: TemplateVariablesConfig) => {
    setTemplateVariables(config)
    // Clear errors when user makes changes
    if (errors.templateVariables || errors.headerMedia) {
      setErrors((prev) => ({
        ...prev,
        templateVariables: undefined,
        headerMedia: undefined,
      }))
    }
  }

  const handleRecipientTypeChange = (value: RecipientType) => {
    setRecipientType(value)
    // Clear related errors when switching
    if (value === "GROUP") {
      setErrors((prev) => ({ ...prev, customerIds: undefined }))
    } else {
      setErrors((prev) => ({ ...prev, groupId: undefined }))
    }
  }

  const handleGroupChange = (value: string) => {
    setGroupId(value)
    if (errors.groupId) {
      setErrors((prev) => ({ ...prev, groupId: undefined }))
    }
  }

  const handleCustomerToggle = (customerId: string) => {
    setCustomerIds((prev) => {
      const isSelected = prev.includes(customerId)
      const newIds = isSelected
        ? prev.filter((id) => id !== customerId)
        : [...prev, customerId]

      if (errors.customerIds && newIds.length > 0) {
        setErrors((curr) => ({ ...curr, customerIds: undefined }))
      }

      return newIds
    })
  }

  const handleImmediateChange = (checked: boolean) => {
    setIsImmediate(checked)
    if (checked) {
      setErrors((prev) => ({ ...prev, scheduledAt: undefined }))
    }
  }

  const handleScheduledAtChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setScheduledAt(value ? new Date(value) : null)
    if (errors.scheduledAt && value) {
      setErrors((prev) => ({ ...prev, scheduledAt: undefined }))
    }
  }

  const handleTimezoneChange = (value: string) => {
    setTimezone(value)
  }

  // Format date for datetime-local input
  const formatDateForInput = (date: Date | null): string => {
    if (!date) return ""
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    const hours = String(date.getHours()).padStart(2, "0")
    const minutes = String(date.getMinutes()).padStart(2, "0")
    return `${year}-${month}-${day}T${hours}:${minutes}`
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Name */}
      <div className="space-y-2">
        <label htmlFor="name" className="text-sm font-medium">
          Name <span className="text-destructive">*</span>
        </label>
        <Input
          id="name"
          type="text"
          value={name}
          onChange={handleNameChange}
          placeholder="Enter broadcast name"
          aria-invalid={!!errors.name}
          disabled={isSubmitting}
        />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name}</p>
        )}
      </div>

      {/* Description */}
      <div className="space-y-2">
        <label htmlFor="description" className="text-sm font-medium">
          Description
        </label>
        <textarea
          id="description"
          value={description}
          onChange={handleDescriptionChange}
          placeholder="Enter broadcast description (optional)"
          disabled={isSubmitting}
          rows={3}
          className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>

      {/* Template Selection */}
      <div className="space-y-2">
        <label htmlFor="templateId" className="text-sm font-medium">
          Template <span className="text-destructive">*</span>
        </label>
        <Select
          value={templateId}
          onValueChange={handleTemplateChange}
          disabled={isSubmitting}
        >
          <SelectTrigger
            id="templateId"
            className="w-full"
            aria-invalid={!!errors.templateId}
          >
            <SelectValue placeholder="Select a template" />
          </SelectTrigger>
          <SelectContent>
            {availableTemplates.map((template) => (
              <SelectItem key={template.id} value={template.id}>
                {template.name} ({template.category})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.templateId && (
          <p className="text-sm text-destructive">{errors.templateId}</p>
        )}
      </div>

      {/* Template Variables Configuration */}
      {selectedTemplate && templateHasVariables && (
        <>
          <Separator />
          <TemplateVariableConfig
            template={selectedTemplate}
            config={templateVariables}
            onChange={handleTemplateVariablesChange}
            errors={errors}
            disabled={isSubmitting}
          />

          <Separator />
          <TemplatePreview
            template={selectedTemplate}
            variableConfig={templateVariables}
            sampleCustomers={availableCustomers.slice(0, 5)}
          />
          <Separator />
        </>
      )}

      {/* Recipient Type */}
      <div className="space-y-2">
        <label className="text-sm font-medium">
          Recipient Type <span className="text-destructive">*</span>
        </label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="recipientType"
              value="GROUP"
              checked={recipientType === "GROUP"}
              onChange={() => handleRecipientTypeChange("GROUP")}
              disabled={isSubmitting}
              className="size-4 accent-primary"
            />
            <span className="text-sm">Group</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="recipientType"
              value="CUSTOMERS"
              checked={recipientType === "CUSTOMERS"}
              onChange={() => handleRecipientTypeChange("CUSTOMERS")}
              disabled={isSubmitting}
              className="size-4 accent-primary"
            />
            <span className="text-sm">Individual Customers</span>
          </label>
        </div>
      </div>

      {/* Group Selection (conditional) */}
      {recipientType === "GROUP" && (
        <div className="space-y-2">
          <label htmlFor="groupId" className="text-sm font-medium">
            Group <span className="text-destructive">*</span>
          </label>
          <Select
            value={groupId}
            onValueChange={handleGroupChange}
            disabled={isSubmitting}
          >
            <SelectTrigger
              id="groupId"
              className="w-full"
              aria-invalid={!!errors.groupId}
            >
              <SelectValue placeholder="Select a group" />
            </SelectTrigger>
            <SelectContent>
              {availableGroups.map((group) => (
                <SelectItem key={group.id} value={group.id}>
                  {group.name} ({group.count.toLocaleString()} recipients)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.groupId && (
            <p className="text-sm text-destructive">{errors.groupId}</p>
          )}
        </div>
      )}

      {/* Customer Selection (conditional) */}
      {recipientType === "CUSTOMERS" && (
        <div className="space-y-2">
          <label className="text-sm font-medium">
            Customers <span className="text-destructive">*</span>
          </label>
          <div className="max-h-48 overflow-y-auto rounded-md border border-input p-2 space-y-2">
            {availableCustomers.map((customer) => (
              <label
                key={customer.id}
                className="flex items-center gap-2 cursor-pointer p-1 hover:bg-accent rounded"
              >
                <Checkbox
                  checked={customerIds.includes(customer.id)}
                  onCheckedChange={() => handleCustomerToggle(customer.id)}
                  disabled={isSubmitting}
                />
                <span className="text-sm">
                  {customer.name} ({customer.whatsappNumber})
                </span>
              </label>
            ))}
          </div>
          {customerIds.length > 0 && (
            <p className="text-sm text-muted-foreground">
              {customerIds.length} customer(s) selected
            </p>
          )}
          {errors.customerIds && (
            <p className="text-sm text-destructive">{errors.customerIds}</p>
          )}
        </div>
      )}

      {/* Send Immediately Toggle */}
      <div className="space-y-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <Checkbox
            checked={isImmediate}
            onCheckedChange={(checked) => handleImmediateChange(checked === true)}
            disabled={isSubmitting}
          />
          <span className="text-sm font-medium">Send immediately</span>
        </label>
      </div>

      {/* Schedule Date/Time (conditional) */}
      {!isImmediate && (
        <>
          <div className="space-y-2">
            <label htmlFor="scheduledAt" className="text-sm font-medium">
              Scheduled Date & Time <span className="text-destructive">*</span>
            </label>
            <Input
              id="scheduledAt"
              type="datetime-local"
              value={formatDateForInput(scheduledAt)}
              onChange={handleScheduledAtChange}
              aria-invalid={!!errors.scheduledAt}
              disabled={isSubmitting}
              min={formatDateForInput(new Date())}
            />
            {errors.scheduledAt && (
              <p className="text-sm text-destructive">{errors.scheduledAt}</p>
            )}
          </div>

          {/* Timezone */}
          <div className="space-y-2">
            <label htmlFor="timezone" className="text-sm font-medium">
              Timezone
            </label>
            <Select
              value={timezone}
              onValueChange={handleTimezoneChange}
              disabled={isSubmitting}
            >
              <SelectTrigger id="timezone" className="w-full">
                <SelectValue placeholder="Select timezone" />
              </SelectTrigger>
              <SelectContent>
                {availableTimezones.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </>
      )}

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
              : "Create Broadcast"}
        </Button>
      </div>
    </form>
  )
}
