import * as React from "react"
import { Plus, Loader2, AlertCircle, RefreshCw } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

import type {
  CustomFieldDefinition,
  CustomFieldEntityType,
} from "@/types/custom-fields"
import { ENTITY_TYPES } from "@/types/custom-fields"
import { customFieldService } from "@/services/custom-field.service"
import { FieldDefinitionList } from "../components/FieldDefinitionList"
import { CustomFieldFormDialog } from "../components/CustomFieldFormDialog"

export function CustomFieldsPage() {
  const [activeTab, setActiveTab] = React.useState<CustomFieldEntityType>("CUSTOMER")
  const [definitions, setDefinitions] = React.useState<CustomFieldDefinition[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  // Dialog state
  const [isFormOpen, setIsFormOpen] = React.useState(false)
  const [editingField, setEditingField] = React.useState<CustomFieldDefinition | undefined>()
  const [deleteId, setDeleteId] = React.useState<string | null>(null)
  const [isDeleting, setIsDeleting] = React.useState(false)

  // Fetch definitions from API
  const fetchDefinitions = React.useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await customFieldService.getCustomFields(activeTab)
      setDefinitions(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load custom fields"
      setError(message)
      toast.error("Failed to load custom fields", { description: message })
    } finally {
      setIsLoading(false)
    }
  }, [activeTab])

  // Load definitions when tab changes
  React.useEffect(() => {
    fetchDefinitions()
  }, [fetchDefinitions])

  const handleAdd = () => {
    setEditingField(undefined)
    setIsFormOpen(true)
  }

  const handleEdit = (field: CustomFieldDefinition) => {
    setEditingField(field)
    setIsFormOpen(true)
  }

  const handleDelete = (id: string) => {
    setDeleteId(id)
  }

  const handleToggleVisibility = async (id: string) => {
    const field = definitions.find((d) => d.id === id)
    if (!field) return

    try {
      const updated = await customFieldService.updateCustomField(id, {
        isVisible: !field.isVisible,
      })
      setDefinitions((prev) =>
        prev.map((d) => (d.id === id ? updated : d))
      )
      toast.success(`Field ${updated.isVisible ? "shown" : "hidden"}`)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update visibility"
      toast.error("Failed to update visibility", { description: message })
    }
  }

  const handleReorder = async (reordered: CustomFieldDefinition[]) => {
    const previousDefinitions = [...definitions]
    setDefinitions(reordered)

    try {
      await customFieldService.reorderCustomFields({
        entityType: activeTab,
        orderedIds: reordered.map((d) => d.id),
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to reorder fields"
      toast.error("Failed to reorder fields", { description: message })
      setDefinitions(previousDefinitions)
    }
  }

  const handleFormSubmit = async (
    data: Omit<CustomFieldDefinition, "id" | "createdAt" | "updatedAt" | "tenantId" | "displayOrder">
  ) => {
    try {
      if (editingField) {
        // Update existing
        const updated = await customFieldService.updateCustomField(editingField.id, {
          displayLabel: data.displayLabel,
          description: data.description,
          validation: data.validation,
          defaultValue: data.defaultValue,
          options: data.options,
          isVisible: data.isVisible,
          isSearchable: data.isSearchable,
          isFilterable: data.isFilterable,
        })
        setDefinitions((prev) =>
          prev.map((d) => (d.id === editingField.id ? updated : d))
        )
        toast.success("Custom field updated")
      } else {
        // Create new
        const newField = await customFieldService.createCustomField({
          entityType: activeTab,
          fieldKey: data.fieldKey,
          displayLabel: data.displayLabel,
          description: data.description,
          fieldType: data.fieldType,
          validation: data.validation,
          defaultValue: data.defaultValue,
          options: data.options,
          isVisible: data.isVisible,
          isSearchable: data.isSearchable,
          isFilterable: data.isFilterable,
        })
        setDefinitions((prev) => [...prev, newField])
        toast.success("Custom field created")
      }
      setIsFormOpen(false)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save field"
      toast.error("Failed to save field", { description: message })
    }
  }

  const handleConfirmDelete = async () => {
    if (!deleteId) return

    setIsDeleting(true)
    try {
      await customFieldService.deleteCustomField(deleteId)
      setDefinitions((prev) => prev.filter((d) => d.id !== deleteId))
      toast.success("Custom field deleted")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete field"
      toast.error("Failed to delete field", { description: message })
    } finally {
      setIsDeleting(false)
      setDeleteId(null)
    }
  }

  const existingKeys = definitions.map((d) => d.fieldKey)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Custom Fields</h1>
          <p className="text-muted-foreground">
            Define custom fields to extend your data model
          </p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="mr-2 size-4" />
          Add Field
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>{error}</span>
            <Button variant="outline" size="sm" onClick={fetchDefinitions}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <Tabs
        value={activeTab}
        onValueChange={(v: string) => setActiveTab(v as CustomFieldEntityType)}
      >
        <TabsList>
          {ENTITY_TYPES.map((entity) => (
            <TabsTrigger key={entity.value} value={entity.value}>
              {entity.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {ENTITY_TYPES.map((entity) => (
          <TabsContent key={entity.value} value={entity.value} className="mt-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : definitions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="rounded-full bg-muted p-4 mb-4">
                  <Plus className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium">No custom fields</h3>
                <p className="text-muted-foreground mt-1 mb-4">
                  Create custom fields to capture additional data for {entity.label.toLowerCase()}
                </p>
                <Button onClick={handleAdd}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Field
                </Button>
              </div>
            ) : (
              <FieldDefinitionList
                definitions={definitions}
                onReorder={handleReorder}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onToggleVisibility={handleToggleVisibility}
              />
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Form Dialog */}
      <CustomFieldFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        entityType={activeTab}
        initialValues={editingField}
        existingKeys={existingKeys}
        onSubmit={handleFormSubmit}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Custom Field</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this custom field? This action
              cannot be undone. Any data stored in this field will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
