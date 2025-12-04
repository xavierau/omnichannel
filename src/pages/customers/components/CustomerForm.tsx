import * as React from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { TagSelector } from "@/components/ui/tag-selector"
import { CustomFieldsFormSection } from "@/components/custom-fields"
import { useCustomFieldDefinitions } from "@/components/custom-fields/hooks"
import { validateCustomFields } from "@/lib/custom-field-validation"
import type { CustomFieldsData } from "@/types/custom-fields"
import type { Tag, CustomerFormData, CustomerFormErrors } from "../types"

interface CustomerFormProps {
  initialValues?: CustomerFormData
  availableTags: Tag[]
  onSubmit: (data: CustomerFormData) => void
  onCancel: () => void
  isSubmitting?: boolean
}

const defaultFormData: CustomerFormData = {
  name: "",
  whatsappNumber: "",
  tagIds: [],
  customFields: {},
}

export function CustomerForm({
  initialValues,
  availableTags,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: CustomerFormProps) {
  const isEditMode = initialValues !== undefined

  const [name, setName] = React.useState(initialValues?.name ?? defaultFormData.name)
  const [whatsappNumber, setWhatsappNumber] = React.useState(
    initialValues?.whatsappNumber ?? defaultFormData.whatsappNumber
  )
  const [tagIds, setTagIds] = React.useState<string[]>(
    initialValues?.tagIds ?? defaultFormData.tagIds
  )
  const [customFields, setCustomFields] = React.useState<CustomFieldsData>(
    initialValues?.customFields ?? defaultFormData.customFields ?? {}
  )
  const [errors, setErrors] = React.useState<CustomerFormErrors>({})

  // Get custom field definitions for validation
  const { definitions } = useCustomFieldDefinitions("CUSTOMER")

  const validateForm = (): boolean => {
    const newErrors: CustomerFormErrors = {}

    // Name validation: required, minimum 2 characters
    if (!name.trim()) {
      newErrors.name = "Name is required"
    } else if (name.trim().length < 2) {
      newErrors.name = "Name must be at least 2 characters"
    }

    // Phone validation: required, 10-15 digits
    const digitsOnly = whatsappNumber.replace(/\D/g, "")
    if (!whatsappNumber.trim()) {
      newErrors.whatsappNumber = "WhatsApp number is required"
    } else if (digitsOnly.length < 10 || digitsOnly.length > 15) {
      newErrors.whatsappNumber = "Phone number must be 10-15 digits"
    }

    // Custom fields validation
    const customFieldErrors = validateCustomFields(definitions, customFields)
    if (Object.keys(customFieldErrors).length > 0) {
      newErrors.customFields = customFieldErrors
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
      whatsappNumber: whatsappNumber.trim(),
      tagIds,
      customFields,
    })
  }

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value)
    if (errors.name) {
      setErrors((prev) => ({ ...prev, name: undefined }))
    }
  }

  const handleWhatsappNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setWhatsappNumber(e.target.value)
    if (errors.whatsappNumber) {
      setErrors((prev) => ({ ...prev, whatsappNumber: undefined }))
    }
  }

  const handleTagsChange = (selected: string[]) => {
    setTagIds(selected)
  }

  const handleCustomFieldsChange = (values: CustomFieldsData) => {
    setCustomFields(values)
    // Clear custom field errors when values change
    if (errors.customFields) {
      setErrors((prev) => ({ ...prev, customFields: undefined }))
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Core fields section */}
      <div className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="name" className="text-sm font-medium">
            Name <span className="text-destructive">*</span>
          </label>
          <Input
            id="name"
            type="text"
            value={name}
            onChange={handleNameChange}
            placeholder="Enter customer name"
            aria-invalid={!!errors.name}
            disabled={isSubmitting}
          />
          {errors.name && (
            <p className="text-sm text-destructive">{errors.name}</p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="whatsappNumber" className="text-sm font-medium">
            WhatsApp Number <span className="text-destructive">*</span>
          </label>
          <Input
            id="whatsappNumber"
            type="tel"
            value={whatsappNumber}
            onChange={handleWhatsappNumberChange}
            placeholder="+1 555-123-4567"
            aria-invalid={!!errors.whatsappNumber}
            disabled={isSubmitting}
          />
          {errors.whatsappNumber && (
            <p className="text-sm text-destructive">{errors.whatsappNumber}</p>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Tags</label>
          <TagSelector
            options={availableTags}
            selected={tagIds}
            onChange={handleTagsChange}
            placeholder="Select tags..."
            disabled={isSubmitting}
          />
        </div>
      </div>

      {/* Custom fields section */}
      <CustomFieldsFormSection
        entityType="CUSTOMER"
        values={customFields}
        onChange={handleCustomFieldsChange}
        errors={errors.customFields}
        disabled={isSubmitting}
      />

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
              : "Adding..."
            : isEditMode
              ? "Save Changes"
              : "Add Customer"}
        </Button>
      </div>
    </form>
  )
}
