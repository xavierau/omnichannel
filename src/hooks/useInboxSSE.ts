import { useEffect, useRef, useState, useCallback } from 'react'
import type {
  Conversation,
  Message,
  InboxNote,
  ConversationStatus,
  MessageDeliveryStatus,
} from '@/services/inbox.service'

// ============================================================================
// Types
// ============================================================================

export interface ConversationNewEvent {
  conversation: Conversation
}

export interface MessageNewEvent {
  conversationId: string
  message: Message
}

export interface MessageStatusEvent {
  conversationId: string
  messageId: string
  status: MessageDeliveryStatus
  timestamp: string
}

export interface ConversationAssignedEvent {
  conversationId: string
  assignedToId: string | null
  assignedBy: string | null
}

export interface StatusChangedEvent {
  conversationId: string
  status: ConversationStatus
  previousStatus: ConversationStatus
}

export interface UnreadUpdatedEvent {
  conversationId: string
  unreadCount: number
}

export interface NoteCreatedEvent {
  conversationId: string
  note: InboxNote
}

export interface NoteUpdatedEvent {
  noteId: string
  note: InboxNote
}

export interface NoteDeletedEvent {
  noteId: string
  conversationId: string
}

export interface UseInboxSSEOptions {
  enabled?: boolean
  reconnectInterval?: number
  maxReconnectAttempts?: number
  onConversationNew?: (event: ConversationNewEvent) => void
  onMessageNew?: (event: MessageNewEvent) => void
  onMessageStatus?: (event: MessageStatusEvent) => void
  onConversationAssigned?: (event: ConversationAssignedEvent) => void
  onStatusChanged?: (event: StatusChangedEvent) => void
  onUnreadUpdated?: (event: UnreadUpdatedEvent) => void
  onNoteCreated?: (event: NoteCreatedEvent) => void
  onNoteUpdated?: (event: NoteUpdatedEvent) => void
  onNoteDeleted?: (event: NoteDeletedEvent) => void
  onError?: (error: Event) => void
}

export interface UseInboxSSEReturn {
  isConnected: boolean
  error: Event | null
  reconnectAttempts: number
}

// ============================================================================
// SSE Event Names
// ============================================================================

const SSE_EVENTS = {
  CONVERSATION_NEW: 'conversation:new',
  MESSAGE_NEW: 'message:new',
  MESSAGE_STATUS: 'message:status',
  CONVERSATION_ASSIGNED: 'conversation:assigned',
  STATUS_CHANGED: 'conversation:status',
  UNREAD_UPDATED: 'conversation:unread',
  NOTE_CREATED: 'note:created',
  NOTE_UPDATED: 'note:updated',
  NOTE_DELETED: 'note:deleted',
} as const

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook for subscribing to inbox SSE events.
 *
 * Handles:
 * - Automatic connection management with authentication
 * - Named event listeners for typed event handling
 * - Reconnection with exponential backoff
 * - Proper cleanup on unmount
 * - Connection state tracking
 *
 * @example
 * ```tsx
 * const { isConnected, error } = useInboxSSE({
 *   enabled: true,
 *   onMessageNew: (event) => {
 *     console.log('New message:', event.message)
 *   },
 *   onConversationNew: (event) => {
 *     console.log('New conversation:', event.conversation)
 *   },
 * })
 * ```
 */
