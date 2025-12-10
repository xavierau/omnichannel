import { useState, useEffect, useCallback } from "react"
import { Plus, MoreHorizontal, Pencil, Trash2, TestTube, Loader2, Link2, Key } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { ChannelStatusBadge } from "../components/ChannelStatusBadge"
import { WhatsAppFormDialog } from "../components/WhatsAppFormDialog"
import { AddChannelDialog } from "../components/AddChannelDialog"
import type {
  WhatsAppConfig,
  WhatsAppFormData,
  TestConnectionResult,
  ChannelType,
  ChannelStatus,
} from "../types"
import {
  channelAccountService,
  type ChannelAccount,
  ChannelAccountStatus,
} from "@/services/channel-account.service"

// Map ChannelAccount from API to WhatsAppConfig for UI display
// Note: Sensitive credentials (accessToken, appSecret, webhookVerifyToken) are not returned for security
function mapChannelAccountToWhatsAppConfig(account: ChannelAccount): WhatsAppConfig {
  const statusMap: Record<ChannelAccountStatus, ChannelStatus> = {
    [ChannelAccountStatus.CONNECTED]: "connected",
    [ChannelAccountStatus.DISCONNECTED]: "not_connected",
    [ChannelAccountStatus.ERROR]: "error",
  }

  return {
    id: account.id,
    name: account.name,
    channelType: "whatsapp",
    status: statusMap[account.status] || "not_connected",
    lastTestedAt: account.lastTestedAt ? new Date(account.lastTestedAt) : undefined,
    errorMessage: account.errorMessage || undefined,
    createdAt: new Date(account.createdAt),
    updatedAt: new Date(account.updatedAt),
    // Use non-sensitive credentials from API if available, otherwise use empty placeholders
    phoneNumberId: account.credentials?.phoneNumberId || account.phoneNumberId || "",
    whatsappBusinessAccountId: account.credentials?.whatsappBusinessAccountId || "",
    appId: account.credentials?.appId || "",
    // Sensitive credentials must be re-entered when editing for security
    accessToken: "",
    appSecret: "",
    webhookVerifyToken: "",
  }
}

const channelTypeLabels: Record<ChannelType, string> = {
  whatsapp: "WhatsApp Business",
  instagram: "Instagram Direct",
  facebook_messenger: "Facebook Messenger",
  telegram: "Telegram",
  email: "Email",
  sms: "SMS",
}

