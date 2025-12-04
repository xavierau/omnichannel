import { cn } from "@/lib/utils"

interface TypingIndicatorProps {
  className?: string
}

/**
 * WhatsApp-style typing indicator with three animated bouncing dots.
 * Displays in an inbound message bubble style on the left side.
 */
export function TypingIndicator({ className }: TypingIndicatorProps) {
  return (
    <div className={cn("flex justify-start", className)}>
      <div className="bg-muted rounded-lg rounded-tl-none px-4 py-3">
        <div className="flex items-center gap-1">
          <TypingDot delay={0} />
          <TypingDot delay={150} />
          <TypingDot delay={300} />
        </div>
      </div>
    </div>
  )
}

/**
 * Individual animated dot for the typing indicator.
 * Uses CSS animation with staggered delays for wave effect.
 */
function TypingDot({ delay }: { delay: number }) {
  return (
    <span
      className="size-2 rounded-full bg-muted-foreground/60 animate-typing-bounce"
      style={{
        animationDelay: `${delay}ms`,
      }}
    />
  )
}
