import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical, Pencil, Trash2, Eye, EyeOff } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { CustomFieldDefinition } from "@/types/custom-fields"

interface SortableFieldItemProps {
  definition: CustomFieldDefinition
  onEdit: () => void
  onDelete: () => void
  onToggleVisibility: () => void
}

export function SortableFieldItem({
  definition,
  onEdit,
  onDelete,
  onToggleVisibility,
}: SortableFieldItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: definition.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 bg-card border rounded-md"
    >
      <button
        type="button"
        className="cursor-grab touch-none text-muted-foreground hover:text-foreground"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-5" />
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium truncate">{definition.displayLabel}</span>
          <Badge variant="secondary" className="text-xs">
            {definition.fieldType}
          </Badge>
          {definition.validation.required && (
            <Badge variant="outline" className="text-xs">
              Required
            </Badge>
          )}
          {!definition.isVisible && (
            <Badge variant="outline" className="text-xs text-muted-foreground">
              Hidden
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground font-mono truncate">
          {definition.fieldKey}
        </p>
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleVisibility}
          title={definition.isVisible ? "Hide field" : "Show field"}
        >
          {definition.isVisible ? (
            <Eye className="size-4" />
          ) : (
            <EyeOff className="size-4" />
          )}
        </Button>
        <Button variant="ghost" size="icon" onClick={onEdit} title="Edit field">
          <Pencil className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onDelete}
          title="Delete field"
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
    </div>
  )
}
