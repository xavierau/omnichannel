import { cn } from "@/lib/utils"
import type { BroadcastStatus } from "../types"

interface BroadcastStatusBadgeProps {
  status: BroadcastStatus
  className?: string
}

const statusConfig: Record<BroadcastStatus, { label: string; className: string }> = {
  DRAFT: {
    label: "Draft",
    className: "bg-slate-500/15 text-slate-600 border-slate-500/25",
  },
  SCHEDULED: {
    label: "Scheduled",
    className: "bg-blue-500/15 text-blue-600 border-blue-500/25",
  },
  SENDING: {
    label: "Sending",
    className: "bg-amber-500/15 text-amber-600 border-amber-500/25 animate-pulse",
  },
  COMPLETED: {
    label: "Completed",
    className: "bg-emerald-500/15 text-emerald-600 border-emerald-500/25",
  },
  PAUSED: {
    label: "Paused",
    className: "bg-orange-500/15 text-orange-600 border-orange-500/25",
  },
  CANCELLED: {
    label: "Cancelled",
    className: "bg-slate-500/15 text-slate-500 border-slate-500/25 line-through",
  },
  FAILED: {
    label: "Failed",
    className: "bg-red-500/15 text-red-600 border-red-500/25",
  },
}

export function BroadcastStatusBadge({ status, className }: BroadcastStatusBadgeProps) {
  const config = statusConfig[status]

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  )
}
