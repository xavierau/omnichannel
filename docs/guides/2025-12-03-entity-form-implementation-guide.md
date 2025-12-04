# Entity Form Implementation Guide

A pattern for creating reusable create/edit forms in this codebase.

---

## Architecture Overview

```
src/pages/{entity}/
  types.ts                         # Add FormData and FormErrors interfaces
  components/
    {Entity}Form.tsx               # Pure form component
    {Entity}FormDialog.tsx         # Dialog wrapper
  {Entity}Page.tsx                 # Integrate dialog
```

**Two components, single responsibility:**
- `{Entity}Form` - Handles form state, validation, rendering
- `{Entity}FormDialog` - Handles modal behavior, submission lifecycle

---

## Step 1: Define Types

Add to `types.ts`:

```typescript
// Data submitted by the form (excludes id, timestamps)
export interface {Entity}FormData {
  field1: string
  field2: string
  relatedIds: string[]  // For relationships, store IDs only
}

// Validation errors (optional fields)
export interface {Entity}FormErrors {
  field1?: string
  field2?: string
}
```

---

## Step 2: Create Form Component

`components/{Entity}Form.tsx`:

```typescript
import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { {Entity}FormData, {Entity}FormErrors } from "../types"

interface {Entity}FormProps {
  initialValues?: {Entity}FormData
  onSubmit: (data: {Entity}FormData) => void
  onCancel: () => void
  isSubmitting?: boolean
}

const defaultFormData: {Entity}FormData = {
  field1: "",
  field2: "",
  relatedIds: [],
}

export function {Entity}Form({
  initialValues,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: {Entity}FormProps) {
  // Mode is computed, not stored
  const isEditMode = initialValues !== undefined

  // Initialize state from props (NO useEffect)
  const [field1, setField1] = React.useState(
    initialValues?.field1 ?? defaultFormData.field1
  )
  const [field2, setField2] = React.useState(
    initialValues?.field2 ?? defaultFormData.field2
  )
  const [errors, setErrors] = React.useState<{Entity}FormErrors>({})

  // Pure validation function
  const validateForm = (): boolean => {
    const newErrors: {Entity}FormErrors = {}

    if (!field1.trim()) {
      newErrors.field1 = "Field1 is required"
    }

    // Add more validation rules...

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    onSubmit({
      field1: field1.trim(),
      field2: field2.trim(),
      relatedIds: [],
    })
  }

  // Clear error on field change
  const handleField1Change = (e: React.ChangeEvent<HTMLInputElement>) => {
    setField1(e.target.value)
    if (errors.field1) {
      setErrors((prev) => ({ ...prev, field1: undefined }))
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Form fields */}
      <div className="space-y-2">
        <label htmlFor="field1" className="text-sm font-medium">
          Field 1 <span className="text-destructive">*</span>
        </label>
        <Input
          id="field1"
          value={field1}
          onChange={handleField1Change}
          aria-invalid={!!errors.field1}
          disabled={isSubmitting}
        />
        {errors.field1 && (
          <p className="text-sm text-destructive">{errors.field1}</p>
        )}
      </div>

      {/* Action buttons */}
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
            ? isEditMode ? "Saving..." : "Adding..."
            : isEditMode ? "Save Changes" : "Add {Entity}"}
        </Button>
      </div>
    </form>
  )
}
```

---

## Step 3: Create Dialog Wrapper

`components/{Entity}FormDialog.tsx`:

