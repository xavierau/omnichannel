import * as React from "react"
import { Plus, X, GripVertical } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { SelectOption } from "@/types/custom-fields"

interface SelectOptionsEditorProps {
  options: SelectOption[]
  onChange: (options: SelectOption[]) => void
  error?: string
}

let nextOptionId = 1

export function SelectOptionsEditor({
  options,
  onChange,
  error,
}: SelectOptionsEditorProps) {
  const [newLabel, setNewLabel] = React.useState("")

  const handleAdd = () => {
    if (!newLabel.trim()) return

    const value = newLabel
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "")

    const newOption: SelectOption = {
      id: `opt-new-${++nextOptionId}`,
      label: newLabel.trim(),
      value,
      order: options.length + 1,
    }

    onChange([...options, newOption])
    setNewLabel("")
  }

  const handleRemove = (index: number) => {
    const updated = options.filter((_, i) => i !== index)
    // Re-order remaining options
    const reordered = updated.map((opt, i) => ({ ...opt, order: i + 1 }))
    onChange(reordered)
  }

  const handleLabelChange = (index: number, newLabel: string) => {
    const updated = options.map((opt, i) =>
      i === index ? { ...opt, label: newLabel } : opt
    )
    onChange(updated)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleAdd()
    }
  }

  return (
    <div className="space-y-3 p-3 border rounded-md bg-muted/50">
      <h4 className="text-sm font-medium">
        Options <span className="text-destructive">*</span>
      </h4>

      {options.length > 0 && (
        <div className="space-y-2">
          {options.map((option, index) => (
            <div
              key={option.id}
              className="flex items-center gap-2 p-2 bg-background rounded border"
            >
              <GripVertical className="size-4 text-muted-foreground cursor-grab" />
              <Input
                value={option.label}
                onChange={(e) => handleLabelChange(index, e.target.value)}
                className="flex-1 h-8"
                placeholder="Option label"
              />
              <span className="text-xs text-muted-foreground font-mono">
                {option.value}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={() => handleRemove(index)}
              >
                <X className="size-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <Input
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add an option..."
          className="flex-1"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={handleAdd}
          disabled={!newLabel.trim()}
        >
          <Plus className="size-4" />
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
