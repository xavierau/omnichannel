import { useState, useEffect, useCallback } from "react"

import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { ChannelCard } from "./components/ChannelCard"
import { ChannelConfigList } from "./components/ChannelConfigList"
import { WhatsAppFormDialog } from "./components/WhatsAppFormDialog"
import {
  channelAccountService,
  type ChannelAccount,
  type CreateChannelAccountData,
  type UpdateChannelAccountData,
  type TestConnectionResult as ApiTestConnectionResult,
  ChannelAccountStatus,
} from "@/services/channel-account.service"
import {
  AVAILABLE_CHANNELS,
  type ChannelType,
  type WhatsAppConfig,
  type WhatsAppFormData,
  type TestConnectionResult,
} from "./types"

// Adapter: Transform API ChannelAccount to frontend WhatsAppConfig
function toWhatsAppConfig(account: ChannelAccount): WhatsAppConfig {
  return {
    id: account.id,
    name: account.name,
    channelType: "whatsapp",
    status: account.status === ChannelAccountStatus.CONNECTED
      ? "connected"
      : account.status === ChannelAccountStatus.ERROR
        ? "error"
        : "not_connected",
    lastTestedAt: account.lastTestedAt ? new Date(account.lastTestedAt) : undefined,
    errorMessage: account.errorMessage ?? undefined,
    phoneNumberId: account.phoneNumberId ?? "",
    whatsappBusinessAccountId: "", // Not stored in API response
    accessToken: "", // Sensitive - not returned from API
    appId: "",
    appSecret: "",
    webhookVerifyToken: "",
    createdAt: new Date(account.createdAt),
    updatedAt: new Date(account.updatedAt),
  }
}

// Adapter: Transform frontend form data to API create payload
function toCreateChannelAccountData(data: WhatsAppFormData): CreateChannelAccountData {
  return {
    channelId: "whatsapp",
    providerId: "meta-cloud-api",
    name: data.name,
    credentials: {
      phoneNumberId: data.phoneNumberId,
      whatsappBusinessAccountId: data.whatsappBusinessAccountId,
      accessToken: data.accessToken,
      appId: data.appId || undefined,
      appSecret: data.appSecret || undefined,
    },
  }
}

// Adapter: Transform frontend form data to API update payload
function toUpdateChannelAccountData(data: WhatsAppFormData): UpdateChannelAccountData {
  return {
    name: data.name,
    credentials: {
      phoneNumberId: data.phoneNumberId,
      whatsappBusinessAccountId: data.whatsappBusinessAccountId,
      accessToken: data.accessToken,
      appId: data.appId || undefined,
      appSecret: data.appSecret || undefined,
    },
  }
}

// Adapter: Transform API test result to frontend format
function toTestConnectionResult(apiResult: ApiTestConnectionResult): TestConnectionResult {
  return {
    success: apiResult.success,
    message: apiResult.message,
    // accountInfo and webhookConfig can be extracted from details if needed
  }
}

