import { cn } from "@/lib/utils"
import type { TemplateQuality } from "../types"

interface TemplateQualityBadgeProps {
  quality: TemplateQuality | undefined
  className?: string
}

const qualityConfig: Record<TemplateQuality, { label: string; className: string }> = {
  HIGH: {
    label: "High",
    className: "bg-emerald-500/15 text-emerald-600 border-emerald-500/25",
  },
  MEDIUM: {
    label: "Medium",
    className: "bg-amber-500/15 text-amber-600 border-amber-500/25",
  },
  LOW: {
    label: "Low",
    className: "bg-red-500/15 text-red-600 border-red-500/25",
  },
  PENDING: {
    label: "Pending",
    className: "bg-gray-500/15 text-gray-600 border-gray-500/25",
  },
}

export function TemplateQualityBadge({ quality, className }: TemplateQualityBadgeProps) {
  if (!quality) {
    return <span className="text-sm text-muted-foreground">—</span>
  }

  const config = qualityConfig[quality]

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
