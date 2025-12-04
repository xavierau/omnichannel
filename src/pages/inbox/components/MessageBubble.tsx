import { cn } from "@/lib/utils"
import type { Message } from "../types"
import { MessageStatusIndicator } from "./MessageStatusIndicator"
import { AttachmentPreview } from "./AttachmentPreview"

interface MessageBubbleProps {
  message: Message
  showOperatorName?: boolean
}

/**
 * WhatsApp-style message bubble component.
 * Handles different message types: text, image, document, audio, template, and system.
 * Inbound messages appear on the left with gray background.
 * Outbound messages appear on the right with green background.
 * System messages are centered with no bubble.
 */
export function MessageBubble({
  message,
  showOperatorName = false,
}: MessageBubbleProps) {
  const { direction, type, content, attachment, timestamp, status } = message

  // System messages have special centered styling
  if (type === "system") {
    return <SystemMessage content={content} timestamp={timestamp} />
  }

  const isInbound = direction === "inbound"

  return (
    <div
      className={cn(
        "flex w-full",
        isInbound ? "justify-start" : "justify-end"
      )}
    >
      <div
        className={cn(
          "max-w-[75%] md:max-w-[65%]",
          "flex flex-col"
        )}
      >
        {/* Operator name for outbound messages */}
        {!isInbound && showOperatorName && message.operatorName && (
          <span className="text-xs text-muted-foreground mb-1 self-end">
            {message.operatorName}
          </span>
        )}

        {/* Message bubble */}
        <div
          className={cn(
            "relative rounded-lg px-3 py-2",
            "break-words",
            isInbound
              ? "bg-muted text-foreground rounded-tl-none"
              : "bg-emerald-500 text-white rounded-tr-none"
          )}
        >
          {/* Template indicator */}
          {type === "template" && message.templateName && (
            <div
              className={cn(
                "text-xs font-medium mb-1 pb-1 border-b",
                isInbound
                  ? "border-border text-muted-foreground"
                  : "border-white/30 text-white/80"
              )}
            >
              Template: {message.templateName}
            </div>
          )}

          {/* Attachment preview */}
          {attachment && (
            <div className="mb-2">
              <AttachmentPreview attachment={attachment} direction={direction} />
            </div>
          )}

          {/* Text content */}
          {content && (
            <p className="whitespace-pre-wrap text-sm leading-relaxed">
              {content}
            </p>
          )}

          {/* Timestamp and status indicator */}
          <div
            className={cn(
              "flex items-center justify-end gap-1 mt-1",
              isInbound ? "text-muted-foreground" : "text-white/70"
            )}
          >
            <span className="text-[10px]">
              {formatMessageTime(timestamp)}
            </span>
            {!isInbound && (
              <MessageStatusIndicator
                status={status}
                className={cn(
                  "size-3.5",
                  status === "read" && "text-blue-200",
                  status !== "read" && status !== "failed" && "text-white/70",
                  status === "failed" && "text-red-200"
                )}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * System message component - centered, italicized, no bubble.
 */
function SystemMessage({
  content,
  timestamp,
}: {
  content: string
  timestamp: Date
}) {
  return (
    <div className="flex justify-center my-2">
      <div className="bg-muted/50 rounded-lg px-3 py-1.5 max-w-[80%]">
        <p className="text-xs text-muted-foreground italic text-center">
          {content}
        </p>
        <p className="text-[10px] text-muted-foreground/70 text-center mt-0.5">
          {formatMessageTime(timestamp)}
        </p>
      </div>
    </div>
  )
}

/**
 * Formats a timestamp for display in the message bubble.
 * Shows time in HH:MM format.
 */
function formatMessageTime(date: Date): string {
  const d = date instanceof Date ? date : new Date(date)
  return d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
}
