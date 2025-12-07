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

// Quality rating from WhatsApp Business API
export type QualityRating = "GREEN" | "YELLOW" | "RED" | "PENDING" | "UNKNOWN"

// Messaging limit tiers from WhatsApp Business API
export type MessagingLimitTier =
  | "TIER_1K"
  | "TIER_10K"
  | "TIER_100K"
  | "TIER_UNLIMITED"
  | "UNKNOWN"

// Account information returned from successful connection test
export interface AccountInfo {
  businessName?: string
  displayPhoneNumber?: string
  qualityRating?: QualityRating
  messagingLimitTier?: MessagingLimitTier
  verifiedName?: string
  codeVerificationStatus?: string
}

// Webhook configuration details
export interface WebhookConfig {
  webhookUrl: string
  verifyToken: string
  isConfigured: boolean
}

// Test connection result
export interface TestConnectionResult {
  success: boolean
  message: string
  accountInfo?: AccountInfo
  webhookConfig?: WebhookConfig
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
