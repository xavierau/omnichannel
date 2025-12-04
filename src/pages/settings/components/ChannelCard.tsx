import { ChevronDown, MessageCircle, Instagram, Facebook, Send, Mail, Phone, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible"
import type { ChannelMeta } from "../types"

interface ChannelCardProps {
  meta: ChannelMeta
  configCount: number
  isExpanded: boolean
  onToggle: () => void
  onAddConfig: () => void
  children?: React.ReactNode
}

const iconMap: Record<string, React.ElementType> = {
  MessageCircle,
  Instagram,
  Facebook,
  Send,
  Mail,
  Phone,
}

export function ChannelCard({
  meta,
  configCount,
  isExpanded,
  onToggle,
  onAddConfig,
  children,
}: ChannelCardProps) {
  const Icon = iconMap[meta.icon] || MessageCircle
  const isAvailable = meta.available

  return (
    <Collapsible open={isExpanded && isAvailable} onOpenChange={isAvailable ? onToggle : undefined}>
      <Card className={cn("relative overflow-hidden", !isAvailable && "opacity-60")}>
        {!isAvailable && (
          <div className="absolute right-3 top-3 z-10">
            <span className="inline-flex items-center rounded-full border border-amber-500/25 bg-amber-500/15 px-2.5 py-0.5 text-xs font-medium text-amber-600">
              Coming Soon
            </span>
          </div>
        )}

        <CollapsibleTrigger
          className={cn(
            "w-full text-left",
            isAvailable && "cursor-pointer hover:bg-muted/50 transition-colors"
          )}
          disabled={!isAvailable}
        >
          <CardHeader className="pb-0">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base">{meta.name}</CardTitle>
                  {isAvailable && configCount > 0 && (
                    <span className="inline-flex items-center rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      {configCount} {configCount === 1 ? "config" : "configs"}
                    </span>
                  )}
                </div>
                <CardDescription className="mt-1">{meta.description}</CardDescription>
              </div>
              {isAvailable && (
                <ChevronDown
                  className={cn(
                    "h-5 w-5 text-muted-foreground transition-transform duration-200",
                    isExpanded && "rotate-180"
                  )}
                />
              )}
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-4">
            {children}

            {isAvailable && (
              <div className="mt-4 pt-4 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    onAddConfig()
                  }}
                  className="w-full"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Configuration
                </Button>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}
