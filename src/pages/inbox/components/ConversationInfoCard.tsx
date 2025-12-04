import { Calendar, Clock, MessageSquare, User } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Conversation } from "../types"
import { ConversationStatusBadge } from "./ConversationStatusBadge"

interface ConversationInfoCardProps {
  conversation: Conversation
  className?: string
}

/**
 * Formats a date for display in the conversation info card.
 */
function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date)
}

/**
 * Formats a relative time string (e.g., "5 minutes ago").
 */
function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMinutes = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMinutes < 1) {
    return "Just now"
  }
  if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} ago`
  }
  if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`
  }
  return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`
}

interface InfoRowProps {
  icon: React.ComponentType<{ className?: string }>
  label: string
  children: React.ReactNode
}

function InfoRow({ icon: Icon, label, children }: InfoRowProps) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="mt-0.5 text-sm">{children}</div>
      </div>
    </div>
  )
}

/**
 * ConversationInfoCard displays metadata about a conversation.
 * Shows status, assigned operator, creation date, last activity, and message count.
 */
export function ConversationInfoCard({
  conversation,
  className,
}: ConversationInfoCardProps) {
  const messageCount = conversation.messages.length

  return (
    <div className={cn("space-y-4", className)}>
      <InfoRow icon={Clock} label="Status">
        <ConversationStatusBadge status={conversation.status} />
      </InfoRow>

      <InfoRow icon={User} label="Assigned To">
        {conversation.assignedToName ? (
          <span className="font-medium">{conversation.assignedToName}</span>
        ) : (
          <span className="text-muted-foreground">Unassigned</span>
        )}
      </InfoRow>

      <InfoRow icon={Calendar} label="Created">
        <span>{formatDate(conversation.createdAt)}</span>
      </InfoRow>

      <InfoRow icon={Clock} label="Last Activity">
        <span title={formatDate(conversation.lastMessageAt)}>
          {formatRelativeTime(conversation.lastMessageAt)}
        </span>
      </InfoRow>

      <InfoRow icon={MessageSquare} label="Messages">
        <span>
          {messageCount} message{messageCount === 1 ? "" : "s"}
        </span>
      </InfoRow>
    </div>
  )
}
