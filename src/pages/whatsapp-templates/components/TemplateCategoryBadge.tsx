import { cn } from "@/lib/utils"
import type { TemplateCategory } from "../types"

interface TemplateCategoryBadgeProps {
  category: TemplateCategory
  className?: string
}

const categoryConfig: Record<TemplateCategory, { label: string; className: string }> = {
  MARKETING: {
    label: "Marketing",
    className: "bg-blue-500/15 text-blue-600 border-blue-500/25",
  },
  UTILITY: {
    label: "Utility",
    className: "bg-teal-500/15 text-teal-600 border-teal-500/25",
  },
  AUTHENTICATION: {
    label: "Auth",
    className: "bg-violet-500/15 text-violet-600 border-violet-500/25",
  },
}

export function TemplateCategoryBadge({ category, className }: TemplateCategoryBadgeProps) {
  const config = categoryConfig[category]

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
