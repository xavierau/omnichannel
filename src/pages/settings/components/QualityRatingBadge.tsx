import { CheckCircle2, AlertTriangle, AlertCircle, Clock } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import type { QualityRating } from "../types"

export type { QualityRating }

interface QualityRatingBadgeProps {
  rating: QualityRating
  showTooltip?: boolean
  className?: string
}

const RATING_CONFIG: Record<
  QualityRating,
  {
    label: string
    icon: typeof CheckCircle2
    className: string
    description: string
  }
> = {
  GREEN: {
    label: "Good",
    icon: CheckCircle2,
    className: "bg-emerald-500/10 text-emerald-700 border-emerald-500/25",
    description:
      "High quality rating. Your messages are well-received by customers with low block/report rates.",
  },
  YELLOW: {
    label: "Warning",
    icon: AlertTriangle,
    className: "bg-amber-500/10 text-amber-700 border-amber-500/25",
    description:
      "Medium quality rating. Consider improving message relevance to avoid restrictions.",
  },
  RED: {
    label: "Low",
    icon: AlertCircle,
    className: "bg-red-500/10 text-red-700 border-red-500/25",
    description:
      "Low quality rating. Your messaging capabilities may be restricted. Review your message content and targeting.",
  },
  PENDING: {
    label: "Pending",
    icon: Clock,
    className: "bg-gray-500/10 text-gray-600 border-gray-500/25",
    description:
      "Quality rating is being evaluated. This typically happens when your account is new or has limited activity.",
  },
  UNKNOWN: {
    label: "Unknown",
    icon: Clock,
    className: "bg-gray-500/10 text-gray-500 border-gray-500/25",
    description: "Quality rating information is not available.",
  },
}

/**
 * Visual badge showing WhatsApp Business account quality rating.
 *
 * Quality ratings affect messaging limits:
 * - GREEN: Maximum messaging throughput
 * - YELLOW: May have reduced limits
 * - RED: Restricted messaging capabilities
 * - PENDING: Being evaluated
 */
export function QualityRatingBadge({
  rating,
  showTooltip = true,
  className,
}: QualityRatingBadgeProps) {
  const config = RATING_CONFIG[rating] ?? RATING_CONFIG.UNKNOWN
  const Icon = config.icon

  const badge = (
    <Badge
      variant="outline"
      className={cn(config.className, "gap-1", className)}
    >
      <Icon className="size-3" />
      {config.label}
    </Badge>
  )

  if (!showTooltip) {
    return badge
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{badge}</TooltipTrigger>
      <TooltipContent className="max-w-xs">
        <p className="font-medium">Quality Rating: {config.label}</p>
        <p className="mt-1 text-xs opacity-90">{config.description}</p>
      </TooltipContent>
    </Tooltip>
  )
}
