import { Clock, Check, CheckCheck, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import type { MessageStatus } from "../types"

interface MessageStatusIndicatorProps {
  status: MessageStatus
  className?: string
}

/**
 * WhatsApp-style message status indicator using tick marks.
 * - sending: clock icon (pending)
 * - sent: single gray check
 * - delivered: double gray check
 * - read: double blue check
 * - failed: red exclamation circle
 */
export function MessageStatusIndicator({
  status,
  className,
}: MessageStatusIndicatorProps) {
  const baseClasses = "size-4 shrink-0"

  switch (status) {
    case "sending":
      return (
        <Clock
          className={cn(baseClasses, "text-muted-foreground", className)}
          aria-label="Sending"
        />
      )
    case "sent":
      return (
        <Check
          className={cn(baseClasses, "text-muted-foreground", className)}
          aria-label="Sent"
        />
      )
    case "delivered":
      return (
        <CheckCheck
          className={cn(baseClasses, "text-muted-foreground", className)}
          aria-label="Delivered"
        />
      )
    case "read":
      return (
        <CheckCheck
          className={cn(baseClasses, "text-blue-500", className)}
          aria-label="Read"
        />
      )
    case "failed":
      return (
        <AlertCircle
          className={cn(baseClasses, "text-destructive", className)}
          aria-label="Failed to send"
        />
      )
    default:
      return null
  }
}
