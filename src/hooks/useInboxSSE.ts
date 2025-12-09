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
  MESSAGE_NEW: 'conversation:message:new',
  MESSAGE_STATUS: 'conversation:message:status',
  CONVERSATION_ASSIGNED: 'conversation:assigned',
  STATUS_CHANGED: 'conversation:status:changed',
  UNREAD_UPDATED: 'conversation:unread:updated',
  NOTE_CREATED: 'note:created',
  NOTE_UPDATED: 'note:updated',
  NOTE_DELETED: 'note:deleted',
} as const

// Debug logging helper
const SSE_DEBUG = true
const sseLog = (message: string, ...args: unknown[]) => {
  if (SSE_DEBUG) {
    console.log(`[SSE] ${message}`, ...args)
  }
}

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
  const connectRef = useRef<() => void>(() => {})

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
    if (!enabled || !mountedRef.current) {
      sseLog('Connect skipped', { enabled, mounted: mountedRef.current })
      return
    }

    cleanup()

    // Build SSE URL with auth token
    const token = localStorage.getItem('auth_token')
    const sseUrl = token
      ? `/api/inbox/stream?token=${encodeURIComponent(token)}`
      : '/api/inbox/stream'

    sseLog('Connecting to SSE', { url: sseUrl, hasToken: !!token })

    const eventSource = new EventSource(sseUrl)
    eventSourceRef.current = eventSource

    // Log readyState changes
    sseLog('EventSource created', { readyState: eventSource.readyState })

    // Connection opened
    eventSource.onopen = () => {
      sseLog('Connection opened', { readyState: eventSource.readyState })
      if (!mountedRef.current) return
      setIsConnected(true)
      setError(null)
      setReconnectAttempts(0)
    }

    // Listen for ALL messages (generic handler for debugging)
    eventSource.onmessage = (event) => {
      sseLog('Generic message received', { type: event.type, data: event.data })
    }

    // Register named event listeners
    sseLog('Registering event listeners for:', Object.values(SSE_EVENTS))

    eventSource.addEventListener(SSE_EVENTS.CONVERSATION_NEW, (event) => {
      sseLog(`Event received: ${SSE_EVENTS.CONVERSATION_NEW}`, event.data)
      if (!mountedRef.current) return
      const data = parseEventData<ConversationNewEvent>(event)
      if (data) callbacksRef.current.onConversationNew?.(data)
    })

    eventSource.addEventListener(SSE_EVENTS.MESSAGE_NEW, (event) => {
      sseLog(`Event received: ${SSE_EVENTS.MESSAGE_NEW}`, event.data)
      if (!mountedRef.current) return
      const data = parseEventData<MessageNewEvent>(event)
      sseLog('Parsed MESSAGE_NEW data:', data)
      if (data) {
        sseLog('Calling onMessageNew callback', { hasCallback: !!callbacksRef.current.onMessageNew })
        callbacksRef.current.onMessageNew?.(data)
      }
    })

    eventSource.addEventListener(SSE_EVENTS.MESSAGE_STATUS, (event) => {
      sseLog(`Event received: ${SSE_EVENTS.MESSAGE_STATUS}`, event.data)
      if (!mountedRef.current) return
      const data = parseEventData<MessageStatusEvent>(event)
      if (data) callbacksRef.current.onMessageStatus?.(data)
    })

    eventSource.addEventListener(SSE_EVENTS.CONVERSATION_ASSIGNED, (event) => {
      sseLog(`Event received: ${SSE_EVENTS.CONVERSATION_ASSIGNED}`, event.data)
      if (!mountedRef.current) return
      const data = parseEventData<ConversationAssignedEvent>(event)
      if (data) callbacksRef.current.onConversationAssigned?.(data)
    })

    eventSource.addEventListener(SSE_EVENTS.STATUS_CHANGED, (event) => {
      sseLog(`Event received: ${SSE_EVENTS.STATUS_CHANGED}`, event.data)
      if (!mountedRef.current) return
      const data = parseEventData<StatusChangedEvent>(event)
      if (data) callbacksRef.current.onStatusChanged?.(data)
    })

    eventSource.addEventListener(SSE_EVENTS.UNREAD_UPDATED, (event) => {
      sseLog(`Event received: ${SSE_EVENTS.UNREAD_UPDATED}`, event.data)
      if (!mountedRef.current) return
      const data = parseEventData<UnreadUpdatedEvent>(event)
      if (data) callbacksRef.current.onUnreadUpdated?.(data)
    })

    eventSource.addEventListener(SSE_EVENTS.NOTE_CREATED, (event) => {
      sseLog(`Event received: ${SSE_EVENTS.NOTE_CREATED}`, event.data)
      if (!mountedRef.current) return
      const data = parseEventData<NoteCreatedEvent>(event)
      if (data) callbacksRef.current.onNoteCreated?.(data)
    })

    eventSource.addEventListener(SSE_EVENTS.NOTE_UPDATED, (event) => {
      sseLog(`Event received: ${SSE_EVENTS.NOTE_UPDATED}`, event.data)
      if (!mountedRef.current) return
      const data = parseEventData<NoteUpdatedEvent>(event)
      if (data) callbacksRef.current.onNoteUpdated?.(data)
    })

    eventSource.addEventListener(SSE_EVENTS.NOTE_DELETED, (event) => {
      sseLog(`Event received: ${SSE_EVENTS.NOTE_DELETED}`, event.data)
      if (!mountedRef.current) return
      const data = parseEventData<NoteDeletedEvent>(event)
      if (data) callbacksRef.current.onNoteDeleted?.(data)
    })

    // Error handling with reconnection
    eventSource.onerror = (errorEvent: Event) => {
      sseLog('Connection error', {
        readyState: eventSource.readyState,
        error: errorEvent
      })
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
          sseLog(`Scheduling reconnect attempt ${newAttempts}/${maxReconnectAttempts} in ${delay}ms`)
          reconnectTimeoutRef.current = setTimeout(() => {
            if (mountedRef.current) {
              sseLog(`Reconnecting... attempt ${newAttempts}`)
              connectRef.current()
            }
          }, delay)
        } else {
          sseLog('Max reconnect attempts reached, giving up')
        }
        return newAttempts
      })
    }
  }, [enabled, reconnectInterval, maxReconnectAttempts, cleanup, parseEventData])

  // Keep connectRef in sync
  useEffect(() => {
    connectRef.current = connect
  }, [connect])

  // Initial connection and cleanup
  useEffect(() => {
    sseLog('Hook mounted', { enabled })
    mountedRef.current = true

    if (enabled) {
      connect()
    }

    return () => {
      sseLog('Hook unmounting, cleaning up')
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
