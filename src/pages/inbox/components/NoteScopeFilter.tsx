import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { NOTE_FILTER_SCOPES, type NoteFilterScope } from "../types"

interface NoteScopeFilterProps {
  value: NoteFilterScope
  onChange: (value: NoteFilterScope) => void
}

export function NoteScopeFilter({ value, onChange }: NoteScopeFilterProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full" size="sm">
        <SelectValue placeholder="Filter notes" />
      </SelectTrigger>
      <SelectContent>
        {NOTE_FILTER_SCOPES.map((scope) => (
          <SelectItem key={scope.value} value={scope.value}>
            {scope.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
