import { useState, useCallback, useRef, useEffect } from "react"

interface UseCopyToClipboardReturn {
  copy: (text: string) => Promise<boolean>
  copied: boolean
  error: Error | null
  reset: () => void
}

/**
 * Hook for copying text to clipboard with feedback state.
 *
 * Features:
 * - Async copy operation with success/error tracking
 * - Auto-reset of copied state after timeout
 * - Proper cleanup on unmount
 */
export function useCopyToClipboard(
  resetDelay = 2000
): UseCopyToClipboardReturn {
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedRef = useRef(true)

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const reset = useCallback(() => {
    setCopied(false)
    setError(null)
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  const copy = useCallback(
    async (text: string): Promise<boolean> => {
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }

      try {
        // Check for clipboard API support
        if (!navigator.clipboard) {
          throw new Error("Clipboard API not supported")
        }

        await navigator.clipboard.writeText(text)

        if (!mountedRef.current) return false

        setCopied(true)
        setError(null)

        // Auto-reset after delay
        timeoutRef.current = setTimeout(() => {
          if (mountedRef.current) {
            setCopied(false)
          }
        }, resetDelay)

        return true
      } catch (err) {
        if (!mountedRef.current) return false

        const errorObj =
          err instanceof Error ? err : new Error("Failed to copy to clipboard")
        setError(errorObj)
        setCopied(false)

        return false
      }
    },
    [resetDelay]
  )

  return { copy, copied, error, reset }
}
