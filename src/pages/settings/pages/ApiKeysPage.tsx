import { useState, useEffect, useCallback } from "react"
import { Plus, Key } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import {
  ApiKeysTable,
  CreateApiKeyDialog,
  KeyCreatedDialog,
} from "../components/api-keys"
import { apiKeyService, type CreateApiKeyData } from "@/services/api-key.service"
import type { ApiKey } from "@/types/api-key"
import {
  channelAccountService,
  type ChannelAccount,
} from "@/services/channel-account.service"

export function ApiKeysPage() {
  // Data state
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [channelAccounts, setChannelAccounts] = useState<ChannelAccount[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [keyCreatedDialogOpen, setKeyCreatedDialogOpen] = useState(false)
  const [createdRawKey, setCreatedRawKey] = useState<string | null>(null)
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false)
  const [keyToRevoke, setKeyToRevoke] = useState<ApiKey | null>(null)

  // Fetch data on mount
  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [keys, accounts] = await Promise.all([
        apiKeyService.getApiKeys(),
        channelAccountService.getChannelAccounts(),
      ])
      setApiKeys(keys)
      setChannelAccounts(accounts)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load data"
      toast.error("Failed to load API keys", { description: message })
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Handle create flow
  const handleCreate = async (data: CreateApiKeyData) => {
    try {
      const response = await apiKeyService.createApiKey(data)
      setCreatedRawKey(response.rawKey)
      setCreateDialogOpen(false)
      setKeyCreatedDialogOpen(true)
      toast.success("API key created", {
        description: `${data.name} has been created successfully.`,
      })
      // Refresh list after showing raw key dialog
      await fetchData()
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create API key"
      toast.error("Failed to create API key", { description: message })
      throw err
    }
  }

  // Handle revoke flow
  const handleRevokeClick = (apiKey: ApiKey) => {
    setKeyToRevoke(apiKey)
    setRevokeDialogOpen(true)
  }

  const handleConfirmRevoke = async () => {
    if (!keyToRevoke) return

    try {
      await apiKeyService.revokeApiKey(keyToRevoke.id)
      toast.success("API key revoked", {
        description: `${keyToRevoke.name} has been revoked and can no longer be used.`,
      })
      await fetchData()
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to revoke API key"
      toast.error("Failed to revoke API key", { description: message })
      throw err
    }
  }

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="rounded-md border">
          <div className="p-4 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Empty state
  if (apiKeys.length === 0) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">API Keys</h1>
            <p className="text-muted-foreground">
              Manage API keys for external integrations
            </p>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create API Key
          </Button>
        </div>

        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="rounded-full bg-muted p-4 mb-4">
            <Key className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium">No API keys yet</h3>
          <p className="text-muted-foreground mt-1 mb-4 max-w-sm">
            Create an API key to allow external services and AI agents to interact with your conversations.
          </p>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create API Key
          </Button>
        </div>

        <CreateApiKeyDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          channelAccounts={channelAccounts}
          onSubmit={handleCreate}
        />

        {createdRawKey && (
          <KeyCreatedDialog
            open={keyCreatedDialogOpen}
            rawKey={createdRawKey}
            onClose={() => {
              setKeyCreatedDialogOpen(false)
              setCreatedRawKey(null)
            }}
          />
        )}
      </div>
    )
  }

  // Main content with table
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">API Keys</h1>
          <p className="text-muted-foreground">
            Manage API keys for external integrations
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create API Key
        </Button>
      </div>

      <ApiKeysTable apiKeys={apiKeys} onRevoke={handleRevokeClick} />

      <CreateApiKeyDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        channelAccounts={channelAccounts}
        onSubmit={handleCreate}
      />

      {createdRawKey && (
        <KeyCreatedDialog
          open={keyCreatedDialogOpen}
          rawKey={createdRawKey}
          onClose={() => {
            setKeyCreatedDialogOpen(false)
            setCreatedRawKey(null)
          }}
        />
      )}

      <ConfirmDialog
        open={revokeDialogOpen}
        onOpenChange={(open) => {
          setRevokeDialogOpen(open)
          if (!open) setKeyToRevoke(null)
        }}
        title="Revoke API Key"
        description={`Are you sure you want to revoke "${keyToRevoke?.name}"? This action cannot be undone and any integrations using this key will stop working immediately.`}
        confirmText="Revoke"
        cancelText="Cancel"
        variant="destructive"
        onConfirm={handleConfirmRevoke}
      />
    </div>
  )
}
