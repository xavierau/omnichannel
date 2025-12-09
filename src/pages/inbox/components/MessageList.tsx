import { useRef, useEffect, useMemo, useCallback } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import type { Message } from "../types"
import { MessageBubble } from "./MessageBubble"
import { TypingIndicator } from "./TypingIndicator"

interface MessageListProps {
  messages: Message[]
  isTyping?: boolean
  className?: string
}

/**
 * Scrollable message list component with date separators.
 * Auto-scrolls to bottom when new messages arrive or typing indicator appears.
 * Groups messages by date with formatted date headers.
 */
export function MessageList({
  messages,
  isTyping = false,
  className,
}: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const prevMessageCountRef = useRef(messages.length)
  const prevIsTypingRef = useRef(isTyping)

  // Group messages by date for rendering with separators
  const groupedMessages = useMemo(
    () => groupMessagesByDate(messages),
    [messages]
  )

  // Scroll to bottom function
  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior, block: "end" })
    }
  }, [])

  // Auto-scroll when new messages arrive or typing indicator appears
  useEffect(() => {
    const hasNewMessages = messages.length > prevMessageCountRef.current
    const typingJustStarted = isTyping && !prevIsTypingRef.current

    if (hasNewMessages || typingJustStarted) {
      // Use smooth scroll for new messages, instant for initial load
      const behavior = prevMessageCountRef.current === 0 ? "instant" : "smooth"
      scrollToBottom(behavior)
    }

    prevMessageCountRef.current = messages.length
    prevIsTypingRef.current = isTyping
  }, [messages.length, isTyping, scrollToBottom])

  // Initial scroll to bottom on mount
  useEffect(() => {
    scrollToBottom("instant")
  }, [scrollToBottom])

  return (
    <ScrollArea className={cn("h-full", className)}>
      <div className="flex flex-col gap-2 p-4">
        {groupedMessages.map((group) => (
          <DateGroup key={group.date} date={group.date} messages={group.messages} />
        ))}

        {isTyping && <TypingIndicator className="mt-2" />}

        {/* Scroll anchor */}
        <div ref={scrollRef} aria-hidden="true" />
      </div>
    </ScrollArea>
  )
}

interface DateGroupProps {
  date: string
  messages: Message[]
}

/**
 * Renders a group of messages for a single date with a date separator.
 */
function DateGroup({ date, messages }: DateGroupProps) {
  return (
    <div className="flex flex-col gap-2">
      <DateSeparator date={date} />
      {messages.map((message) => (
        <MessageBubble
          key={message.id}
          message={message}
          showOperatorName={message.direction === "outbound"}
        />
      ))}
    </div>
  )
}

interface DateSeparatorProps {
  date: string
}

/**
 * Sticky date separator between message groups.
 */
function DateSeparator({ date }: DateSeparatorProps) {
  return (
    <div className="flex justify-center sticky top-0 z-10 py-2">
      <span className="bg-muted/80 backdrop-blur-sm text-muted-foreground text-xs font-medium px-3 py-1 rounded-full shadow-sm">
        {date}
      </span>
    </div>
  )
}

interface MessageGroup {
  date: string
  messages: Message[]
}

/**
 * Groups messages by date for rendering with date separators.
 * Returns an array of groups, each containing a formatted date and its messages.
 * Messages are sorted in ascending order (oldest first) for proper chat display.
 */
function groupMessagesByDate(messages: Message[]): MessageGroup[] {
  // Sort messages by timestamp ascending (oldest first) for proper chat order
  const sortedMessages = [...messages].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  )

  const groups: Map<string, Message[]> = new Map()

  sortedMessages.forEach((message) => {
    const dateKey = formatDateKey(message.timestamp)
    const existing = groups.get(dateKey)
    if (existing) {
      existing.push(message)
    } else {
      groups.set(dateKey, [message])
    }
  })

  return Array.from(groups.entries()).map(([date, msgs]) => ({
    date,
    messages: msgs,
  }))
}

/**
 * Formats a date for use as a separator label.
 * Shows "Today", "Yesterday", or the full date for older messages.
 */
function formatDateKey(date: Date): string {
  const d = date instanceof Date ? date : new Date(date)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const messageDate = new Date(d.getFullYear(), d.getMonth(), d.getDate())

  if (messageDate.getTime() === today.getTime()) {
    return "Today"
  }

  if (messageDate.getTime() === yesterday.getTime()) {
    return "Yesterday"
  }

  // For older dates, show the full date
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}
