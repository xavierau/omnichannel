/**
 * ChannelBadge Component
 *
 * Displays a badge showing the channel account with icon and name.
 * Supports two variants:
 * - compact: Icon + abbreviated name (for conversation lists)
 * - full: Icon + full name (for headers)
 *
 * Features:
 * - Channel-specific colors and icons
 * - Optional tooltip with full details
 * - Accessible with proper ARIA labels
 * - Memoized for performance in lists
 */

import { memo, useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { getChannelConfig, truncateChannelName } from '@/lib/channel-config'
import type { ChannelAccount } from '../types'

export interface ChannelBadgeProps {
  channelAccount: ChannelAccount
  variant?: 'compact' | 'full'
  showTooltip?: boolean
}

/**
 * Maximum character length for compact channel account name
 */
const COMPACT_NAME_MAX_LENGTH = 12

/**
 * ChannelBadge displays channel account information with appropriate styling
 * Memoized to prevent unnecessary re-renders in large lists
 */
export const ChannelBadge = memo(function ChannelBadge({
  channelAccount,
  variant = 'compact',
  showTooltip = true,
}: ChannelBadgeProps) {
  // Get channel configuration for icon and colors
  const config = useMemo(
    () => getChannelConfig(channelAccount.channel.code),
    [channelAccount.channel.code]
  )

  // Determine display name based on variant
  const displayName = useMemo(() => {
    if (variant === 'compact') {
      return truncateChannelName(channelAccount.name, COMPACT_NAME_MAX_LENGTH)
    }
    return channelAccount.name
  }, [variant, channelAccount.name])

  // Create accessible ARIA label
  const ariaLabel = useMemo(() => {
    const parts = [
      'Channel:',
      channelAccount.name,
      '-',
      channelAccount.channel.name,
    ]
    if (channelAccount.phoneNumber) {
      parts.push(`(${channelAccount.phoneNumber})`)
    }
    return parts.join(' ')
  }, [channelAccount.name, channelAccount.channel.name, channelAccount.phoneNumber])

  const Icon = config.icon

  // Badge content
  const badgeContent = (
    <Badge
      variant="outline"
      className="gap-1.5 font-normal"
      style={{
        backgroundColor: config.color.background,
        borderColor: config.color.border,
        color: config.color.primary,
      }}
      aria-label={ariaLabel}
    >
      <Icon className="size-3" aria-hidden="true" />
      <span className="text-xs">{displayName}</span>
    </Badge>
  )

  // Wrap with tooltip if enabled
  if (showTooltip) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          {badgeContent}
        </TooltipTrigger>
        <TooltipContent side="top" align="start">
          <div className="space-y-1">
            <div className="font-semibold">{channelAccount.name}</div>
            <div className="text-xs text-muted-foreground">
              {channelAccount.channel.name}
              {channelAccount.phoneNumber && ` • ${channelAccount.phoneNumber}`}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    )
  }

  return badgeContent
})
