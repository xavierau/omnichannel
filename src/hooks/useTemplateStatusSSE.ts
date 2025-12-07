import { useCallback, useRef, useEffect } from "react"
import { useSSE } from "./useSSE"

export interface TemplateStatusUpdate {
  templateName: string
  language: string
  oldStatus: string
  newStatus: string
  reason?: string
  timestamp?: string
}

interface UseTemplateStatusSSEOptions {
  enabled?: boolean
}

/**
 * Hook for subscribing to template status updates via SSE.
 *
 * Provides real-time notifications when WhatsApp template statuses change
 * (e.g., from PENDING to APPROVED or REJECTED).
 */
export function useTemplateStatusSSE(
  onStatusChange: (update: TemplateStatusUpdate) => void,
  options: UseTemplateStatusSSEOptions = {}
): { isConnected: boolean; error: Event | null } {
  const { enabled = true } = options

  // Store callback in ref to prevent effect re-runs
  const onStatusChangeRef = useRef(onStatusChange)
  useEffect(() => {
    onStatusChangeRef.current = onStatusChange
  }, [onStatusChange])

  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data) as TemplateStatusUpdate
      onStatusChangeRef.current(data)
    } catch (err) {
      console.error("Failed to parse template status SSE message:", err)
    }
  }, [])

  const handleError = useCallback((error: Event) => {
    console.error("Template status SSE connection error:", error)
  }, [])

  const { isConnected, error } = useSSE({
    endpoint: "/api/templates/status/stream",
    enabled,
    onMessage: handleMessage,
    onError: handleError,
    reconnectInterval: 5000,
    maxReconnectAttempts: 10,
  })

  return { isConnected, error }
}
