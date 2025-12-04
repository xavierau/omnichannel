import { Input } from "@/components/ui/input"
import type { FieldRendererProps } from "@/types/custom-fields"

export function NumberFieldRenderer({
  definition,
  value,
  onChange,
  error,
  disabled,
  id,
}: FieldRendererProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value
    if (rawValue === "") {
      onChange(null)
      return
    }
    const numValue = parseFloat(rawValue)
    if (!isNaN(numValue)) {
      onChange(numValue)
    }
  }

  return (
    <Input
      id={id}
      type="number"
      value={value !== null && value !== undefined ? String(value) : ""}
      onChange={handleChange}
      placeholder={definition.description}
      min={definition.validation.min}
      max={definition.validation.max}
      step={definition.validation.decimal === false ? 1 : "any"}
      aria-invalid={!!error}
      disabled={disabled}
    />
  )
}
