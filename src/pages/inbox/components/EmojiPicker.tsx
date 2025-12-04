import { useState, useMemo, useCallback } from "react"
import { Smile, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void
  className?: string
}

interface EmojiCategory {
  name: string
  emojis: string[]
}

const EMOJI_CATEGORIES: EmojiCategory[] = [
  {
    name: "Smileys",
    emojis: [
      "😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😂",
      "🙂", "🙃", "😉", "😊", "😇", "🥰", "😍", "🤩",
      "😘", "😗", "😚", "😙", "🥲", "😋", "😛", "😜",
      "🤪", "😝", "🤑", "🤗", "🤭", "🤫", "🤔", "🤐",
    ],
  },
  {
    name: "Gestures",
    emojis: [
      "👋", "🤚", "🖐️", "✋", "🖖", "👌", "🤌", "🤏",
      "✌️", "🤞", "🤟", "🤘", "🤙", "👈", "👉", "👆",
      "🖕", "👇", "☝️", "👍", "👎", "✊", "👊", "🤛",
      "🤜", "👏", "🙌", "👐", "🤲", "🤝", "🙏", "💪",
    ],
  },
  {
    name: "Hearts",
    emojis: [
      "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍",
      "🤎", "💔", "❣️", "💕", "💞", "💓", "💗", "💖",
      "💘", "💝", "💟", "♥️", "🫀", "💌", "😻", "🥰",
    ],
  },
  {
    name: "Objects",
    emojis: [
      "📱", "💻", "🖥️", "🖨️", "⌨️", "🖱️", "💾", "📀",
      "📷", "📹", "🎥", "📞", "☎️", "📺", "📻", "🎙️",
      "⏰", "⌚", "📧", "✉️", "📦", "📝", "📁", "📂",
    ],
  },
  {
    name: "Symbols",
    emojis: [
      "✅", "❌", "❓", "❗", "💯", "🔥", "⭐", "🌟",
      "✨", "💫", "🎉", "🎊", "🎁", "🏆", "🥇", "🥈",
      "🔔", "🔕", "📣", "📢", "💬", "💭", "🗯️", "💤",
    ],
  },
]

export function EmojiPicker({ onEmojiSelect, className }: EmojiPickerProps) {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  // Filter emojis based on search (filters by category name when searching)
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) {
      return EMOJI_CATEGORIES
    }

    const query = searchQuery.toLowerCase()
    return EMOJI_CATEGORIES.filter((category) =>
      category.name.toLowerCase().includes(query)
    ).map((category) => ({
      ...category,
      emojis: category.emojis,
    }))
  }, [searchQuery])

  const handleEmojiClick = useCallback(
    (emoji: string) => {
      onEmojiSelect(emoji)
      setOpen(false)
      setSearchQuery("")
    },
    [onEmojiSelect]
  )

  const handleOpenChange = useCallback((isOpen: boolean) => {
    setOpen(isOpen)
    if (!isOpen) {
      setSearchQuery("")
    }
  }, [])

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn("h-9 w-9 shrink-0", className)}
          aria-label="Open emoji picker"
        >
          <Smile className="h-5 w-5 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-80 p-0"
        align="start"
        side="top"
        sideOffset={8}
      >
        <div className="p-3 border-b">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search emoji categories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8"
            />
          </div>
        </div>
        <ScrollArea className="h-64">
          <div className="p-3">
            {filteredCategories.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No categories found
              </p>
            ) : (
              filteredCategories.map((category) => (
                <div key={category.name} className="mb-4 last:mb-0">
                  <h4 className="text-xs font-medium text-muted-foreground mb-2">
                    {category.name}
                  </h4>
                  <div className="grid grid-cols-8 gap-1">
                    {category.emojis.map((emoji, index) => (
                      <button
                        key={`${category.name}-${index}`}
                        type="button"
                        onClick={() => handleEmojiClick(emoji)}
                        className="h-8 w-8 flex items-center justify-center text-lg hover:bg-accent rounded-md transition-colors"
                        aria-label={`Select ${emoji}`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}