```typescript
import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { {Entity}Form } from "./{Entity}Form"
import type { {Entity}, {Entity}FormData } from "../types"

interface {Entity}FormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  entity?: {Entity}  // undefined = create, defined = edit
  onSubmit: (data: {Entity}FormData) => Promise<void>
}

export function {Entity}FormDialog({
  open,
  onOpenChange,
  entity,
  onSubmit,
}: {Entity}FormDialogProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const isEditMode = entity !== undefined

  // Transform entity to form data
  const initialValues: {Entity}FormData | undefined = entity
    ? {
        field1: entity.field1,
        field2: entity.field2,
        relatedIds: entity.related.map((r) => r.id),
      }
    : undefined

  const handleSubmit = async (data: {Entity}FormData) => {
    setIsSubmitting(true)
    try {
      await onSubmit(data)
      onOpenChange(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "Edit {Entity}" : "Add {Entity}"}
          </DialogTitle>
        </DialogHeader>
        <{Entity}Form
          key={entity?.id ?? "new"}  // Reset form when entity changes
          initialValues={initialValues}
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
          isSubmitting={isSubmitting}
        />
      </DialogContent>
    </Dialog>
  )
}
```

---

## Step 4: Integrate with Page

In `{Entity}Page.tsx`:

```typescript
// 1. Add state
const [formDialogOpen, setFormDialogOpen] = React.useState(false)
const [editingEntity, setEditingEntity] = React.useState<{Entity} | undefined>()

// 2. Add handlers
const handleAdd = () => {
  setEditingEntity(undefined)
  setFormDialogOpen(true)
}

const handleEdit = (entity: {Entity}) => {
  setEditingEntity(entity)
  setFormDialogOpen(true)
}

const handleFormSubmit = async (data: {Entity}FormData) => {
  await new Promise((resolve) => setTimeout(resolve, 500)) // Simulate API

  if (editingEntity) {
    // Update
    setEntities((prev) =>
      prev.map((e) =>
        e.id === editingEntity.id
          ? { ...e, ...data, updatedAt: new Date() }
          : e
      )
    )
  } else {
    // Create
    const newEntity: {Entity} = {
      id: `${prefix}-${Date.now()}`,
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    setEntities((prev) => [newEntity, ...prev])
  }
}

// 3. Wire up "Add" button
<Button onClick={handleAdd}>
  <Plus className="mr-2 size-4" />
  Add {Entity}
</Button>

// 4. Wire up column action
const columns = getColumns({
  onEdit: handleEdit,
  // ...
})

// 5. Render dialog
<{Entity}FormDialog
  open={formDialogOpen}
  onOpenChange={setFormDialogOpen}
  entity={editingEntity}
  onSubmit={handleFormSubmit}
/>
```

---

## Key Patterns

### 1. No useEffect for Form Initialization

```typescript
// BAD - creates sync issues
useEffect(() => {
  if (entity) {
    setField1(entity.field1)
  }
}, [entity])

// GOOD - initialize from props, use key for reset
const [field1, setField1] = useState(initialValues?.field1 ?? "")

// In dialog:
<Form key={entity?.id ?? "new"} initialValues={...} />
```

### 2. Computed Mode (Not Stored)

```typescript
// BAD
const [isEditMode, setIsEditMode] = useState(!!entity)

// GOOD
const isEditMode = initialValues !== undefined
```

### 3. Validate on Submit, Clear on Change

```typescript
// Submit handler
const handleSubmit = () => {
  const errors = validate()
  if (Object.keys(errors).length > 0) {
    setErrors(errors)
    return
  }
  onSubmit(data)
}

// Field change handler
const handleFieldChange = (value: string) => {
  setField(value)
  if (errors.field) {
    setErrors((prev) => ({ ...prev, field: undefined }))
  }
}
```

### 4. Separation of Concerns

| Component | Responsibility |
|-----------|----------------|
| `Form` | State, validation, field rendering |
| `FormDialog` | Modal, title, submit lifecycle |
| `Page` | Data operations, dialog state |

---

## Accessibility Checklist

- [ ] Labels with `htmlFor` matching input `id`
- [ ] Required fields marked with `*`
- [ ] `aria-invalid` on error fields
- [ ] Error messages below fields
- [ ] Form handles Enter key submission
- [ ] Disabled state during submission

---

## Reference Implementation

See `src/pages/customers/components/`:
- `CustomerForm.tsx` - 164 lines
- `CustomerFormDialog.tsx` - 73 lines
