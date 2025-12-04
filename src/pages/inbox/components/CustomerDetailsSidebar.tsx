import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ExternalLink, MessageSquare, StickyNote, User } from "lucide-react"
import { cn } from "@/lib/utils"
import type {
  Conversation,
  CreateNoteRequest,
  Note,
  NoteFilterScope,
  Operator,
  UpdateNoteRequest,
} from "../types"
import { CollapsibleSection } from "./CollapsibleSection"
import { ConversationInfoCard } from "./ConversationInfoCard"
import { CustomerInfoCard } from "./CustomerInfoCard"
import { NotesCard } from "./NotesCard"

interface CustomerDetailsSidebarProps {
  conversation: Conversation | null
  notes: Note[]
  noteFilter: NoteFilterScope
  operators: Operator[]
  currentOperatorId: string
  onAddNote: (request: CreateNoteRequest) => void
  onUpdateNote: (request: UpdateNoteRequest) => void
  onDeleteNote: (noteId: string) => void
  onNoteFilterChange: (filter: NoteFilterScope) => void
  className?: string
}

/**
 * Empty state component displayed when no conversation is selected.
 */
function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center p-6 text-center">
      <div className="rounded-full bg-muted p-4">
        <User className="size-8 text-muted-foreground" />
      </div>
      <h3 className="mt-4 text-sm font-medium">No conversation selected</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        Select a conversation to view customer details
      </p>
    </div>
  )
}

/**
 * CustomerDetailsSidebar displays customer and conversation information
 * in the right panel of the inbox.
 * Shows customer contact info, conversation metadata, notes, and quick actions.
 */
export function CustomerDetailsSidebar({
  conversation,
  notes,
  noteFilter,
  operators,
  currentOperatorId,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
  onNoteFilterChange,
  className,
}: CustomerDetailsSidebarProps) {
  if (!conversation) {
    return (
      <aside className={cn("flex h-full flex-col border-l bg-background", className)}>
        <EmptyState />
      </aside>
    )
  }

  return (
    <aside className={cn("flex h-full flex-col border-l bg-background", className)}>
      <ScrollArea className="flex-1 h-full">
        <div className="space-y-4 p-4">
          <CollapsibleSection
            title="Customer"
            icon={User}
            defaultOpen={true}
          >
            <CustomerInfoCard conversation={conversation} />
          </CollapsibleSection>

          <CollapsibleSection
            title="Conversation"
            icon={MessageSquare}
            defaultOpen={true}
          >
            <ConversationInfoCard conversation={conversation} />
          </CollapsibleSection>

          <CollapsibleSection
            title="Notes"
            icon={StickyNote}
            defaultOpen={true}
            badge={
              notes.length > 0 ? (
                <Badge variant="secondary" className="px-2 py-0.5 text-xs">
                  {notes.length}
                </Badge>
              ) : null
            }
          >
            <NotesCard
              notes={notes}
              noteFilter={noteFilter}
              conversationId={conversation.id}
              customerId={conversation.customerId}
              currentOperatorId={currentOperatorId}
              operators={operators}
              onAddNote={onAddNote}
              onUpdateNote={onUpdateNote}
              onDeleteNote={onDeleteNote}
              onFilterChange={onNoteFilterChange}
            />
          </CollapsibleSection>

          <div className="space-y-2">
            <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Quick Actions
            </h4>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start gap-2"
              asChild
            >
              <a
                href={`/customers/${conversation.customerId}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="size-4" />
                View Customer Profile
              </a>
            </Button>
          </div>
        </div>
      </ScrollArea>
    </aside>
  )
}
