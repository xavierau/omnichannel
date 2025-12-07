import { useCallback } from "react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

interface ReactionPickerProps {
  messageId: string
  onReact: (messageId: string, emoji: string) => void
  disabled?: boolean
  className?: string
}

/**
 * Common emoji reactions for WhatsApp messages.
 * These are the most commonly used reaction emojis.
 */
const REACTION_EMOJIS = [
  { emoji: "\u{1F44D}", label: "Thumbs up" },     // 👍
  { emoji: "\u{2764}\u{FE0F}", label: "Heart" },  // ❤️
  { emoji: "\u{1F602}", label: "Laughing" },      // 😂
  { emoji: "\u{1F62E}", label: "Surprised" },     // 😮
  { emoji: "\u{1F622}", label: "Sad" },           // 😢
  { emoji: "\u{1F64F}", label: "Pray" },          // 🙏
]

/**
 * Popover component for adding emoji reactions to messages.
 * Displays a set of common reaction emojis that users can click to react.
 */
export function ReactionPicker({
  messageId,
  onReact,
  disabled = false,
  className,
}: ReactionPickerProps) {
  const handleReaction = useCallback(
    (emoji: string) => {
      onReact(messageId, emoji)
    },
    [messageId, onReact]
  )

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled}
          className={cn(
            "h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity",
            className
          )}
          aria-label="Add reaction"
        >
          <span className="text-xs">+</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-2"
        side="top"
        align="start"
        sideOffset={4}
      >
        <div className="flex gap-1" role="group" aria-label="Reaction emojis">
          {REACTION_EMOJIS.map(({ emoji, label }) => (
            <button
              key={emoji}
              type="button"
              onClick={() => handleReaction(emoji)}
              className={cn(
                "flex items-center justify-center w-8 h-8 rounded-md",
                "hover:bg-muted transition-colors",
                "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              )}
              aria-label={`React with ${label}`}
            >
              <span className="text-lg">{emoji}</span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

/**
 * Inline reaction display component.
 * Shows existing reactions on a message with counts.
 */
interface ReactionDisplayProps {
  reactions: Array<{
    emoji: string
    count: number
    reacted: boolean
  }>
  onToggleReaction?: (emoji: string) => void
  className?: string
}

export function ReactionDisplay({
  reactions,
  onToggleReaction,
  className,
}: ReactionDisplayProps) {
  if (reactions.length === 0) return null

  return (
    <div className={cn("flex flex-wrap gap-1 mt-1", className)}>
      {reactions.map(({ emoji, count, reacted }) => (
        <button
          key={emoji}
          type="button"
          onClick={() => onToggleReaction?.(emoji)}
          className={cn(
            "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs",
            "transition-colors",
            reacted
              ? "bg-primary/20 text-primary border border-primary/30"
              : "bg-muted text-muted-foreground border border-transparent",
            "hover:bg-muted/80"
          )}
          aria-label={`${emoji} reaction, ${count} ${count === 1 ? "person" : "people"}`}
          aria-pressed={reacted}
        >
          <span>{emoji}</span>
          {count > 1 && <span>{count}</span>}
        </button>
      ))}
    </div>
  )
}
