import { Checkbox } from "@/components/ui/checkbox"
import type { FieldRendererProps } from "@/types/custom-fields"

export function BooleanFieldRenderer({
  definition,
  value,
  onChange,
  disabled,
  id,
}: FieldRendererProps) {
  return (
    <div className="flex items-center space-x-2">
      <Checkbox
        id={id}
        checked={Boolean(value)}
        onCheckedChange={(checked) => onChange(checked === true)}
        disabled={disabled}
      />
      {definition.description && (
        <label
          htmlFor={id}
          className="text-sm text-muted-foreground cursor-pointer"
        >
          {definition.description}
        </label>
      )}
    </div>
  )
}