export function SettingsPage() {
  // State for WhatsApp configurations
  const [whatsappConfigs, setWhatsappConfigs] = useState<WhatsAppConfig[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // UI state
  const [expandedChannel, setExpandedChannel] = useState<ChannelType | null>("whatsapp")

  // Dialog state
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false)
  const [editingConfig, setEditingConfig] = useState<WhatsAppConfig | undefined>(undefined)
  const [deletingConfig, setDeletingConfig] = useState<WhatsAppConfig | null>(null)

  // Fetch channel accounts on mount
  useEffect(() => {
    const fetchChannelAccounts = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const accounts = await channelAccountService.getChannelAccounts()
        // Filter for WhatsApp accounts only and transform to frontend format
        const whatsappAccounts = accounts
          .filter((account) => account.channelId === "whatsapp")
          .map(toWhatsAppConfig)
        setWhatsappConfigs(whatsappAccounts)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load channel accounts")
        console.error("Failed to fetch channel accounts:", err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchChannelAccounts()
  }, [])

  const handleToggleChannel = (channelType: ChannelType) => {
    setExpandedChannel((prev) => (prev === channelType ? null : channelType))
  }

  // WhatsApp handlers
  const handleAddWhatsApp = () => {
    setEditingConfig(undefined)
    setIsFormDialogOpen(true)
  }

  const handleEditWhatsApp = (config: WhatsAppConfig) => {
    setEditingConfig(config)
    setIsFormDialogOpen(true)
  }

  const handleDeleteWhatsApp = (config: WhatsAppConfig) => {
    setDeletingConfig(config)
  }

  const handleConfirmDelete = useCallback(async () => {
    if (!deletingConfig) return

    try {
      await channelAccountService.deleteChannelAccount(deletingConfig.id)
      setWhatsappConfigs((prev) => prev.filter((c) => c.id !== deletingConfig.id))
    } catch (err) {
      console.error("Failed to delete channel account:", err)
      // Could add toast notification here
    } finally {
      setDeletingConfig(null)
    }
  }, [deletingConfig])

  const handleTestWhatsApp = useCallback(async (config: WhatsAppConfig) => {
    try {
      const result = await channelAccountService.testConnection(config.id)

      // Update config status based on test result
      setWhatsappConfigs((prev) =>
        prev.map((c) =>
          c.id === config.id
            ? {
                ...c,
                status: result.success ? "connected" : "error",
                lastTestedAt: new Date(),
                errorMessage: result.success ? undefined : result.message,
              }
            : c
        )
      )
    } catch (err) {
      // Update with error status
      setWhatsappConfigs((prev) =>
        prev.map((c) =>
          c.id === config.id
            ? {
                ...c,
                status: "error",
                lastTestedAt: new Date(),
                errorMessage: err instanceof Error ? err.message : "Connection test failed",
              }
            : c
        )
      )
    }
  }, [])

  const handleSubmitWhatsApp = useCallback(async (data: WhatsAppFormData) => {
    if (editingConfig) {
      // Update existing
      const updated = await channelAccountService.updateChannelAccount(
        editingConfig.id,
        toUpdateChannelAccountData(data)
      )
      setWhatsappConfigs((prev) =>
        prev.map((c) => (c.id === editingConfig.id ? toWhatsAppConfig(updated) : c))
      )
    } else {
      // Create new
      const created = await channelAccountService.createChannelAccount(
        toCreateChannelAccountData(data)
      )
      setWhatsappConfigs((prev) => [...prev, toWhatsAppConfig(created)])
    }
  }, [editingConfig])

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleTestConnection = useCallback(async (_data: WhatsAppFormData): Promise<TestConnectionResult> => {
    // For form validation test before saving, we need to create temporarily or use a test endpoint
    // Since the API requires an existing ID, we'll return a mock success for now
    // In production, you might have a separate endpoint for testing credentials before saving
    // or handle this differently based on your API design

    // If editing existing config, use the real test
    if (editingConfig) {
      try {
        const result = await channelAccountService.testConnection(editingConfig.id)
        return toTestConnectionResult(result)
      } catch (err) {
        return {
          success: false,
          message: err instanceof Error ? err.message : "Connection test failed",
        }
      }
    }

    // For new configs, we can't test without creating first
    // Return a validation-only response
    return {
      success: true,
      message: "Credentials will be validated upon save",
    }
  }, [editingConfig])

  const getConfigCount = (channelType: ChannelType) => {
    if (channelType === "whatsapp") {
      return whatsappConfigs.length
    }
    return 0
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Configure your messaging channels and integrations
          </p>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">Loading channel accounts...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Configure your messaging channels and integrations
          </p>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="text-destructive">Error: {error}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Configure your messaging channels and integrations
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {AVAILABLE_CHANNELS.map((channel) => (
          <ChannelCard
            key={channel.type}
            meta={channel}
            configCount={getConfigCount(channel.type)}
            isExpanded={expandedChannel === channel.type}
            onToggle={() => handleToggleChannel(channel.type)}
            onAddConfig={channel.type === "whatsapp" ? handleAddWhatsApp : () => {}}
          >
            {channel.type === "whatsapp" && (
              <ChannelConfigList
                configs={whatsappConfigs}
                onEdit={handleEditWhatsApp}
                onDelete={handleDeleteWhatsApp}
                onTest={handleTestWhatsApp}
              />
            )}
          </ChannelCard>
        ))}
      </div>

      {/* WhatsApp Form Dialog */}
      <WhatsAppFormDialog
        open={isFormDialogOpen}
        onOpenChange={setIsFormDialogOpen}
        config={editingConfig}
        onSubmit={handleSubmitWhatsApp}
        onTestConnection={handleTestConnection}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={!!deletingConfig}
        onOpenChange={(open) => !open && setDeletingConfig(null)}
        title="Delete Configuration"
        description={`Are you sure you want to delete "${deletingConfig?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
        onConfirm={handleConfirmDelete}
      />
    </div>
  )
}
