import * as React from "react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { TemplateTranslation, TemplateStatus } from "../types"
import { getLanguageLabel } from "../types"

interface LanguagesBadgeListProps {
  translations: TemplateTranslation[]
  maxVisible?: number
  className?: string
}

const statusColors: Record<TemplateStatus, string> = {
  APPROVED: "bg-emerald-500",
  PENDING: "bg-amber-500",
  REJECTED: "bg-red-500",
}

export const LanguagesBadgeList = React.memo(function LanguagesBadgeList({
  translations,
  maxVisible = 3,
  className,
}: LanguagesBadgeListProps) {
  // Memoize sliced arrays to prevent recalculation
  const { visibleTranslations, hiddenTranslations, hiddenCount } = React.useMemo(
    () => ({
      visibleTranslations: translations.slice(0, maxVisible),
      hiddenTranslations: translations.slice(maxVisible),
      hiddenCount: Math.max(0, translations.length - maxVisible),
    }),
    [translations, maxVisible]
  )

  return (
    <TooltipProvider>
      <div className={cn("flex flex-wrap items-center gap-1", className)}>
        {visibleTranslations.map((translation) => (
          <Tooltip key={translation.id}>
            <TooltipTrigger asChild>
              <Badge
                variant="secondary"
                className="relative cursor-default px-2 py-0.5 text-xs"
              >
                <span
                  className={cn(
                    "absolute -top-0.5 -right-0.5 size-2 rounded-full",
                    statusColors[translation.status]
                  )}
                />
                {translation.language.toUpperCase()}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>
                {getLanguageLabel(translation.language)} - {translation.status}
              </p>
            </TooltipContent>
          </Tooltip>
        ))}
        {hiddenCount > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge
                variant="outline"
                className="cursor-default px-2 py-0.5 text-xs"
              >
                +{hiddenCount}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <div className="space-y-1">
                {hiddenTranslations.map((t) => (
                  <p key={t.id}>
                    {getLanguageLabel(t.language)} - {t.status}
                  </p>
                ))}
              </div>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  )
})
