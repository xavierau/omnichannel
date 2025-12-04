import { cn } from "@/lib/utils"
import { Check, Clock, X, AlertTriangle, Minus } from "lucide-react"
import type { AggregatedStatus } from "../types"

interface AggregatedStatusBadgeProps {
  status: AggregatedStatus
  className?: string
}

const statusConfig: Record<
  AggregatedStatus,
  { label: string; className: string; icon: React.ElementType }
> = {
  ALL_APPROVED: {
    label: "All Approved",
    className: "bg-emerald-500/15 text-emerald-600 border-emerald-500/25",
    icon: Check,
  },
  SOME_PENDING: {
    label: "Some Pending",
    className: "bg-amber-500/15 text-amber-600 border-amber-500/25",
    icon: Clock,
  },
  SOME_REJECTED: {
    label: "Some Rejected",
    className: "bg-red-500/15 text-red-600 border-red-500/25",
    icon: X,
  },
  MIXED: {
    label: "Mixed",
    className: "bg-orange-500/15 text-orange-600 border-orange-500/25",
    icon: AlertTriangle,
  },
  NO_TRANSLATIONS: {
    label: "No Translations",
    className: "bg-gray-500/15 text-gray-500 border-gray-500/25",
    icon: Minus,
  },
}

export function AggregatedStatusBadge({
  status,
  className,
}: AggregatedStatusBadgeProps) {
  const config = statusConfig[status]
  const Icon = config.icon

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        config.className,
        className
      )}
    >
      <Icon className="size-3" />
      {config.label}
    </span>
  )
}
