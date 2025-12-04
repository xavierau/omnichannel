import { Input } from "@/components/ui/input"
import type { CustomFieldType } from "@/types/custom-fields"

interface TextConstraintsEditorProps {
  fieldType: CustomFieldType
  minLength?: number
  maxLength?: number
  pattern?: string
  patternMessage?: string
  onMinLengthChange: (value: number | undefined) => void
  onMaxLengthChange: (value: number | undefined) => void
  onPatternChange: (value: string) => void
  onPatternMessageChange: (value: string) => void
}

export function TextConstraintsEditor({
  fieldType,
  minLength,
  maxLength,
  pattern,
  patternMessage,
  onMinLengthChange,
  onMaxLengthChange,
  onPatternChange,
  onPatternMessageChange,
}: TextConstraintsEditorProps) {
  const showPattern = fieldType === "TEXT"

  return (
    <div className="space-y-4 p-3 border rounded-md bg-muted/50">
      <h4 className="text-sm font-medium">Text Constraints</h4>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label htmlFor="min-length" className="text-xs text-muted-foreground">
            Minimum Length
          </label>
          <Input
            id="min-length"
            type="number"
            min={0}
            value={minLength ?? ""}
            onChange={(e) =>
              onMinLengthChange(
                e.target.value ? parseInt(e.target.value, 10) : undefined
              )
            }
            placeholder="No minimum"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="max-length" className="text-xs text-muted-foreground">
            Maximum Length
          </label>
          <Input
            id="max-length"
            type="number"
            min={0}
            value={maxLength ?? ""}
            onChange={(e) =>
              onMaxLengthChange(
                e.target.value ? parseInt(e.target.value, 10) : undefined
              )
            }
            placeholder="No maximum"
          />
        </div>
      </div>

      {showPattern && (
        <>
          <div className="space-y-1">
            <label htmlFor="pattern" className="text-xs text-muted-foreground">
              Validation Pattern (Regex)
            </label>
            <Input
              id="pattern"
              type="text"
              value={pattern ?? ""}
              onChange={(e) => onPatternChange(e.target.value)}
              placeholder="e.g., ^[A-Z]{2,3}$"
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Regular expression to validate the field value
            </p>
          </div>

          {pattern && (
            <div className="space-y-1">
              <label
                htmlFor="pattern-message"
                className="text-xs text-muted-foreground"
              >
                Pattern Error Message
              </label>
              <Input
                id="pattern-message"
                type="text"
                value={patternMessage ?? ""}
                onChange={(e) => onPatternMessageChange(e.target.value)}
                placeholder="Invalid format"
              />
            </div>
          )}
        </>
      )}
    </div>
  )
}
