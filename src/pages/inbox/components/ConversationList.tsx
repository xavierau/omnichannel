import { useMemo, useCallback } from "react"
import { Inbox } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { ConversationFilters } from "./ConversationFilters"
import { ConversationListItem } from "./ConversationListItem"
import type {
  Conversation,
  ConversationFilters as ConversationFiltersType,
} from "../types"

interface ConversationListProps {
  conversations: Conversation[]
  selectedId: string | null
  onSelect: (id: string) => void
  filters: ConversationFiltersType
  onFiltersChange: (filters: ConversationFiltersType) => void
  currentOperatorId?: string
}

interface GroupedConversations {
  unassigned: Conversation[]
  mine: Conversation[]
  others: Conversation[]
}

/**
 * Groups conversations into three categories:
 * 1. Unassigned - No operator assigned
 * 2. Mine - Assigned to the current operator
 * 3. Others - Assigned to other operators
 */
function groupConversations(
  conversations: Conversation[],
  currentOperatorId?: string
): GroupedConversations {
  return conversations.reduce<GroupedConversations>(
    (groups, conversation) => {
      if (!conversation.assignedToId) {
        groups.unassigned.push(conversation)
      } else if (conversation.assignedToId === currentOperatorId) {
        groups.mine.push(conversation)
      } else {
        groups.others.push(conversation)
      }
      return groups
    },
    { unassigned: [], mine: [], others: [] }
  )
}

/**
 * Filters conversations based on search term and filter criteria.
 */
function filterConversations(
  conversations: Conversation[],
  filters: ConversationFiltersType,
  currentOperatorId?: string
): Conversation[] {
  return conversations.filter((conversation) => {
    // Search filter: match against customer name or phone number
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      const matchesName = conversation.customerName
        .toLowerCase()
        .includes(searchLower)
      const matchesPhone = conversation.customerWhatsappNumber
        .toLowerCase()
        .includes(searchLower)
      const matchesPreview = conversation.lastMessagePreview
        .toLowerCase()
        .includes(searchLower)

      if (!matchesName && !matchesPhone && !matchesPreview) {
        return false
      }
    }

    // Status filter
    if (
      filters.statuses.length > 0 &&
      !filters.statuses.includes(conversation.status)
    ) {
      return false
    }

    // Assignment filter
    if (filters.assignedTo === "unassigned" && conversation.assignedToId) {
      return false
    }
    if (
      filters.assignedTo === "mine" &&
      conversation.assignedToId !== currentOperatorId
    ) {
      return false
    }

    return true
  })
}

/**
 * Sorts conversations by last message timestamp, most recent first.
 */
function sortByLastMessage(conversations: Conversation[]): Conversation[] {
  return [...conversations].sort(
    (a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime()
  )
}

/**
 * Section header component for conversation groups.
 */
function SectionHeader({
  title,
  count,
  className,
}: {
  title: string
  count: number
  className?: string
}) {
  if (count === 0) return null

  return (
    <div
      className={cn(
        "sticky top-0 z-10 bg-muted/80 backdrop-blur-sm px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider",
        className
      )}
    >
      {title} ({count})
    </div>
  )
}

/**
 * Empty state component when no conversations match filters.
 */
function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="rounded-full bg-muted p-4 mb-4">
        <Inbox className="size-8 text-muted-foreground" />
      </div>
      <h3 className="font-medium text-sm mb-1">No conversations found</h3>
      <p className="text-xs text-muted-foreground max-w-[200px]">
        {hasFilters
          ? "Try adjusting your filters or search term"
          : "Conversations will appear here when customers message you"}
      </p>
    </div>
  )
}

/**
 * Main conversation list component for the inbox left panel.
 * Features:
 * - Search and filter functionality
 * - Grouped display (Unassigned -> Mine -> Others)
 * - Virtualized scrolling via ScrollArea
 * - Selection state management
 */
export function ConversationList({
  conversations,
  selectedId,
  onSelect,
  filters,
  onFiltersChange,
  currentOperatorId,
}: ConversationListProps) {
  // Apply filters and sort conversations
  const filteredConversations = useMemo(() => {
    const filtered = filterConversations(
      conversations,
      filters,
      currentOperatorId
    )
    return sortByLastMessage(filtered)
  }, [conversations, filters, currentOperatorId])

  // Group filtered conversations
  const groupedConversations = useMemo(
    () => groupConversations(filteredConversations, currentOperatorId),
    [filteredConversations, currentOperatorId]
  )

  // Memoized selection handler factory
  const createSelectHandler = useCallback(
    (id: string) => () => onSelect(id),
    [onSelect]
  )

  const hasFilters =
    filters.search !== "" ||
    filters.statuses.length > 0 ||
    filters.assignedTo !== "all"

  const hasConversations = filteredConversations.length > 0

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Filters Section */}
      <ConversationFilters filters={filters} onFiltersChange={onFiltersChange} />

      {/* Conversation List */}
      {hasConversations ? (
        <ScrollArea className="flex-1 h-full">
          {/* Unassigned Section */}
          {groupedConversations.unassigned.length > 0 && (
            <section aria-label="Unassigned conversations">
              <SectionHeader
                title="Unassigned"
                count={groupedConversations.unassigned.length}
              />
              {groupedConversations.unassigned.map((conversation) => (
                <ConversationListItem
                  key={conversation.id}
                  conversation={conversation}
                  isSelected={selectedId === conversation.id}
                  onClick={createSelectHandler(conversation.id)}
                />
              ))}
            </section>
          )}

          {/* My Conversations Section */}
          {groupedConversations.mine.length > 0 && (
            <section aria-label="My conversations">
              <SectionHeader
                title="My Conversations"
                count={groupedConversations.mine.length}
              />
              {groupedConversations.mine.map((conversation) => (
                <ConversationListItem
                  key={conversation.id}
                  conversation={conversation}
                  isSelected={selectedId === conversation.id}
                  onClick={createSelectHandler(conversation.id)}
                />
              ))}
            </section>
          )}

          {/* Others Section */}
          {groupedConversations.others.length > 0 && (
            <section aria-label="Other conversations">
              <SectionHeader
                title="Other Conversations"
                count={groupedConversations.others.length}
              />
              {groupedConversations.others.map((conversation) => (
                <ConversationListItem
                  key={conversation.id}
                  conversation={conversation}
                  isSelected={selectedId === conversation.id}
                  onClick={createSelectHandler(conversation.id)}
                />
              ))}
            </section>
          )}
        </ScrollArea>
      ) : (
        <EmptyState hasFilters={hasFilters} />
      )}
    </div>
  )
}
