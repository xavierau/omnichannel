import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

interface TemplatePreviewProps {
  body: string
  maxLength?: number
  className?: string
}

export function TemplatePreview({ body, maxLength = 50, className }: TemplatePreviewProps) {
  const needsTruncation = body.length > maxLength
  const displayText = needsTruncation ? `${body.slice(0, maxLength)}...` : body

  if (!needsTruncation) {
    return (
      <span className={cn("text-sm text-muted-foreground", className)}>
        {displayText}
      </span>
    )
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={cn("text-sm text-muted-foreground cursor-help", className)}>
          {displayText}
        </span>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-sm">
        <p className="whitespace-pre-wrap">{body}</p>
      </TooltipContent>
    </Tooltip>
  )
}
