import { TagBadge } from "@/components/ui/tag-badge"
import type { Tag } from "../types"

interface CustomerTagBadgeProps {
  tag: Tag
  size?: "default" | "sm" | "lg"
}

export function CustomerTagBadge({ tag, size = "default" }: CustomerTagBadgeProps) {
  return (
    <TagBadge color={tag.color} size={size}>
      {tag.name}
    </TagBadge>
  )
}
