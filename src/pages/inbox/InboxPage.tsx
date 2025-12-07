import { useState, useCallback, useMemo, useEffect } from "react"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import { useOperator } from "@/contexts/OperatorContext"
import {
  inboxService,
  type Conversation as ApiConversation,
  type Message as ApiMessage,
  type InboxNote as ApiInboxNote,
  ConversationStatus as ApiConversationStatus,
  MessageContentType,
  NoteScope,
} from "@/services/inbox.service"
import { useInboxSSE } from "@/hooks/useInboxSSE"
import type {
  Conversation,
  ConversationFilters,
  ConversationStatus,
  CreateNoteRequest,
  Message,
  Note,
  NoteFilterScope,
  UpdateNoteRequest,
} from "./types"
import { defaultFilters } from "./types"
import {
  ConversationList,
  ChatWindow,
  CustomerDetailsSidebar,
  OperatorSelector,
  type SendMessagePayload,
} from "./components"

// ============================================================================
// Type Adapters
// ============================================================================

// Convert API ConversationStatus to frontend ConversationStatus
function toFrontendStatus(apiStatus: ApiConversationStatus): ConversationStatus {
  const statusMap: Record<ApiConversationStatus, ConversationStatus> = {
    [ApiConversationStatus.UNASSIGNED]: "unassigned",
    [ApiConversationStatus.ACTIVE]: "active",
    [ApiConversationStatus.WAITING]: "waiting",
    [ApiConversationStatus.RESOLVED]: "resolved",
    [ApiConversationStatus.CLOSED]: "closed",
  }
  return statusMap[apiStatus] || "unassigned"
}

// Convert frontend ConversationStatus to API ConversationStatus
function toApiStatus(frontendStatus: ConversationStatus): ApiConversationStatus {
  const statusMap: Record<ConversationStatus, ApiConversationStatus> = {
    unassigned: ApiConversationStatus.UNASSIGNED,
    active: ApiConversationStatus.ACTIVE,
    waiting: ApiConversationStatus.WAITING,
    resolved: ApiConversationStatus.RESOLVED,
    closed: ApiConversationStatus.CLOSED,
  }
  return statusMap[frontendStatus]
}

// Convert API Message to frontend Message format
function toFrontendMessage(apiMessage: ApiMessage): Message {
  const content = apiMessage.content as { body?: string } | undefined
  return {
    id: apiMessage.id,
    conversationId: apiMessage.conversationId,
    direction: apiMessage.direction === "inbound" ? "inbound" : "outbound",
    type: apiMessage.contentType as Message["type"],
    content: content?.body || "",
    status: apiMessage.deliveryStatus as Message["status"],
    timestamp: new Date(apiMessage.createdAt),
    operatorId: apiMessage.sentById || undefined,
  }
}

// Convert API Conversation to frontend Conversation format
function toFrontendConversation(apiConversation: ApiConversation, messages: Message[] = []): Conversation {
  return {
    id: apiConversation.id,
    customerId: apiConversation.customerId,
    customerName: apiConversation.customer?.name || "Unknown",
    customerWhatsappNumber: apiConversation.customer?.whatsappNumber || "",
    channel: "whatsapp",
    status: toFrontendStatus(apiConversation.status),
    assignedToId: apiConversation.assignedToId,
    assignedToName: apiConversation.assignedTo
      ? `${apiConversation.assignedTo.firstName} ${apiConversation.assignedTo.lastName}`.trim()
      : null,
    messages,
    unreadCount: apiConversation.unreadCount,
    lastMessageAt: apiConversation.lastMessageAt ? new Date(apiConversation.lastMessageAt) : new Date(),
    lastMessagePreview: apiConversation.lastMessagePreview || "",
    createdAt: new Date(apiConversation.createdAt),
    updatedAt: new Date(apiConversation.updatedAt),
  }
}

// Convert API InboxNote to frontend Note format
function toFrontendNote(apiNote: ApiInboxNote): Note {
  return {
    id: apiNote.id,
    scope: apiNote.scope === NoteScope.CUSTOMER ? "customer" : "conversation",
    conversationId: apiNote.conversationId,
    customerId: apiNote.customerId || "",
    content: apiNote.content,
    mentions: apiNote.mentions.map((m, idx) => ({
      operatorId: m,
      operatorName: m, // Will be resolved by UI
      startIndex: idx,
      endIndex: idx + 1,
    })),
    authorId: apiNote.createdById,
    authorName: apiNote.createdBy
      ? `${apiNote.createdBy.firstName} ${apiNote.createdBy.lastName}`.trim()
      : "Unknown",
    createdAt: new Date(apiNote.createdAt),
    updatedAt: new Date(apiNote.updatedAt),
  }
}