export function useInboxSSE({
  enabled = true,
  reconnectInterval = 3000,
  maxReconnectAttempts = 5,
  onConversationNew,
  onMessageNew,
  onMessageStatus,
  onConversationAssigned,
  onStatusChanged,
  onUnreadUpdated,
  onNoteCreated,
  onNoteUpdated,
  onNoteDeleted,
  onError,
}: UseInboxSSEOptions = {}): UseInboxSSEReturn {
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<Event | null>(null)
  const [reconnectAttempts, setReconnectAttempts] = useState(0)

  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedRef = useRef(true)

  // Store callbacks in refs to avoid effect dependencies
  const callbacksRef = useRef({
    onConversationNew,
    onMessageNew,
    onMessageStatus,
    onConversationAssigned,
    onStatusChanged,
    onUnreadUpdated,
    onNoteCreated,
    onNoteUpdated,
    onNoteDeleted,
    onError,
  })

  // Update callback refs when they change
  useEffect(() => {
    callbacksRef.current = {
      onConversationNew,
      onMessageNew,
      onMessageStatus,
      onConversationAssigned,
      onStatusChanged,
      onUnreadUpdated,
      onNoteCreated,
      onNoteUpdated,
      onNoteDeleted,
      onError,
    }
  }, [
    onConversationNew,
    onMessageNew,
    onMessageStatus,
    onConversationAssigned,
    onStatusChanged,
    onUnreadUpdated,
    onNoteCreated,
    onNoteUpdated,
    onNoteDeleted,
    onError,
  ])

  const cleanup = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
  }, [])

  /**
   * Parse event data safely, handling malformed JSON
   */
  const parseEventData = useCallback(<T>(event: MessageEvent): T | null => {
    try {
      return JSON.parse(event.data) as T
    } catch {
      console.error('Failed to parse SSE event data:', event.data)
      return null
    }
  }, [])

  const connect = useCallback(() => {
    if (!enabled || !mountedRef.current) return

    cleanup()

    // Build SSE URL with auth token
    const token = localStorage.getItem('auth_token')
    const sseUrl = token
      ? `/api/inbox/stream?token=${encodeURIComponent(token)}`
      : '/api/inbox/stream'

    const eventSource = new EventSource(sseUrl)
    eventSourceRef.current = eventSource

    // Connection opened
    eventSource.onopen = () => {
      if (!mountedRef.current) return
      setIsConnected(true)
      setError(null)
      setReconnectAttempts(0)
    }

    // Register named event listeners
    eventSource.addEventListener(SSE_EVENTS.CONVERSATION_NEW, (event) => {
      if (!mountedRef.current) return
      const data = parseEventData<ConversationNewEvent>(event)
      if (data) callbacksRef.current.onConversationNew?.(data)
    })

    eventSource.addEventListener(SSE_EVENTS.MESSAGE_NEW, (event) => {
      if (!mountedRef.current) return
      const data = parseEventData<MessageNewEvent>(event)
      if (data) callbacksRef.current.onMessageNew?.(data)
    })

    eventSource.addEventListener(SSE_EVENTS.MESSAGE_STATUS, (event) => {
      if (!mountedRef.current) return
      const data = parseEventData<MessageStatusEvent>(event)
      if (data) callbacksRef.current.onMessageStatus?.(data)
    })

    eventSource.addEventListener(SSE_EVENTS.CONVERSATION_ASSIGNED, (event) => {
      if (!mountedRef.current) return
      const data = parseEventData<ConversationAssignedEvent>(event)
      if (data) callbacksRef.current.onConversationAssigned?.(data)
    })

    eventSource.addEventListener(SSE_EVENTS.STATUS_CHANGED, (event) => {
      if (!mountedRef.current) return
      const data = parseEventData<StatusChangedEvent>(event)
      if (data) callbacksRef.current.onStatusChanged?.(data)
    })

    eventSource.addEventListener(SSE_EVENTS.UNREAD_UPDATED, (event) => {
      if (!mountedRef.current) return
      const data = parseEventData<UnreadUpdatedEvent>(event)
      if (data) callbacksRef.current.onUnreadUpdated?.(data)
    })

    eventSource.addEventListener(SSE_EVENTS.NOTE_CREATED, (event) => {
      if (!mountedRef.current) return
      const data = parseEventData<NoteCreatedEvent>(event)
      if (data) callbacksRef.current.onNoteCreated?.(data)
    })

    eventSource.addEventListener(SSE_EVENTS.NOTE_UPDATED, (event) => {
      if (!mountedRef.current) return
      const data = parseEventData<NoteUpdatedEvent>(event)
      if (data) callbacksRef.current.onNoteUpdated?.(data)
    })

    eventSource.addEventListener(SSE_EVENTS.NOTE_DELETED, (event) => {
      if (!mountedRef.current) return
      const data = parseEventData<NoteDeletedEvent>(event)
      if (data) callbacksRef.current.onNoteDeleted?.(data)
    })

    // Error handling with reconnection
    eventSource.onerror = (errorEvent: Event) => {
      if (!mountedRef.current) return

      setIsConnected(false)
      setError(errorEvent)
      callbacksRef.current.onError?.(errorEvent)

      // Close the current connection
      eventSource.close()
      eventSourceRef.current = null

      // Attempt reconnection with exponential backoff
      setReconnectAttempts((prev) => {
        const newAttempts = prev + 1
        if (newAttempts <= maxReconnectAttempts) {
          const delay = reconnectInterval * Math.pow(2, newAttempts - 1)
          reconnectTimeoutRef.current = setTimeout(() => {
            if (mountedRef.current) {
              connect()
            }
          }, delay)
        }
        return newAttempts
      })
    }
  }, [enabled, reconnectInterval, maxReconnectAttempts, cleanup, parseEventData])

  // Initial connection and cleanup
  useEffect(() => {
    mountedRef.current = true

    if (enabled) {
      connect()
    }

    return () => {
      mountedRef.current = false
      cleanup()
      setIsConnected(false)
    }
  }, [enabled, connect, cleanup])

  return {
    isConnected,
    error,
    reconnectAttempts,
  }
}
