import * as React from "react"
import { Plus } from "lucide-react"

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

import type {
  CustomFieldDefinition,
  CustomFieldEntityType,
} from "@/types/custom-fields"
import { ENTITY_TYPES } from "@/types/custom-fields"
import {
  getCustomFieldsForEntity,
  createCustomField,
  updateCustomField,
  deleteCustomField,
  reorderCustomFields,
} from "../data/mock-custom-fields"
import { FieldDefinitionList } from "../components/FieldDefinitionList"
import { CustomFieldFormDialog } from "../components/CustomFieldFormDialog"

const MOCK_TENANT_ID = "tenant-001"

export function CustomFieldsPage() {
  const [activeTab, setActiveTab] = React.useState<CustomFieldEntityType>("CUSTOMER")
  const [definitions, setDefinitions] = React.useState<CustomFieldDefinition[]>([])
  const [isLoading, setIsLoading] = React.useState(true)

  // Dialog state
  const [isFormOpen, setIsFormOpen] = React.useState(false)
  const [editingField, setEditingField] = React.useState<CustomFieldDefinition | undefined>()
  const [deleteId, setDeleteId] = React.useState<string | null>(null)

  // Load definitions when tab changes
  React.useEffect(() => {
    setIsLoading(true)
    // Simulate async load
    const timer = setTimeout(() => {
      const data = getCustomFieldsForEntity(activeTab, MOCK_TENANT_ID)
      setDefinitions(data)
      setIsLoading(false)
    }, 100)
    return () => clearTimeout(timer)
  }, [activeTab])

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
      await updateCustomField(id, { isVisible: !field.isVisible })
      setDefinitions((prev) =>
        prev.map((d) =>
          d.id === id ? { ...d, isVisible: !d.isVisible } : d
        )
      )
    } catch (error) {
      console.error("Failed to toggle visibility:", error)
    }
  }

  const handleReorder = async (reordered: CustomFieldDefinition[]) => {
    setDefinitions(reordered)
    try {
      await reorderCustomFields(
        activeTab,
        reordered.map((d) => d.id)
      )
    } catch (error) {
      console.error("Failed to reorder:", error)
      // Revert on error
      const data = getCustomFieldsForEntity(activeTab, MOCK_TENANT_ID)
      setDefinitions(data)
    }
  }

  const handleFormSubmit = async (
    data: Omit<CustomFieldDefinition, "id" | "createdAt" | "updatedAt" | "tenantId" | "displayOrder">
  ) => {
    try {
      if (editingField) {
        // Update existing
        await updateCustomField(editingField.id, data)
        setDefinitions((prev) =>
          prev.map((d) =>
            d.id === editingField.id
              ? { ...d, ...data, updatedAt: new Date() }
              : d
          )
        )
      } else {
        // Create new
        const newField = await createCustomField({
          ...data,
          tenantId: MOCK_TENANT_ID,
          displayOrder: definitions.length + 1,
        })
        setDefinitions((prev) => [...prev, newField])
      }
      setIsFormOpen(false)
    } catch (error) {
      console.error("Failed to save field:", error)
    }
  }

  const handleConfirmDelete = async () => {
    if (!deleteId) return

    try {
      await deleteCustomField(deleteId)
      setDefinitions((prev) => prev.filter((d) => d.id !== deleteId))
    } catch (error) {
      console.error("Failed to delete field:", error)
    } finally {
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
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-16 bg-muted animate-pulse rounded-md"
                  />
                ))}
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
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
