import { useEffect, useRef, useState, useCallback } from "react"

export interface UseSSEOptions {
  endpoint: string
  enabled?: boolean
  onMessage?: (event: MessageEvent) => void
  onError?: (error: Event) => void
  reconnectInterval?: number
  maxReconnectAttempts?: number
}

export interface UseSSEReturn {
  isConnected: boolean
  lastEvent: MessageEvent | null
  error: Event | null
  reconnectAttempts: number
}

/**
 * Generic hook for Server-Sent Events (SSE) connections.
 *
 * Handles:
 * - Automatic connection management
 * - Reconnection on disconnect with exponential backoff
 * - Proper cleanup on unmount
 * - Connection state tracking
 */
export function useSSE({
  endpoint,
  enabled = true,
  onMessage,
  onError,
  reconnectInterval = 3000,
  maxReconnectAttempts = 5,
}: UseSSEOptions): UseSSEReturn {
  const [isConnected, setIsConnected] = useState(false)
  const [lastEvent, setLastEvent] = useState<MessageEvent | null>(null)
  const [error, setError] = useState<Event | null>(null)
  const [reconnectAttempts, setReconnectAttempts] = useState(0)

  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedRef = useRef(true)

  // Store callbacks in refs to avoid effect dependencies
  const onMessageRef = useRef(onMessage)
  const onErrorRef = useRef(onError)

  useEffect(() => {
    onMessageRef.current = onMessage
    onErrorRef.current = onError
  }, [onMessage, onError])

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

  const connect = useCallback(() => {
    if (!enabled || !mountedRef.current) return

    cleanup()

    const eventSource = new EventSource(endpoint)
    eventSourceRef.current = eventSource

    eventSource.onopen = () => {
      if (!mountedRef.current) return
      setIsConnected(true)
      setError(null)
      setReconnectAttempts(0)
    }

    eventSource.onmessage = (event: MessageEvent) => {
      if (!mountedRef.current) return
      setLastEvent(event)
      onMessageRef.current?.(event)
    }

    eventSource.onerror = (errorEvent: Event) => {
      if (!mountedRef.current) return

      setIsConnected(false)
      setError(errorEvent)
      onErrorRef.current?.(errorEvent)

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
  }, [endpoint, enabled, reconnectInterval, maxReconnectAttempts, cleanup])

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

  // Reconnect when endpoint changes
  useEffect(() => {
    if (enabled && eventSourceRef.current) {
      connect()
    }
  }, [endpoint, enabled, connect])

  return {
    isConnected,
    lastEvent,
    error,
    reconnectAttempts,
  }
}
