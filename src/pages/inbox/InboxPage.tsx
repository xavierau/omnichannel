import { useState, useCallback, useMemo } from "react"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import { useOperator } from "@/contexts/OperatorContext"
import { mockConversations } from "./data/mock-conversations"
import { mockNotes } from "./data/mock-notes"
import type {
  Conversation,
  ConversationFilters,
  ConversationStatus,
  CreateNoteRequest,
  Message,
  MessageType,
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
} from "./components"

export function InboxPage() {
  const { currentOperator, operators, switchOperator } = useOperator()

  // Conversations state
  const [conversations, setConversations] = useState<Conversation[]>(mockConversations)
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null)
  const [filters, setFilters] = useState<ConversationFilters>(defaultFilters)

  // Typing simulation state
  const [typingConversations, setTypingConversations] = useState<Set<string>>(new Set())

  // Notes state
  const [notes, setNotes] = useState<Note[]>(mockNotes)
  const [noteFilter, setNoteFilter] = useState<NoteFilterScope>("all")

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
        // First check if note is relevant to this conversation/customer
        const isRelevant =
          note.conversationId === selectedConversation.id ||
          (note.scope === "customer" && note.customerId === selectedConversation.customerId)

        if (!isRelevant) return false

        // Then apply scope filter
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

  // Handle conversation selection
  const handleSelectConversation = useCallback((conversationId: string) => {
    setSelectedConversationId(conversationId)
    // Mark conversation as read
    setConversations((prev) =>
      prev.map((c) =>
        c.id === conversationId ? { ...c, unreadCount: 0 } : c
      )
    )
  }, [])

  // Handle pick up
  const handlePickUp = useCallback(
    (conversationId: string) => {
      if (!currentOperator) return

      setConversations((prev) =>
        prev.map((c) =>
          c.id === conversationId
            ? {
                ...c,
                status: "active" as ConversationStatus,
                assignedToId: currentOperator.id,
                assignedToName: currentOperator.name,
                updatedAt: new Date(),
              }
            : c
        )
      )
    },
    [currentOperator]
  )

  // Handle release
  const handleRelease = useCallback((conversationId: string) => {
    setConversations((prev) =>
      prev.map((c) =>
        c.id === conversationId
          ? {
              ...c,
              status: "unassigned" as ConversationStatus,
              assignedToId: null,
              assignedToName: null,
              updatedAt: new Date(),
            }
          : c
      )
    )
  }, [])

  // Handle assign
  const handleAssign = useCallback(
    (conversationId: string, operatorId: string) => {
      const operator = operators.find((op) => op.id === operatorId)
      if (!operator) return

      setConversations((prev) =>
        prev.map((c) =>
          c.id === conversationId
            ? {
                ...c,
                status: "active" as ConversationStatus,
                assignedToId: operator.id,
                assignedToName: operator.name,
                updatedAt: new Date(),
              }
            : c
        )
      )
    },
    [operators]
  )

  // Handle status change
  const handleStatusChange = useCallback(
    (conversationId: string, status: ConversationStatus) => {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === conversationId
            ? {
                ...c,
                status,
                updatedAt: new Date(),
              }
            : c
        )
      )
    },
    []
  )

  // Handle send message
  const handleSendMessage = useCallback(
    (conversationId: string, content: string, type: MessageType, attachment?: File) => {
      if (!currentOperator) return

      const newMessage: Message = {
        id: `msg-${Date.now()}`,
        conversationId,
        direction: "outbound",
        type,
        content,
        status: "sending",
        timestamp: new Date(),
        operatorId: currentOperator.id,
        operatorName: currentOperator.name,
        ...(attachment && {
          attachment: {
            type: type === "image" ? "image" : "document",
            url: URL.createObjectURL(attachment),
            filename: attachment.name,
            size: attachment.size,
          },
        }),
      }

      // Add message to conversation
      setConversations((prev) =>
        prev.map((c) =>
          c.id === conversationId
            ? {
                ...c,
                messages: [...c.messages, newMessage],
                lastMessageAt: new Date(),
                lastMessagePreview: content || `[${type}]`,
                updatedAt: new Date(),
              }
            : c
        )
      )

      // Simulate message status updates
      setTimeout(() => {
        setConversations((prev) =>
          prev.map((c) =>
            c.id === conversationId
              ? {
                  ...c,
                  messages: c.messages.map((m) =>
                    m.id === newMessage.id ? { ...m, status: "sent" } : m
                  ),
                }
              : c
          )
        )
      }, 500)

      setTimeout(() => {
        setConversations((prev) =>
          prev.map((c) =>
            c.id === conversationId
              ? {
                  ...c,
                  messages: c.messages.map((m) =>
                    m.id === newMessage.id ? { ...m, status: "delivered" } : m
                  ),
                }
              : c
          )
        )
      }, 1500)

      setTimeout(() => {
        setConversations((prev) =>
          prev.map((c) =>
            c.id === conversationId
              ? {
                  ...c,
                  messages: c.messages.map((m) =>
                    m.id === newMessage.id ? { ...m, status: "read" } : m
                  ),
                }
              : c
          )
        )
      }, 3000)

      // Simulate customer typing and response (50% chance)
      if (Math.random() > 0.5) {
        setTimeout(() => {
          setTypingConversations((prev) => new Set([...prev, conversationId]))
        }, 4000)

        setTimeout(() => {
          setTypingConversations((prev) => {
            const next = new Set(prev)
            next.delete(conversationId)
            return next
          })

          const responses = [
            "Thanks for your help!",
            "I understand, thank you.",
            "That makes sense.",
            "Great, I'll do that.",
            "Perfect, thanks!",
          ]
          const randomResponse = responses[Math.floor(Math.random() * responses.length)]

          const responseMessage: Message = {
            id: `msg-${Date.now()}`,
            conversationId,
            direction: "inbound",
            type: "text",
            content: randomResponse,
            status: "read",
            timestamp: new Date(),
          }

          setConversations((prev) =>
            prev.map((c) =>
              c.id === conversationId
                ? {
                    ...c,
                    messages: [...c.messages, responseMessage],
                    lastMessageAt: new Date(),
                    lastMessagePreview: randomResponse,
                    unreadCount: c.id === selectedConversationId ? 0 : c.unreadCount + 1,
                    updatedAt: new Date(),
                  }
                : c
            )
          )
        }, 7000)
      }
    },
    [currentOperator, selectedConversationId]
  )

  // Handle add note
  const handleAddNote = useCallback(
    (request: CreateNoteRequest) => {
      const currentOp = operators.find((op) => op.id === currentOperator?.id)
      if (!currentOp) return

      const newNote: Note = {
        id: `note-${Date.now()}`,
        ...request,
        authorId: currentOp.id,
        authorName: currentOp.name,
        authorAvatar: currentOp.avatar,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      setNotes((prev) => [newNote, ...prev])

      // Hook for future notifications
      if (request.mentions.length > 0) {
        console.log("Note mentions (for future notifications):", request.mentions)
      }
    },
    [operators, currentOperator?.id]
  )

  // Handle update note
  const handleUpdateNote = useCallback((request: UpdateNoteRequest) => {
    setNotes((prev) =>
      prev.map((note) =>
        note.id === request.id
          ? { ...note, content: request.content, mentions: request.mentions, updatedAt: new Date() }
          : note
      )
    )
  }, [])

  // Handle delete note
  const handleDeleteNote = useCallback((noteId: string) => {
    setNotes((prev) => prev.filter((note) => note.id !== noteId))
  }, [])

  // Handle note filter change
  const handleNoteFilterChange = useCallback((filter: NoteFilterScope) => {
    setNoteFilter(filter)
  }, [])

  // Check if selected conversation has typing indicator
  const isTyping = selectedConversationId
    ? typingConversations.has(selectedConversationId)
    : false

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
