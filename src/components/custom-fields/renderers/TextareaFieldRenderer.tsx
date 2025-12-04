import { Textarea } from "@/components/ui/textarea"
import type { FieldRendererProps } from "@/types/custom-fields"

export function TextareaFieldRenderer({
  definition,
  value,
  onChange,
  error,
  disabled,
  id,
}: FieldRendererProps) {
  return (
    <Textarea
      id={id}
      value={(value as string) ?? ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={definition.description}
      maxLength={definition.validation.maxLength}
      aria-invalid={!!error}
      disabled={disabled}
      rows={4}
    />
  )
}
