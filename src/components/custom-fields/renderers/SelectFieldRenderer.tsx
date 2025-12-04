import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { FieldRendererProps } from "@/types/custom-fields"

export function SelectFieldRenderer({
  definition,
  value,
  onChange,
  error,
  disabled,
  id,
}: FieldRendererProps) {
  return (
    <Select
      value={(value as string) ?? ""}
      onValueChange={onChange}
      disabled={disabled}
    >
      <SelectTrigger id={id} aria-invalid={!!error} className="w-full">
        <SelectValue placeholder={definition.description ?? "Select an option"} />
      </SelectTrigger>
      <SelectContent>
        {definition.options?.map((option) => (
          <SelectItem key={option.id} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
