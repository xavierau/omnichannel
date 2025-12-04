import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import type { Operator, OperatorStatus } from "../types"

interface OperatorAvatarProps {
  operator: Operator
  size?: "sm" | "md" | "lg"
  showStatus?: boolean
  className?: string
}

/**
 * Size configuration mapping for consistent avatar dimensions.
 */
const SIZE_CLASSES = {
  sm: "size-6",
  md: "size-8",
  lg: "size-10",
} as const

/**
 * Status dot size mapping, scaled relative to avatar size.
 */
const STATUS_DOT_SIZES = {
  sm: "size-2",
  md: "size-2.5",
  lg: "size-3",
} as const

/**
 * Status color mapping for operator availability indicator.
 */
const STATUS_COLORS: Record<OperatorStatus, string> = {
  online: "bg-green-500",
  offline: "bg-gray-400",
  busy: "bg-red-500",
}

/**
 * Extracts initials from a name for avatar fallback.
 * Takes the first letter of the first and last name (if available).
 */
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase()
  }
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

export function OperatorAvatar({
  operator,
  size = "md",
  showStatus = false,
  className,
}: OperatorAvatarProps) {
  const initials = getInitials(operator.name)

  return (
    <div className={cn("relative inline-block", className)}>
      <Avatar className={cn(SIZE_CLASSES[size])}>
        {operator.avatar && (
          <AvatarImage
            src={operator.avatar}
            alt={operator.name}
          />
        )}
        <AvatarFallback className="text-xs font-medium">
          {initials}
        </AvatarFallback>
      </Avatar>

      {showStatus && (
        <span
          className={cn(
            "absolute bottom-0 right-0 rounded-full ring-2 ring-background",
            STATUS_DOT_SIZES[size],
            STATUS_COLORS[operator.status]
          )}
          aria-label={`Status: ${operator.status}`}
        />
      )}
    </div>
  )
}