export function InboxPage() {
  const { currentOperator, operators, switchOperator, isLoading: operatorsLoading } = useOperator()

  // Conversations state
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null)
  const [filters, setFilters] = useState<ConversationFilters>(defaultFilters)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Typing simulation state (will be replaced with SSE events)
  const [typingConversations, setTypingConversations] = useState<Set<string>>(new Set())

  // Notes state
  const [notes, setNotes] = useState<Note[]>([])
  const [noteFilter, setNoteFilter] = useState<NoteFilterScope>("all")

  // ============================================================================
  // Data Fetching
  // ============================================================================

  // Fetch conversations on mount
  useEffect(() => {
    const fetchConversations = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const response = await inboxService.getConversations({
          sortBy: "lastMessageAt",
          sortOrder: "desc",
        })
        const frontendConversations = response.data.map((c) => toFrontendConversation(c))
        setConversations(frontendConversations)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load conversations")
        console.error("Failed to fetch conversations:", err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchConversations()
  }, [])

  // Fetch messages when conversation is selected
  useEffect(() => {
    if (!selectedConversationId) return

    const fetchMessages = async () => {
      try {
        const response = await inboxService.getMessages(selectedConversationId, { limit: 100 })
        const frontendMessages = response.data.map(toFrontendMessage)

        setConversations((prev) =>
          prev.map((c) =>
            c.id === selectedConversationId
              ? { ...c, messages: frontendMessages }
              : c
          )
        )
      } catch (err) {
        console.error("Failed to fetch messages:", err)
      }
    }

    fetchMessages()
  }, [selectedConversationId])

  // Fetch notes when conversation is selected
  useEffect(() => {
    if (!selectedConversationId) return

    const fetchNotes = async () => {
      try {
        const apiNotes = await inboxService.getNotes(selectedConversationId)
        setNotes(apiNotes.map(toFrontendNote))
      } catch (err) {
        console.error("Failed to fetch notes:", err)
      }
    }

    fetchNotes()
  }, [selectedConversationId])

  // ============================================================================
  // SSE Integration
  // ============================================================================

  useInboxSSE({
    enabled: true,
    onConversationNew: useCallback((event) => {
      const newConversation = toFrontendConversation(event.conversation)
      setConversations((prev) => [newConversation, ...prev])
    }, []),

    onMessageNew: useCallback((event) => {
      const newMessage = toFrontendMessage(event.message)
      setConversations((prev) =>
        prev.map((c) =>
          c.id === event.conversationId
            ? {
                ...c,
                messages: [...c.messages, newMessage],
                lastMessageAt: new Date(),
                lastMessagePreview: newMessage.content || `[${newMessage.type}]`,
                unreadCount: c.id === selectedConversationId ? 0 : c.unreadCount + 1,
              }
            : c
        )
      )
    }, [selectedConversationId]),

    onMessageStatus: useCallback((event) => {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === event.conversationId
            ? {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === event.messageId
                    ? { ...m, status: event.status as Message["status"] }
                    : m
                ),
              }
            : c
        )
      )
    }, []),

    onConversationAssigned: useCallback((event) => {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === event.conversationId
            ? {
                ...c,
                assignedToId: event.assignedToId,
                status: event.assignedToId ? "active" : "unassigned",
              }
            : c
        )
      )
    }, []),

    onStatusChanged: useCallback((event) => {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === event.conversationId
            ? { ...c, status: toFrontendStatus(event.status) }
            : c
        )
      )
    }, []),

    onUnreadUpdated: useCallback((event) => {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === event.conversationId
            ? { ...c, unreadCount: event.unreadCount }
            : c
        )
      )
    }, []),

    onNoteCreated: useCallback((event) => {
      const newNote = toFrontendNote(event.note)
      setNotes((prev) => [newNote, ...prev])
    }, []),

    onNoteUpdated: useCallback((event) => {
      const updatedNote = toFrontendNote(event.note)
      setNotes((prev) =>
        prev.map((n) => (n.id === updatedNote.id ? updatedNote : n))
      )
    }, []),

    onNoteDeleted: useCallback((event) => {
      setNotes((prev) => prev.filter((n) => n.id !== event.noteId))
    }, []),
  })

  // ============================================================================
  // Computed Values
  // ============================================================================

  // Get selected conversation
  const selectedConversation = useMemo(
    () => conversations.find((c) => c.id === selectedConversationId) || null,
    [conversations, selectedConversationId]
  )

  // Computed filtered notes
  const filteredNotes = useMemo(() => {
    if (!selectedConversation) return []

    return notes
      .filter((note) => {
        const isRelevant =
          note.conversationId === selectedConversation.id ||
          (note.scope === "customer" && note.customerId === selectedConversation.customerId)

        if (!isRelevant) return false

        switch (noteFilter) {
          case "conversation":
            return note.scope === "conversation" && note.conversationId === selectedConversation.id
          case "customer":
            return note.scope === "customer"
          default:
            return true
        }
      })
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  }, [notes, selectedConversation, noteFilter])

  // Check if selected conversation has typing indicator
  const isTyping = selectedConversationId
    ? typingConversations.has(selectedConversationId)
    : false

  // ============================================================================
  // Handlers
  // ============================================================================

  // Handle conversation selection
  const handleSelectConversation = useCallback(async (conversationId: string) => {
    setSelectedConversationId(conversationId)

    // Mark conversation as read via API
    try {
      await inboxService.markAsRead(conversationId)
      setConversations((prev) =>
        prev.map((c) =>
          c.id === conversationId ? { ...c, unreadCount: 0 } : c
        )
      )
    } catch (err) {
      console.error("Failed to mark conversation as read:", err)
    }
  }, [])

  // Handle pick up
  const handlePickUp = useCallback(async (conversationId: string) => {
    if (!currentOperator) return

    try {
      const updatedConversation = await inboxService.pickupConversation(conversationId)
      setConversations((prev) =>
        prev.map((c) =>
          c.id === conversationId
            ? toFrontendConversation(updatedConversation, c.messages)
            : c
        )
      )
    } catch (err) {
      console.error("Failed to pick up conversation:", err)
    }
  }, [currentOperator])

  // Handle release
  const handleRelease = useCallback(async (conversationId: string) => {
    try {
      const updatedConversation = await inboxService.releaseConversation(conversationId)
      setConversations((prev) =>
        prev.map((c) =>
          c.id === conversationId
            ? toFrontendConversation(updatedConversation, c.messages)
            : c
        )
      )
    } catch (err) {
      console.error("Failed to release conversation:", err)
    }
  }, [])

  // Handle assign
  const handleAssign = useCallback(async (conversationId: string, operatorId: string) => {
    try {
      const updatedConversation = await inboxService.assignConversation(conversationId, operatorId)
      setConversations((prev) =>
        prev.map((c) =>
          c.id === conversationId
            ? toFrontendConversation(updatedConversation, c.messages)
            : c
        )
      )
    } catch (err) {
      console.error("Failed to assign conversation:", err)
    }
  }, [])

  // Handle status change
  const handleStatusChange = useCallback(async (conversationId: string, status: ConversationStatus) => {
    try {
      const updatedConversation = await inboxService.updateStatus(conversationId, toApiStatus(status))
      setConversations((prev) =>
        prev.map((c) =>
          c.id === conversationId
            ? toFrontendConversation(updatedConversation, c.messages)
            : c
        )
      )
    } catch (err) {
      console.error("Failed to update conversation status:", err)
    }
  }, [])

  // Handle send message
  const handleSendMessage = useCallback(async (conversationId: string, payload: SendMessagePayload) => {
    if (!currentOperator) return

    const { type, content, attachment, location, contact } = payload

    // Create optimistic message for immediate UI feedback
    const optimisticMessage: Message = {
      id: `temp-${Date.now()}`,
      conversationId,
      direction: "outbound",
      type,
      content: content || "",
      status: "sending",
      timestamp: new Date(),
      operatorId: currentOperator.id,
      operatorName: currentOperator.name,
    }

    // Add optimistic message
    setConversations((prev) =>
      prev.map((c) =>
        c.id === conversationId
          ? {
              ...c,
              messages: [...c.messages, optimisticMessage],
              lastMessageAt: new Date(),
              lastMessagePreview: content || `[${type}]`,
            }
          : c
      )
    )

    try {
      // Build API payload based on message type
      let apiPayload: Parameters<typeof inboxService.sendMessage>[1]

      if (type === "text" && content) {
        apiPayload = {
          contentType: MessageContentType.TEXT,
          text: { content },
        }
      } else if ((type === "image" || type === "document" || type === "video" || type === "audio") && attachment) {
        apiPayload = {
          contentType: type === "image" ? MessageContentType.IMAGE
            : type === "video" ? MessageContentType.VIDEO
            : type === "audio" ? MessageContentType.AUDIO
            : MessageContentType.DOCUMENT,
          media: {
            url: URL.createObjectURL(attachment),
            filename: attachment.name,
            mimeType: attachment.type,
          },
        }
      } else if (type === "location" && location) {
        apiPayload = {
          contentType: MessageContentType.LOCATION,
          location: {
            latitude: location.latitude,
            longitude: location.longitude,
            name: location.name,
            address: location.address,
          },
        }
      } else {
        // Default to text
        apiPayload = {
          contentType: MessageContentType.TEXT,
          text: { content: content || "" },
        }
      }

      const sentMessage = await inboxService.sendMessage(conversationId, apiPayload)
      const frontendMessage = toFrontendMessage(sentMessage)

      // Replace optimistic message with real one
      setConversations((prev) =>
        prev.map((c) =>
          c.id === conversationId
            ? {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === optimisticMessage.id ? frontendMessage : m
                ),
              }
            : c
        )
      )
    } catch (err) {
      console.error("Failed to send message:", err)

      // Mark optimistic message as failed
      setConversations((prev) =>
        prev.map((c) =>
          c.id === conversationId
            ? {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === optimisticMessage.id ? { ...m, status: "failed" } : m
                ),
              }
            : c
        )
      )
    }
  }, [currentOperator])

  // Handle add note
  const handleAddNote = useCallback(async (request: CreateNoteRequest) => {
    if (!currentOperator) return

    try {
      const apiNote = await inboxService.createNote(request.conversationId, {
        content: request.content,
        scope: request.scope === "customer" ? NoteScope.CUSTOMER : NoteScope.CONVERSATION,
        mentions: request.mentions.map((m) => m.operatorId),
      })

      const newNote = toFrontendNote(apiNote)
      setNotes((prev) => [newNote, ...prev])
    } catch (err) {
      console.error("Failed to add note:", err)
    }
  }, [currentOperator])

  // Handle update note
  const handleUpdateNote = useCallback(async (request: UpdateNoteRequest) => {
    try {
      const apiNote = await inboxService.updateNote(request.id, {
        content: request.content,
        mentions: request.mentions.map((m) => m.operatorId),
      })

      const updatedNote = toFrontendNote(apiNote)
      setNotes((prev) =>
        prev.map((note) => (note.id === request.id ? updatedNote : note))
      )
    } catch (err) {
      console.error("Failed to update note:", err)
    }
  }, [])

  // Handle delete note
  const handleDeleteNote = useCallback(async (noteId: string) => {
    try {
      await inboxService.deleteNote(noteId)
      setNotes((prev) => prev.filter((note) => note.id !== noteId))
    } catch (err) {
      console.error("Failed to delete note:", err)
    }
  }, [])

  // Handle note filter change
  const handleNoteFilterChange = useCallback((filter: NoteFilterScope) => {
    setNoteFilter(filter)
  }, [])

  // ============================================================================
  // Render
  // ============================================================================

  if (isLoading || operatorsLoading) {
    return (
      <div className="h-[calc(100vh-3.5rem)] flex items-center justify-center">
        <div className="text-muted-foreground">Loading inbox...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-[calc(100vh-3.5rem)] flex items-center justify-center">
        <div className="text-destructive">Error: {error}</div>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col">
      {/* Header with operator selector */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-background">
        <h1 className="text-lg font-semibold">Inbox</h1>
        <OperatorSelector
          operators={operators}
          currentOperator={currentOperator}
          onSelect={switchOperator}
        />
      </div>

      {/* Main content with resizable panels */}
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        {/* Left Panel - Conversation List */}
        <ResizablePanel defaultSize={25} minSize={20} maxSize={35}>
          <ConversationList
            conversations={conversations}
            selectedId={selectedConversationId}
            onSelect={handleSelectConversation}
            filters={filters}
            onFiltersChange={setFilters}
            currentOperatorId={currentOperator?.id || ""}
          />
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Center Panel - Chat Window */}
        <ResizablePanel defaultSize={50} minSize={35}>
          <ChatWindow
            conversation={selectedConversation}
            operators={operators}
            currentOperatorId={currentOperator?.id || ""}
            isTyping={isTyping}
            onPickUp={handlePickUp}
            onRelease={handleRelease}
            onAssign={handleAssign}
            onStatusChange={handleStatusChange}
            onSendMessage={handleSendMessage}
          />
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Right Panel - Customer Details */}
        <ResizablePanel defaultSize={25} minSize={20} maxSize={35}>
          <CustomerDetailsSidebar
            conversation={selectedConversation}
            notes={filteredNotes}
            noteFilter={noteFilter}
            operators={operators}
            currentOperatorId={currentOperator?.id || ""}
            onAddNote={handleAddNote}
            onUpdateNote={handleUpdateNote}
            onDeleteNote={handleDeleteNote}
            onNoteFilterChange={handleNoteFilterChange}
          />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}
