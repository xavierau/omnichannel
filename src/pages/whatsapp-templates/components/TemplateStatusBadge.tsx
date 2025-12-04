import { cn } from "@/lib/utils"
import type { TemplateStatus } from "../types"

interface TemplateStatusBadgeProps {
  status: TemplateStatus
  className?: string
}

const statusConfig: Record<TemplateStatus, { label: string; className: string }> = {
  APPROVED: {
    label: "Approved",
    className: "bg-emerald-500/15 text-emerald-600 border-emerald-500/25",
  },
  PENDING: {
    label: "Pending",
    className: "bg-amber-500/15 text-amber-600 border-amber-500/25",
  },
  REJECTED: {
    label: "Rejected",
    className: "bg-red-500/15 text-red-600 border-red-500/25",
  },
}

export function TemplateStatusBadge({ status, className }: TemplateStatusBadgeProps) {
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
