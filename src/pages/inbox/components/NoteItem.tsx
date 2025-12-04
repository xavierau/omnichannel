import { useState, useCallback } from "react"
import { formatDistanceToNow } from "date-fns"
import { Pencil, Trash2 } from "lucide-react"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { NoteContent } from "./NoteContent"
import type { Note, Operator, UpdateNoteRequest, NoteMention } from "../types"

interface NoteItemProps {
  note: Note
  currentOperatorId: string
  operators: Operator[]
  onUpdate: (request: UpdateNoteRequest) => void
  onDelete: (noteId: string) => void
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

function formatRelativeTime(date: Date): string {
  return formatDistanceToNow(date, { addSuffix: true })
}

export function NoteItem({
  note,
  currentOperatorId,
  operators,
  onUpdate,
  onDelete,
}: NoteItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(note.content)

  const isOwner = currentOperatorId === note.authorId

  const handleStartEdit = useCallback(() => {
    setEditContent(note.content)
    setIsEditing(true)
  }, [note.content])

  const handleCancelEdit = useCallback(() => {
    setEditContent(note.content)
    setIsEditing(false)
  }, [note.content])

  const handleSaveEdit = useCallback(() => {
    if (editContent.trim() === "") {
      return
    }

    // Parse mentions from the edited content
    const mentions = parseMentionsFromContent(editContent, operators)

    onUpdate({
      id: note.id,
      content: editContent,
      mentions,
    })
    setIsEditing(false)
  }, [editContent, note.id, operators, onUpdate])

  const handleDelete = useCallback(() => {
    onDelete(note.id)
  }, [note.id, onDelete])

  return (
    <div className="border rounded-lg p-3 bg-card">
      {/* Header: Author info and scope badge */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <Avatar className="size-8">
            {note.authorAvatar && (
              <AvatarImage src={note.authorAvatar} alt={note.authorName} />
            )}
            <AvatarFallback className="text-xs">
              {getInitials(note.authorName)}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="text-sm font-medium">{note.authorName}</span>
            <span className="text-xs text-muted-foreground">
              {formatRelativeTime(note.createdAt)}
            </span>
          </div>
        </div>
        <Badge
          variant={note.scope === "conversation" ? "secondary" : "outline"}
          className="text-xs"
        >
          {note.scope === "conversation" ? "Conversation" : "Customer"}
        </Badge>
      </div>

      {/* Content section */}
      <div className="mb-2">
        {isEditing ? (
          <div className="space-y-2">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full min-h-[80px] p-2 text-sm border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Edit note..."
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancelEdit}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSaveEdit}
                disabled={editContent.trim() === ""}
              >
                Save
              </Button>
            </div>
          </div>
        ) : (
          <NoteContent
            content={note.content}
            mentions={note.mentions}
            className="text-sm"
          />
        )}
      </div>

      {/* Actions: Edit and Delete buttons (only for owner) */}
      {isOwner && !isEditing && (
        <div className="flex justify-end gap-1 pt-1 border-t">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleStartEdit}
            className="h-7 px-2 text-muted-foreground hover:text-foreground"
          >
            <Pencil className="size-3.5" />
            <span className="ml-1 text-xs">Edit</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            className="h-7 px-2 text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="size-3.5" />
            <span className="ml-1 text-xs">Delete</span>
          </Button>
        </div>
      )}
    </div>
  )
}

/**
 * Parses @mentions from content text and returns NoteMention array.
 * Matches patterns like @OperatorName where name can be multi-word.
 */
function parseMentionsFromContent(
  content: string,
  operators: Operator[]
): NoteMention[] {
  const mentions: NoteMention[] = []
  const mentionPattern = /@(\w+(?:\s+\w+)?)/g

  let match: RegExpExecArray | null
  while ((match = mentionPattern.exec(content)) !== null) {
    const mentionedName = match[1]
    const operator = operators.find(
      (op) =>
        op.name.toLowerCase() === mentionedName.toLowerCase() ||
        op.name.toLowerCase().startsWith(mentionedName.toLowerCase())
    )

    if (operator) {
      mentions.push({
        operatorId: operator.id,
        operatorName: operator.name,
        startIndex: match.index,
        endIndex: match.index + match[0].length,
      })
    }
  }

  return mentions
}
