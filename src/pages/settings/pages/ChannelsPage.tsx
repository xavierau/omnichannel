import { useState } from "react"
import { Plus, MoreHorizontal, Pencil, Trash2, TestTube } from "lucide-react"

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
} from "../types"
import {
  mockWhatsAppConfigs,
  mockTestConnection,
  mockSaveWhatsAppConfig,
  mockUpdateWhatsAppConfig,
  mockDeleteWhatsAppConfig,
} from "../data/mock-settings"

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
  const [whatsappConfigs, setWhatsappConfigs] = useState<WhatsAppConfig[]>(mockWhatsAppConfigs)

  // Dialog states
  const [isAddChannelDialogOpen, setIsAddChannelDialogOpen] = useState(false)
  const [isWhatsAppFormOpen, setIsWhatsAppFormOpen] = useState(false)
  const [editingConfig, setEditingConfig] = useState<WhatsAppConfig | undefined>(undefined)
  const [deletingConfig, setDeletingConfig] = useState<WhatsAppConfig | null>(null)

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

    await mockDeleteWhatsAppConfig(deletingConfig.id)
    setWhatsappConfigs((prev) => prev.filter((c) => c.id !== deletingConfig.id))
    setDeletingConfig(null)
  }

  const handleTestConfig = async (config: WhatsAppConfig) => {
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
      const updated = await mockUpdateWhatsAppConfig(editingConfig.id, data)
      setWhatsappConfigs((prev) =>
        prev.map((c) => (c.id === editingConfig.id ? updated : c))
      )
    } else {
      const created = await mockSaveWhatsAppConfig(data)
      setWhatsappConfigs((prev) => [...prev, created])
    }
  }

  const handleTestConnection = async (data: WhatsAppFormData): Promise<TestConnectionResult> => {
    return mockTestConnection(data)
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
        <Button onClick={() => setIsAddChannelDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Channel
        </Button>
      </div>

      {allConfigs.length === 0 ? (
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
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Open menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleTestConfig(config)}>
                          <TestTube className="mr-2 h-4 w-4" />
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
