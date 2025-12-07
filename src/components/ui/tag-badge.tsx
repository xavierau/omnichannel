/* eslint-disable react-refresh/only-export-components */
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

const tagBadgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        blue: "bg-tag-blue/20 text-tag-blue border border-tag-blue/30",
        green: "bg-tag-green/20 text-tag-green border border-tag-green/30",
        yellow: "bg-tag-yellow/20 text-tag-yellow border border-tag-yellow/30",
        red: "bg-tag-red/20 text-tag-red border border-tag-red/30",
        purple: "bg-tag-purple/20 text-tag-purple border border-tag-purple/30",
        pink: "bg-tag-pink/20 text-tag-pink border border-tag-pink/30",
        orange: "bg-tag-orange/20 text-tag-orange border border-tag-orange/30",
        gray: "bg-tag-gray/20 text-tag-gray border border-tag-gray/30",
      },
      size: {
        default: "h-6 text-xs",
        sm: "h-5 text-[10px] px-2",
        lg: "h-7 text-sm px-3",
      },
    },
    defaultVariants: {
      variant: "gray",
      size: "default",
    },
  }
)

export type TagColor = "blue" | "green" | "yellow" | "red" | "purple" | "pink" | "orange" | "gray"

export interface TagBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof tagBadgeVariants> {
  color?: TagColor
  onRemove?: () => void
  removable?: boolean
}

const TagBadge = React.forwardRef<HTMLSpanElement, TagBadgeProps>(
  ({ className, color, variant, size, children, onRemove, removable = false, ...props }, ref) => {
    // Allow both 'color' (for convenience) and 'variant' props
    const colorVariant = color ?? variant
    return (
      <span
        ref={ref}
        className={cn(tagBadgeVariants({ variant: colorVariant, size }), className)}
        {...props}
      >
        {children}
        {removable && (
          <button
            type="button"
            className="ml-1 rounded-full p-0.5 hover:bg-foreground/10 focus:outline-none"
            onClick={(e) => {
              e.stopPropagation()
              onRemove?.()
            }}
            aria-label="Remove tag"
          >
            <X className="size-3" />
          </button>
        )}
      </span>
    )
  }
)
TagBadge.displayName = "TagBadge"

export { TagBadge, tagBadgeVariants }
