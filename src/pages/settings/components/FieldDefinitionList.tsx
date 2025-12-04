import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"

import type { CustomFieldDefinition } from "@/types/custom-fields"
import { SortableFieldItem } from "./SortableFieldItem"

interface FieldDefinitionListProps {
  definitions: CustomFieldDefinition[]
  onReorder: (definitions: CustomFieldDefinition[]) => void
  onEdit: (definition: CustomFieldDefinition) => void
  onDelete: (id: string) => void
  onToggleVisibility: (id: string) => void
}

export function FieldDefinitionList({
  definitions,
  onReorder,
  onEdit,
  onDelete,
  onToggleVisibility,
}: FieldDefinitionListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = definitions.findIndex((d) => d.id === active.id)
      const newIndex = definitions.findIndex((d) => d.id === over.id)

      const reordered = arrayMove(definitions, oldIndex, newIndex).map(
        (def, index) => ({ ...def, displayOrder: index + 1 })
      )

      onReorder(reordered)
    }
  }

  if (definitions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No custom fields defined yet.</p>
        <p className="text-sm">Click "Add Field" to create your first custom field.</p>
      </div>
    )
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={definitions.map((d) => d.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-2">
          {definitions.map((definition) => (
            <SortableFieldItem
              key={definition.id}
              definition={definition}
              onEdit={() => onEdit(definition)}
              onDelete={() => onDelete(definition.id)}
              onToggleVisibility={() => onToggleVisibility(definition.id)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
