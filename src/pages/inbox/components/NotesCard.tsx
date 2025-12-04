import { Separator } from "@/components/ui/separator"
import { NoteScopeFilter } from "./NoteScopeFilter"
import { NoteInput } from "./NoteInput"
import { NotesList } from "./NotesList"
import type {
  Note,
  NoteFilterScope,
  Operator,
  CreateNoteRequest,
  UpdateNoteRequest,
} from "../types"

interface NotesCardProps {
  notes: Note[]
  noteFilter: NoteFilterScope
  conversationId: string
  customerId: string
  currentOperatorId: string
  operators: Operator[]
  onAddNote: (request: CreateNoteRequest) => void
  onUpdateNote: (request: UpdateNoteRequest) => void
  onDeleteNote: (noteId: string) => void
  onFilterChange: (filter: NoteFilterScope) => void
}

/**
 * Main container for the notes feature.
 *
 * Composes the filter dropdown, note input for creating new notes,
 * and the notes list. This component orchestrates the child components
 * without managing internal state - all data flows through props.
 */
export function NotesCard({
  notes,
  noteFilter,
  conversationId,
  customerId,
  currentOperatorId,
  operators,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
  onFilterChange,
}: NotesCardProps) {
  return (
    <div className="space-y-4">
      <NoteScopeFilter value={noteFilter} onChange={onFilterChange} />

      <NoteInput
        conversationId={conversationId}
        customerId={customerId}
        operators={operators}
        onSubmit={onAddNote}
      />

      <Separator />

      <NotesList
        notes={notes}
        currentOperatorId={currentOperatorId}
        operators={operators}
        onUpdate={onUpdateNote}
        onDelete={onDeleteNote}
      />
    </div>
  )
}
