import { useCallback } from "react"
import type { Conversation, ConversationStatus, Operator } from "../types"
import { ChatHeader } from "./ChatHeader"
import { MessageList } from "./MessageList"
import { MessageInput, type SendMessagePayload } from "./MessageInput"
import { cn } from "@/lib/utils"

interface ChatWindowProps {
  conversation: Conversation | null
  operators: Operator[]
  currentOperatorId: string
  isTyping?: boolean
  onPickUp: (conversationId: string) => void
  onRelease: (conversationId: string) => void
  onAssign: (conversationId: string, operatorId: string) => void
  onStatusChange: (conversationId: string, status: ConversationStatus) => void
  onSendMessage: (conversationId: string, payload: SendMessagePayload) => void
  className?: string
}

export function ChatWindow({
  conversation,
  operators,
  currentOperatorId,
  isTyping = false,
  onPickUp,
  onRelease,
  onAssign,
  onStatusChange,
  onSendMessage,
  className,
}: ChatWindowProps) {
  const handlePickUp = useCallback(() => {
    if (conversation) {
      onPickUp(conversation.id)
    }
  }, [conversation, onPickUp])

  const handleRelease = useCallback(() => {
    if (conversation) {
      onRelease(conversation.id)
    }
  }, [conversation, onRelease])

  const handleAssign = useCallback(
    (operatorId: string) => {
      if (conversation) {
        onAssign(conversation.id, operatorId)
      }
    },
    [conversation, onAssign]
  )

  const handleStatusChange = useCallback(
    (status: ConversationStatus) => {
      if (conversation) {
        onStatusChange(conversation.id, status)
      }
    },
    [conversation, onStatusChange]
  )

  const handleSendMessage = useCallback(
    (payload: SendMessagePayload) => {
      if (conversation) {
        onSendMessage(conversation.id, payload)
      }
    },
    [conversation, onSendMessage]
  )

  // Check if current operator can send messages
  const canSendMessages =
    conversation &&
    (conversation.assignedToId === currentOperatorId ||
      conversation.status === "unassigned")

  if (!conversation) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center h-full bg-muted/30",
          className
        )}
      >
        <div className="text-center space-y-2">
          <div className="text-6xl mb-4">💬</div>
          <h3 className="text-lg font-medium text-muted-foreground">
            No conversation selected
          </h3>
          <p className="text-sm text-muted-foreground">
            Select a conversation from the list to start chatting
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header */}
      <ChatHeader
        conversation={conversation}
        operators={operators}
        currentOperatorId={currentOperatorId}
        onPickUp={handlePickUp}
        onRelease={handleRelease}
        onAssign={handleAssign}
        onStatusChange={handleStatusChange}
      />

      {/* Messages */}
      <div className="flex-1 overflow-hidden">
        <MessageList
          messages={conversation.messages}
          isTyping={isTyping}
          className="h-full"
        />
      </div>

      {/* Input */}
      <div className="border-t bg-background p-3">
        {canSendMessages ? (
          <MessageInput
            onSend={handleSendMessage}
            disabled={conversation.status === "closed" || conversation.status === "resolved"}
            placeholder={
              conversation.status === "closed" || conversation.status === "resolved"
                ? "This conversation is closed"
                : "Type a message..."
            }
          />
        ) : (
          <div className="text-center py-4 text-sm text-muted-foreground">
            This conversation is assigned to {conversation.assignedToName}.
            <br />
            Pick up or take over to respond.
          </div>
        )}
      </div>
    </div>
  )
}
