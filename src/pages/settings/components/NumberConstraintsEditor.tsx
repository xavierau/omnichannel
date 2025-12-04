import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"

interface NumberConstraintsEditorProps {
  minValue?: number
  maxValue?: number
  allowDecimal?: boolean
  precision?: number
  onMinChange: (value: number | undefined) => void
  onMaxChange: (value: number | undefined) => void
  onAllowDecimalChange: (value: boolean) => void
  onPrecisionChange: (value: number | undefined) => void
}

export function NumberConstraintsEditor({
  minValue,
  maxValue,
  allowDecimal = true,
  precision,
  onMinChange,
  onMaxChange,
  onAllowDecimalChange,
  onPrecisionChange,
}: NumberConstraintsEditorProps) {
  return (
    <div className="space-y-4 p-3 border rounded-md bg-muted/50">
      <h4 className="text-sm font-medium">Number Constraints</h4>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label htmlFor="min-value" className="text-xs text-muted-foreground">
            Minimum Value
          </label>
          <Input
            id="min-value"
            type="number"
            value={minValue ?? ""}
            onChange={(e) =>
              onMinChange(e.target.value ? parseFloat(e.target.value) : undefined)
            }
            placeholder="No minimum"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="max-value" className="text-xs text-muted-foreground">
            Maximum Value
          </label>
          <Input
            id="max-value"
            type="number"
            value={maxValue ?? ""}
            onChange={(e) =>
              onMaxChange(e.target.value ? parseFloat(e.target.value) : undefined)
            }
            placeholder="No maximum"
          />
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="allow-decimal"
          checked={allowDecimal}
          onCheckedChange={(checked) => onAllowDecimalChange(checked === true)}
        />
        <label
          htmlFor="allow-decimal"
          className="text-sm text-muted-foreground cursor-pointer"
        >
          Allow decimal values
        </label>
      </div>

      {allowDecimal && (
        <div className="space-y-1">
          <label htmlFor="precision" className="text-xs text-muted-foreground">
            Decimal Places
          </label>
          <Input
            id="precision"
            type="number"
            min={0}
            max={10}
            value={precision ?? ""}
            onChange={(e) =>
              onPrecisionChange(
                e.target.value ? parseInt(e.target.value, 10) : undefined
              )
            }
            placeholder="Any precision"
            className="w-32"
          />
        </div>
      )}
    </div>
  )
}
