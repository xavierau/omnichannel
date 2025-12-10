/**
 * Channel Configuration System
 *
 * Provides type-safe channel configurations with icons and colors
 * for consistent display across the application.
 */

import { MessageCircle, MessageSquare, Send, Mail, Hash } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type ChannelType = 'whatsapp' | 'sms' | 'messenger' | 'telegram' | 'email'

export interface ChannelConfig {
  type: ChannelType
  displayName: string
  icon: LucideIcon
  color: {
    primary: string
    background: string
    border: string
  }
}

/**
 * Channel configurations with brand colors and icons
 */
export const CHANNEL_CONFIGS: Record<ChannelType, ChannelConfig> = {
  whatsapp: {
    type: 'whatsapp',
    displayName: 'WhatsApp',
    icon: MessageCircle,
    color: {
      primary: 'rgb(37, 211, 102)',
      background: 'rgba(37, 211, 102, 0.1)',
      border: 'rgba(37, 211, 102, 0.2)',
    },
  },
  sms: {
    type: 'sms',
    displayName: 'SMS',
    icon: MessageSquare,
    color: {
      primary: 'rgb(0, 102, 204)',
      background: 'rgba(0, 102, 204, 0.1)',
      border: 'rgba(0, 102, 204, 0.2)',
    },
  },
  messenger: {
    type: 'messenger',
    displayName: 'Messenger',
    icon: Send,
    color: {
      primary: 'rgb(0, 132, 255)',
      background: 'rgba(0, 132, 255, 0.1)',
      border: 'rgba(0, 132, 255, 0.2)',
    },
  },
  telegram: {
    type: 'telegram',
    displayName: 'Telegram',
    icon: Send,
    color: {
      primary: 'rgb(0, 136, 204)',
      background: 'rgba(0, 136, 204, 0.1)',
      border: 'rgba(0, 136, 204, 0.2)',
    },
  },
  email: {
    type: 'email',
    displayName: 'Email',
    icon: Mail,
    color: {
      primary: 'rgb(234, 67, 53)',
      background: 'rgba(234, 67, 53, 0.1)',
      border: 'rgba(234, 67, 53, 0.2)',
    },
  },
}

/**
 * Generic fallback configuration for unknown channel types
 */
const GENERIC_CONFIG: ChannelConfig = {
  type: 'whatsapp', // Default type
  displayName: 'Channel',
  icon: Hash,
  color: {
    primary: 'rgb(107, 114, 128)',
    background: 'rgba(107, 114, 128, 0.1)',
    border: 'rgba(107, 114, 128, 0.2)',
  },
}

/**
 * Get channel configuration by channel code
 * Falls back to generic config for unknown channel types
 *
 * @param channelCode - The channel type code (e.g., 'whatsapp', 'sms')
 * @returns Channel configuration with icon and colors
 */
export function getChannelConfig(channelCode: string): ChannelConfig {
  const normalizedCode = channelCode.toLowerCase() as ChannelType
  return CHANNEL_CONFIGS[normalizedCode] || GENERIC_CONFIG
}

/**
 * Truncates text to a maximum length with ellipsis
 * Used for compact channel account name display
 *
 * @param text - The text to truncate
 * @param maxLength - Maximum length before truncation
 * @returns Truncated text with ellipsis if needed
 */
export function truncateChannelName(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength).trim() + '...'
}
