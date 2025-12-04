import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { ConversationStatus } from "../types"

interface ConversationStatusBadgeProps {
  status: ConversationStatus
  className?: string
}

/**
 * Status-specific styling configuration.
 * Maps conversation status to Tailwind classes for consistent visual representation.
 */
const STATUS_STYLES: Record<ConversationStatus, string> = {
  unassigned: "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800",
  active: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800",
  waiting: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800",
  resolved: "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800/50 dark:text-gray-400 dark:border-gray-700",
  closed: "bg-gray-100 text-gray-500 border-gray-200 dark:bg-gray-800/50 dark:text-gray-500 dark:border-gray-700",
}

const STATUS_LABELS: Record<ConversationStatus, string> = {
  unassigned: "Unassigned",
  active: "Active",
  waiting: "Waiting",
  resolved: "Resolved",
  closed: "Closed",
}

export function ConversationStatusBadge({
  status,
  className,
}: ConversationStatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(STATUS_STYLES[status], className)}
    >
      {STATUS_LABELS[status]}
    </Badge>
  )
}
