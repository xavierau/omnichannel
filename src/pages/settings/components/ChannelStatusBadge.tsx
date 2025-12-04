import { cn } from "@/lib/utils"
import type { ChannelStatus } from "../types"

interface ChannelStatusBadgeProps {
  status: ChannelStatus
  className?: string
}

const statusConfig: Record<ChannelStatus, { label: string; className: string }> = {
  connected: {
    label: "Connected",
    className: "bg-emerald-500/15 text-emerald-600 border-emerald-500/25",
  },
  not_connected: {
    label: "Not Connected",
    className: "bg-slate-500/15 text-slate-600 border-slate-500/25",
  },
  error: {
    label: "Error",
    className: "bg-red-500/15 text-red-600 border-red-500/25",
  },
}

export function ChannelStatusBadge({ status, className }: ChannelStatusBadgeProps) {
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
