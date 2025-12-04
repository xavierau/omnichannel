import { useMemo } from "react"
import { cn } from "@/lib/utils"
import type { NoteMention } from "../types"

interface NoteContentProps {
  content: string
  mentions: NoteMention[]
  className?: string
}

interface ContentSegment {
  type: "text" | "mention"
  content: string
  mention?: NoteMention
}

function parseContentWithMentions(
  content: string,
  mentions: NoteMention[]
): ContentSegment[] {
  if (mentions.length === 0) {
    return [{ type: "text", content }]
  }

  // Sort mentions by startIndex to process in order
  const sortedMentions = [...mentions].sort(
    (a, b) => a.startIndex - b.startIndex
  )

  const segments: ContentSegment[] = []
  let currentIndex = 0

  for (const mention of sortedMentions) {
    // Skip invalid mention positions
    if (
      mention.startIndex < currentIndex ||
      mention.endIndex > content.length
    ) {
      continue
    }

    // Add text before this mention
    if (mention.startIndex > currentIndex) {
      segments.push({
        type: "text",
        content: content.slice(currentIndex, mention.startIndex),
      })
    }

    // Add the mention
    segments.push({
      type: "mention",
      content: content.slice(mention.startIndex, mention.endIndex),
      mention,
    })

    currentIndex = mention.endIndex
  }

  // Add remaining text after last mention
  if (currentIndex < content.length) {
    segments.push({
      type: "text",
      content: content.slice(currentIndex),
    })
  }

  return segments
}

export function NoteContent({ content, mentions, className }: NoteContentProps) {
  const segments = useMemo(
    () => parseContentWithMentions(content, mentions),
    [content, mentions]
  )

  return (
    <span className={cn("whitespace-pre-wrap", className)}>
      {segments.map((segment, index) =>
        segment.type === "mention" ? (
          <span
            key={`mention-${segment.mention?.operatorId}-${index}`}
            className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded px-1"
          >
            {segment.content}
          </span>
        ) : (
          <span key={`text-${index}`}>{segment.content}</span>
        )
      )}
    </span>
  )
}
