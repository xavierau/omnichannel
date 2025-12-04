import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import type { Broadcast } from "../types"

interface BroadcastProgressProps {
  broadcast: Broadcast
  className?: string
}

export function BroadcastProgress({ broadcast, className }: BroadcastProgressProps) {
  const { sentCount, deliveredCount, readCount, failedCount, totalRecipients, status } = broadcast

  // For drafts and scheduled broadcasts, show total recipients only
  if (status === "DRAFT" || status === "SCHEDULED") {
    return (
      <div className={cn("text-sm text-muted-foreground", className)}>
        {totalRecipients.toLocaleString()} recipients
      </div>
    )
  }

  const progressPercent = totalRecipients > 0 ? Math.round((sentCount / totalRecipients) * 100) : 0
  const deliveryRate = sentCount > 0 ? Math.round((deliveredCount / sentCount) * 100) : 0
  const readRate = deliveredCount > 0 ? Math.round((readCount / deliveredCount) * 100) : 0

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn("space-y-1", className)}>
            {/* Progress bar */}
            <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-muted">
              {/* Delivered portion (green) */}
              <div
                className="bg-emerald-500 transition-all"
                style={{ width: `${(deliveredCount / totalRecipients) * 100}%` }}
              />
              {/* Sent but not delivered (yellow) */}
              <div
                className="bg-amber-500 transition-all"
                style={{ width: `${((sentCount - deliveredCount - failedCount) / totalRecipients) * 100}%` }}
              />
              {/* Failed (red) */}
              <div
                className="bg-red-500 transition-all"
                style={{ width: `${(failedCount / totalRecipients) * 100}%` }}
              />
            </div>
            {/* Summary text */}
            <div className="text-xs text-muted-foreground">
              {sentCount.toLocaleString()}/{totalRecipients.toLocaleString()} sent ({progressPercent}%)
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="w-48">
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span>Total Recipients:</span>
              <span className="font-medium">{totalRecipients.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Sent:</span>
              <span className="font-medium">{sentCount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-emerald-600">
              <span>Delivered:</span>
              <span className="font-medium">
                {deliveredCount.toLocaleString()} ({deliveryRate}%)
              </span>
            </div>
            <div className="flex justify-between text-blue-600">
              <span>Read:</span>
              <span className="font-medium">
                {readCount.toLocaleString()} ({readRate}%)
              </span>
            </div>
            {failedCount > 0 && (
              <div className="flex justify-between text-red-600">
                <span>Failed:</span>
                <span className="font-medium">{failedCount.toLocaleString()}</span>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
