import { useState } from "react"

import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { ChannelCard } from "./components/ChannelCard"
import { ChannelConfigList } from "./components/ChannelConfigList"
import { WhatsAppFormDialog } from "./components/WhatsAppFormDialog"
import {
  AVAILABLE_CHANNELS,
  type ChannelType,
  type WhatsAppConfig,
  type WhatsAppFormData,
  type TestConnectionResult,
} from "./types"
import {
  mockWhatsAppConfigs,
  mockTestConnection,
  mockSaveWhatsAppConfig,
  mockUpdateWhatsAppConfig,
  mockDeleteWhatsAppConfig,
} from "./data/mock-settings"

export function SettingsPage() {
  // State for WhatsApp configurations
  const [whatsappConfigs, setWhatsappConfigs] = useState<WhatsAppConfig[]>(mockWhatsAppConfigs)

  // UI state
  const [expandedChannel, setExpandedChannel] = useState<ChannelType | null>("whatsapp")

  // Dialog state
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false)
  const [editingConfig, setEditingConfig] = useState<WhatsAppConfig | undefined>(undefined)
  const [deletingConfig, setDeletingConfig] = useState<WhatsAppConfig | null>(null)

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

  const handleConfirmDelete = async () => {
    if (!deletingConfig) return

    await mockDeleteWhatsAppConfig(deletingConfig.id)
    setWhatsappConfigs((prev) => prev.filter((c) => c.id !== deletingConfig.id))
    setDeletingConfig(null)
  }

  const handleTestWhatsApp = async (config: WhatsAppConfig) => {
    const formData: WhatsAppFormData = {
      name: config.name,
      phoneNumberId: config.phoneNumberId,
      whatsappBusinessAccountId: config.whatsappBusinessAccountId,
      accessToken: config.accessToken,
      appId: config.appId,
      appSecret: config.appSecret,
      webhookVerifyToken: config.webhookVerifyToken ?? "",
    }

    const result = await mockTestConnection(formData)

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
  }

  const handleSubmitWhatsApp = async (data: WhatsAppFormData) => {
    if (editingConfig) {
      // Update existing
      const updated = await mockUpdateWhatsAppConfig(editingConfig.id, data)
      setWhatsappConfigs((prev) =>
        prev.map((c) => (c.id === editingConfig.id ? updated : c))
      )
    } else {
      // Create new
      const created = await mockSaveWhatsAppConfig(data)
      setWhatsappConfigs((prev) => [...prev, created])
    }
  }

  const handleTestConnection = async (data: WhatsAppFormData): Promise<TestConnectionResult> => {
    return mockTestConnection(data)
  }

  const getConfigCount = (channelType: ChannelType) => {
    if (channelType === "whatsapp") {
      return whatsappConfigs.length
    }
    return 0
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
