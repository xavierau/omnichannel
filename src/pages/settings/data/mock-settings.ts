import type { WhatsAppConfig, WhatsAppFormData, TestConnectionResult } from "../types"

// Initial mock data - example with some pre-configured channels
export const mockWhatsAppConfigs: WhatsAppConfig[] = [
  {
    id: "wa-config-1",
    name: "Marketing Line",
    channelType: "whatsapp",
    status: "connected",
    phoneNumberId: "123456789012345",
    whatsappBusinessAccountId: "987654321098765",
    accessToken: "EAAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    appId: "1234567890123456",
    appSecret: "abc123def456ghi789jkl012mno345pqr",
    webhookVerifyToken: "marketing-webhook-token",
    lastTestedAt: new Date("2024-11-28T10:30:00"),
    createdAt: new Date("2024-01-15"),
    updatedAt: new Date("2024-11-28"),
  },
  {
    id: "wa-config-2",
    name: "Customer Support",
    channelType: "whatsapp",
    status: "connected",
    phoneNumberId: "555666777888999",
    whatsappBusinessAccountId: "111222333444555",
    accessToken: "EAAyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy",
    appId: "9876543210987654",
    appSecret: "xyz789abc123def456ghi789jkl012mno",
    createdAt: new Date("2024-02-20"),
    updatedAt: new Date("2024-11-25"),
  },
]

// Mock test connection function
export async function mockTestConnection(
  data: WhatsAppFormData
): Promise<TestConnectionResult> {
  await new Promise((resolve) => setTimeout(resolve, 1500))

  const hasAllFields =
    data.name &&
    data.phoneNumberId &&
    data.whatsappBusinessAccountId &&
    data.accessToken &&
    data.appId &&
    data.appSecret

  if (!hasAllFields) {
    return {
      success: false,
      message: "Missing required configuration fields",
    }
  }

  // Simulate 90% success rate for demo
  const success = Math.random() > 0.1
  return {
    success,
    message: success
      ? "Successfully connected to WhatsApp Business API"
      : "Invalid credentials. Please check your Access Token.",
  }
}

// Mock save function (create new)
export async function mockSaveWhatsAppConfig(
  data: WhatsAppFormData
): Promise<WhatsAppConfig> {
  await new Promise((resolve) => setTimeout(resolve, 800))

  return {
    id: `wa-config-${Date.now()}`,
    name: data.name,
    channelType: "whatsapp",
    status: "not_connected",
    phoneNumberId: data.phoneNumberId,
    whatsappBusinessAccountId: data.whatsappBusinessAccountId,
    accessToken: data.accessToken,
    appId: data.appId,
    appSecret: data.appSecret,
    webhookVerifyToken: data.webhookVerifyToken || undefined,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

// Mock update function (edit existing)
export async function mockUpdateWhatsAppConfig(
  id: string,
  data: WhatsAppFormData
): Promise<WhatsAppConfig> {
  await new Promise((resolve) => setTimeout(resolve, 800))

  return {
    id,
    name: data.name,
    channelType: "whatsapp",
    status: "not_connected",
    phoneNumberId: data.phoneNumberId,
    whatsappBusinessAccountId: data.whatsappBusinessAccountId,
    accessToken: data.accessToken,
    appId: data.appId,
    appSecret: data.appSecret,
    webhookVerifyToken: data.webhookVerifyToken || undefined,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

// Mock delete function
export async function mockDeleteWhatsAppConfig(_id: string): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 500))
  // In a real app, this would call an API with the id
}
