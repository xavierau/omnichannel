import { StickyNote } from "lucide-react"
import { NoteItem } from "./NoteItem"
import type { Note, Operator, UpdateNoteRequest } from "../types"

interface NotesListProps {
  notes: Note[]
  currentOperatorId: string
  operators: Operator[]
  onUpdate: (request: UpdateNoteRequest) => void
  onDelete: (noteId: string) => void
}

export function NotesList({
  notes,
  currentOperatorId,
  operators,
  onUpdate,
  onDelete,
}: NotesListProps) {
  if (notes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <StickyNote className="size-10 mb-2" />
        <p className="text-sm">No notes yet</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {notes.map((note) => (
        <NoteItem
          key={note.id}
          note={note}
          currentOperatorId={currentOperatorId}
          operators={operators}
          onUpdate={onUpdate}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}
