import { Input } from "@/components/ui/input"
import type { FieldRendererProps } from "@/types/custom-fields"

export function TextFieldRenderer({
  definition,
  value,
  onChange,
  error,
  disabled,
  id,
}: FieldRendererProps) {
  const inputType =
    definition.fieldType === "EMAIL"
      ? "email"
      : definition.fieldType === "PHONE"
        ? "tel"
        : definition.fieldType === "URL"
          ? "url"
          : "text"

  return (
    <Input
      id={id}
      type={inputType}
      value={(value as string) ?? ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={definition.description}
      maxLength={definition.validation.maxLength}
      aria-invalid={!!error}
      disabled={disabled}
    />
  )
}
