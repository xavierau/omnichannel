// Channel connection status
export type ChannelStatus = "connected" | "not_connected" | "error"

// Supported channel types
export type ChannelType =
  | "whatsapp"
  | "instagram"
  | "facebook_messenger"
  | "telegram"
  | "email"
  | "sms"

// Base channel configuration interface
export interface BaseChannelConfig {
  id: string
  name: string // Display name for this configuration (e.g., "Marketing WhatsApp", "Support Line")
  channelType: ChannelType
  status: ChannelStatus
  lastTestedAt?: Date
  errorMessage?: string
  createdAt: Date
  updatedAt: Date
}

// WhatsApp Business API configuration
export interface WhatsAppConfig extends BaseChannelConfig {
  channelType: "whatsapp"
  phoneNumberId: string
  whatsappBusinessAccountId: string
  accessToken: string
  appId: string
  appSecret: string
  webhookVerifyToken?: string
}

// Union type for all channel configs
export type ChannelConfig = WhatsAppConfig // | InstagramConfig | EmailConfig | etc.

// Form data for WhatsApp settings
export interface WhatsAppFormData {
  name: string // Display name for this configuration
  phoneNumberId: string
  whatsappBusinessAccountId: string
  accessToken: string
  appId: string
  appSecret: string
  webhookVerifyToken: string
}

// Form validation errors
export interface WhatsAppFormErrors {
  name?: string
  phoneNumberId?: string
  whatsappBusinessAccountId?: string
  accessToken?: string
  appId?: string
  appSecret?: string
}

// Test connection result
export interface TestConnectionResult {
  success: boolean
  message: string
}

// Channel metadata for UI
export interface ChannelMeta {
  type: ChannelType
  name: string
  description: string
  icon: string
  available: boolean
}

// All available channels
export const AVAILABLE_CHANNELS: ChannelMeta[] = [
  {
    type: "whatsapp",
    name: "WhatsApp Business",
    description: "Connect your WhatsApp Business API for messaging",
    icon: "MessageCircle",
    available: true,
  },
  {
    type: "instagram",
    name: "Instagram Direct",
    description: "Connect Instagram for direct messaging",
    icon: "Instagram",
    available: false,
  },
  {
    type: "facebook_messenger",
    name: "Facebook Messenger",
    description: "Connect Facebook Messenger for customer support",
    icon: "Facebook",
    available: false,
  },
  {
    type: "telegram",
    name: "Telegram",
    description: "Connect Telegram bot for messaging",
    icon: "Send",
    available: false,
  },
  {
    type: "email",
    name: "Email",
    description: "Connect email for notifications and marketing",
    icon: "Mail",
    available: false,
  },
  {
    type: "sms",
    name: "SMS",
    description: "Connect SMS gateway for text messaging",
    icon: "Phone",
    available: false,
  },
]

// Default form values
export const defaultWhatsAppFormData: WhatsAppFormData = {
  name: "",
  phoneNumberId: "",
  whatsappBusinessAccountId: "",
  accessToken: "",
  appId: "",
  appSecret: "",
  webhookVerifyToken: "",
}
