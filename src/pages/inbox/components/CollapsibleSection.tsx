import { useState } from "react"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"
import { ChevronDown, ChevronRight } from "lucide-react"

interface CollapsibleSectionProps {
  title: string
  icon?: React.ComponentType<{ className?: string }>
  defaultOpen?: boolean
  badge?: React.ReactNode
  children: React.ReactNode
  className?: string
}

/**
 * CollapsibleSection wraps content in a collapsible accordion-style section.
 * Used in the inbox sidebar for organizing customer details, notes, etc.
 */
export function CollapsibleSection({
  title,
  icon: Icon,
  defaultOpen = true,
  badge,
  children,
  className,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div
        className={cn(
          "rounded-lg border bg-card text-card-foreground",
          className
        )}
      >
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center gap-2 px-4 py-3 text-left transition-colors hover:bg-muted/50"
          >
            {isOpen ? (
              <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
            ) : (
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            )}
            {Icon && (
              <Icon className="size-4 shrink-0 text-muted-foreground" />
            )}
            <span className="flex-1 text-sm font-medium">{title}</span>
            {badge && <div className="shrink-0">{badge}</div>}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down overflow-hidden">
          <div className="border-t px-4 py-3">{children}</div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}
