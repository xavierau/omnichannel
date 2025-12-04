import type { CustomFieldType, FieldRendererProps } from "@/types/custom-fields"
import { TextFieldRenderer } from "./TextFieldRenderer"
import { TextareaFieldRenderer } from "./TextareaFieldRenderer"
import { NumberFieldRenderer } from "./NumberFieldRenderer"
import { DateFieldRenderer } from "./DateFieldRenderer"
import { SelectFieldRenderer } from "./SelectFieldRenderer"
import { MultiSelectFieldRenderer } from "./MultiSelectFieldRenderer"
import { BooleanFieldRenderer } from "./BooleanFieldRenderer"

type FieldRenderer = React.ComponentType<FieldRendererProps>

/**
 * Registry mapping field types to their renderer components
 */
const fieldRendererRegistry: Record<CustomFieldType, FieldRenderer> = {
  TEXT: TextFieldRenderer,
  TEXTAREA: TextareaFieldRenderer,
  NUMBER: NumberFieldRenderer,
  DATE: DateFieldRenderer,
  DATETIME: DateFieldRenderer,
  SELECT: SelectFieldRenderer,
  MULTISELECT: MultiSelectFieldRenderer,
  BOOLEAN: BooleanFieldRenderer,
  PHONE: TextFieldRenderer,
  EMAIL: TextFieldRenderer,
  URL: TextFieldRenderer,
}

/**
 * Get the appropriate renderer component for a field type
 */
export function getFieldRenderer(type: CustomFieldType): FieldRenderer {
  return fieldRendererRegistry[type] ?? TextFieldRenderer
}

export { fieldRendererRegistry }
export { TextFieldRenderer } from "./TextFieldRenderer"
export { TextareaFieldRenderer } from "./TextareaFieldRenderer"
export { NumberFieldRenderer } from "./NumberFieldRenderer"
export { DateFieldRenderer } from "./DateFieldRenderer"
export { SelectFieldRenderer } from "./SelectFieldRenderer"
export { MultiSelectFieldRenderer } from "./MultiSelectFieldRenderer"
export { BooleanFieldRenderer } from "./BooleanFieldRenderer"
