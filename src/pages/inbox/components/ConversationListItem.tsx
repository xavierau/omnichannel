import { memo, useCallback } from "react"
import { formatDistanceToNow } from "date-fns"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { Conversation, ConversationStatus } from "../types"
import { ChannelBadge } from "./ChannelBadge"

interface ConversationListItemProps {
  conversation: Conversation
  isSelected: boolean
  onClick: () => void
}

/**
 * Status indicator colors for the small dot indicator.
 */
const STATUS_DOT_COLORS: Record<ConversationStatus, string> = {
  unassigned: "bg-yellow-500",
  active: "bg-green-500",
  waiting: "bg-blue-500",
  resolved: "bg-gray-400",
  closed: "bg-gray-400",
}

/**
 * Extracts initials from customer name for avatar fallback.
 */
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase()
  }
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

/**
 * Truncates text to a maximum length with ellipsis.
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength).trim() + "..."
}

/**
 * Formats the timestamp to a human-readable relative format.
 * Uses abbreviated format for cleaner display.
 */
function formatTimestamp(date: Date): string {
  return formatDistanceToNow(date, { addSuffix: false })
    .replace("about ", "")
    .replace(" minutes", "m")
    .replace(" minute", "m")
    .replace(" hours", "h")
    .replace(" hour", "h")
    .replace(" days", "d")
    .replace(" day", "d")
    .replace(" months", "mo")
    .replace(" month", "mo")
    .replace("less than a minute", "now")
}

/**
 * WhatsApp Web-style conversation list item.
 * Displays customer info, last message preview, timestamp, and unread count.
 * Memoized to prevent unnecessary re-renders in large lists.
 */
export const ConversationListItem = memo(function ConversationListItem({
  conversation,
  isSelected,
  onClick,
}: ConversationListItemProps) {
  const {
    customerName,
    customerWhatsappNumber,
    customerAvatar,
    lastMessagePreview,
    lastMessageAt,
    unreadCount,
    status,
  } = conversation

  const initials = getInitials(customerName)
  const timestamp = formatTimestamp(lastMessageAt)
  const preview = truncateText(lastMessagePreview, 50)

  const handleClick = useCallback(() => {
    onClick()
  }, [onClick])

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault()
        onClick()
      }
    },
    [onClick]
  )

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={cn(
        "flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors",
        "hover:bg-accent/50 focus-visible:bg-accent/50 focus-visible:outline-none",
        "border-b border-border/50",
        isSelected && "bg-accent"
      )}
      aria-selected={isSelected}
    >
      {/* Customer Avatar */}
      <div className="relative flex-shrink-0">
        <Avatar className="size-12">
          {customerAvatar && (
            <AvatarImage src={customerAvatar} alt={customerName} />
          )}
          <AvatarFallback className="text-sm font-medium bg-muted">
            {initials}
          </AvatarFallback>
        </Avatar>
        {/* Status indicator dot */}
        <span
          className={cn(
            "absolute bottom-0 right-0 size-3 rounded-full ring-2 ring-background",
            STATUS_DOT_COLORS[status]
          )}
          aria-label={`Status: ${status}`}
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Header row: Name and timestamp */}
        <div className="flex items-center justify-between gap-2">
          <span
            className={cn(
              "font-medium text-sm truncate",
              unreadCount > 0 && "font-semibold"
            )}
          >
            {customerName}
          </span>
          <span
            className={cn(
              "text-xs flex-shrink-0",
              unreadCount > 0 ? "text-primary font-medium" : "text-muted-foreground"
            )}
          >
            {timestamp}
          </span>
        </div>

        {/* Channel badge and phone number */}
        <div className="flex items-center gap-2 mt-0.5">
          <ChannelBadge
            channelAccount={conversation.channelAccount}
            variant="compact"
            showTooltip
          />
          <span className="text-xs text-muted-foreground truncate">
            {customerWhatsappNumber}
          </span>
        </div>

        {/* Message preview row */}
        <div className="flex items-center justify-between gap-2 mt-1">
          <span
            className={cn(
              "text-sm truncate",
              unreadCount > 0
                ? "text-foreground font-medium"
                : "text-muted-foreground"
            )}
          >
            {preview}
          </span>

          {/* Unread count badge */}
          {unreadCount > 0 && (
            <Badge
              className="flex-shrink-0 bg-primary text-primary-foreground text-xs px-1.5 py-0 h-5 min-w-5 justify-center"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </div>
      </div>
    </div>
  )
})