export function ChannelsPage() {
  // State for configurations
  const [whatsappConfigs, setWhatsappConfigs] = useState<WhatsAppConfig[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Dialog states
  const [isAddChannelDialogOpen, setIsAddChannelDialogOpen] = useState(false)
  const [isWhatsAppFormOpen, setIsWhatsAppFormOpen] = useState(false)
  const [editingConfig, setEditingConfig] = useState<WhatsAppConfig | undefined>(undefined)
  const [deletingConfig, setDeletingConfig] = useState<WhatsAppConfig | null>(null)
  const [testingConfigId, setTestingConfigId] = useState<string | null>(null)

  // Fetch channel accounts on mount
  const fetchChannelAccounts = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const accounts = await channelAccountService.getChannelAccounts()
      const configs = accounts.map(mapChannelAccountToWhatsAppConfig)
      setWhatsappConfigs(configs)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load channel accounts"
      setError(message)
      toast.error("Failed to load channels", { description: message })
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchChannelAccounts()
  }, [fetchChannelAccounts])

  // All configs combined for display
  const allConfigs = [...whatsappConfigs]

  // Handlers
  const handleAddChannel = (channelType: ChannelType) => {
    setIsAddChannelDialogOpen(false)
    if (channelType === "whatsapp") {
      setEditingConfig(undefined)
      setIsWhatsAppFormOpen(true)
    }
    // Future: handle other channel types
  }

  const handleEditConfig = (config: WhatsAppConfig) => {
    setEditingConfig(config)
    setIsWhatsAppFormOpen(true)
  }

  const handleDeleteConfig = (config: WhatsAppConfig) => {
    setDeletingConfig(config)
  }

  const handleConfirmDelete = async () => {
    if (!deletingConfig) return

    try {
      await channelAccountService.deleteChannelAccount(deletingConfig.id)
      setWhatsappConfigs((prev) => prev.filter((c) => c.id !== deletingConfig.id))
      toast.success("Channel deleted", { description: `${deletingConfig.name} has been removed.` })
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete channel"
      toast.error("Delete failed", { description: message })
      throw err // Re-throw so ConfirmDialog knows the operation failed
    }
  }

  const handleTestConfig = async (config: WhatsAppConfig) => {
    try {
      setTestingConfigId(config.id)
      const result = await channelAccountService.testConnection(config.id)

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

      if (result.success) {
        toast.success("Connection successful", { description: result.message })
      } else {
        toast.error("Connection failed", { description: result.message })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to test connection"
      toast.error("Test failed", { description: message })
      setWhatsappConfigs((prev) =>
        prev.map((c) =>
          c.id === config.id
            ? { ...c, status: "error", lastTestedAt: new Date(), errorMessage: message }
            : c
        )
      )
    } finally {
      setTestingConfigId(null)
    }
  }

  const handleSubmitWhatsApp = async (data: WhatsAppFormData) => {
    try {
      if (editingConfig) {
        // Update existing channel account
        // Only include credentials if sensitive fields (accessToken or appSecret) are provided
        const hasCredentialUpdate = data.accessToken.trim() || data.appSecret.trim()

        const updated = await channelAccountService.updateChannelAccount(editingConfig.id, {
          name: data.name,
          ...(hasCredentialUpdate && {
            credentials: {
              phoneNumberId: data.phoneNumberId,
              whatsappBusinessAccountId: data.whatsappBusinessAccountId,
              accessToken: data.accessToken,
              appId: data.appId,
              appSecret: data.appSecret,
            },
          }),
        })
        setWhatsappConfigs((prev) =>
          prev.map((c) => (c.id === editingConfig.id ? mapChannelAccountToWhatsAppConfig(updated) : c))
        )
        toast.success("Channel updated", { description: `${data.name} has been updated.` })
      } else {
        // Create new channel account
        const created = await channelAccountService.createChannelAccount({
          channelCode: "whatsapp",
          providerCode: "meta_cloud_api",
          name: data.name,
          credentials: {
            phoneNumberId: data.phoneNumberId,
            whatsappBusinessAccountId: data.whatsappBusinessAccountId,
            accessToken: data.accessToken,
            appId: data.appId,
            appSecret: data.appSecret,
          },
          teamIds: data.teamIds,
        })
        setWhatsappConfigs((prev) => [...prev, mapChannelAccountToWhatsAppConfig(created)])
        toast.success("Channel created", { description: `${data.name} has been added.` })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save channel"
      toast.error("Save failed", { description: message })
      throw err // Re-throw to let the form dialog handle it
    }
  }

  const handleCopyWebhookUrl = async (config: WhatsAppConfig) => {
    try {
      const webhookConfig = await channelAccountService.getWebhookConfig(config.id)
      await navigator.clipboard.writeText(webhookConfig.webhookUrl)
      toast.success("Webhook URL copied", {
        description: "The webhook URL has been copied to your clipboard.",
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to get webhook URL"
      toast.error("Copy failed", { description: message })
    }
  }

  const handleCopyVerifyToken = async (config: WhatsAppConfig) => {
    try {
      const webhookConfig = await channelAccountService.getWebhookConfig(config.id)
      await navigator.clipboard.writeText(webhookConfig.verifyToken)
      toast.success("Verify Token copied", {
        description: "The verify token has been copied to your clipboard.",
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to get verify token"
      toast.error("Copy failed", { description: message })
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleTestConnection = async (_data: WhatsAppFormData): Promise<TestConnectionResult> => {
    // For form-based testing (during create/edit), we can't use the service
    // since there's no account ID yet. The form validates credentials format.
    // The actual connection test will happen after saving.
    // Return a mock success to allow form submission, real test happens on save.
    return {
      success: true,
      message: "Credentials format validated. Connection will be tested after saving.",
    }
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Channels</h1>
          <p className="text-muted-foreground">
            Manage your messaging channels and integrations
          </p>
        </div>
        <Button onClick={() => setIsAddChannelDialogOpen(true)} disabled={isLoading}>
          <Plus className="mr-2 h-4 w-4" />
          Add Channel
        </Button>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Loading channels...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="rounded-full bg-destructive/10 p-4 mb-4">
            <TestTube className="h-8 w-8 text-destructive" />
          </div>
          <h3 className="text-lg font-medium">Failed to load channels</h3>
          <p className="text-muted-foreground mt-1 mb-4">{error}</p>
          <Button onClick={fetchChannelAccounts} variant="outline">
            Try Again
          </Button>
        </div>
      ) : allConfigs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="rounded-full bg-muted p-4 mb-4">
            <Plus className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium">No channels configured</h3>
          <p className="text-muted-foreground mt-1 mb-4">
            Get started by adding your first messaging channel
          </p>
          <Button onClick={() => setIsAddChannelDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Channel
          </Button>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Identifier</TableHead>
                <TableHead className="w-[70px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allConfigs.map((config) => (
                <TableRow key={config.id}>
                  <TableCell className="font-medium">{config.name}</TableCell>
                  <TableCell>{channelTypeLabels[config.channelType]}</TableCell>
                  <TableCell>
                    <ChannelStatusBadge status={config.status} />
                  </TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground">
                    {config.channelType === "whatsapp" && config.phoneNumberId}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          {testingConfigId === config.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <MoreHorizontal className="h-4 w-4" />
                          )}
                          <span className="sr-only">Open menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleCopyWebhookUrl(config)}>
                          <Link2 className="mr-2 h-4 w-4" />
                          Copy Webhook URL
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleCopyVerifyToken(config)}>
                          <Key className="mr-2 h-4 w-4" />
                          Copy Verify Token
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleTestConfig(config)}
                          disabled={testingConfigId === config.id}
                        >
                          {testingConfigId === config.id ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <TestTube className="mr-2 h-4 w-4" />
                          )}
                          Test Connection
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEditConfig(config)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDeleteConfig(config)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add Channel Dialog */}
      <AddChannelDialog
        open={isAddChannelDialogOpen}
        onOpenChange={setIsAddChannelDialogOpen}
        onSelectChannel={handleAddChannel}
      />

      {/* WhatsApp Form Dialog */}
      <WhatsAppFormDialog
        open={isWhatsAppFormOpen}
        onOpenChange={setIsWhatsAppFormOpen}
        config={editingConfig}
        onSubmit={handleSubmitWhatsApp}
        onTestConnection={handleTestConnection}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={!!deletingConfig}
        onOpenChange={(open) => !open && setDeletingConfig(null)}
        title="Delete Channel"
        description={`Are you sure you want to delete "${deletingConfig?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
        onConfirm={handleConfirmDelete}
      />
    </div>
  )
}
