import * as React from "react"
import { Loader2 } from "lucide-react"

import { WebhookConfigSection } from "./WebhookConfigSection"
import {
  channelAccountService,
  type WebhookSettings,
} from "@/services/channel-account.service"

interface WebhookIntegrationsSectionProps {
  channelAccountId: string
}

/**
 * Wrapper component that fetches webhook settings and provides handlers
 * to the WebhookConfigSection component.
 */
export function WebhookIntegrationsSection({
  channelAccountId,
}: WebhookIntegrationsSectionProps) {
  const [settings, setSettings] = React.useState<WebhookSettings | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  // Fetch webhook settings on mount
  React.useEffect(() => {
    async function fetchSettings() {
      setIsLoading(true)
      setError(null)
      try {
        const data = await channelAccountService.getWebhookSettings(channelAccountId)
        setSettings(data)
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load webhook settings"
        setError(message)
      } finally {
        setIsLoading(false)
      }
    }

    fetchSettings()
  }, [channelAccountId])

  // Handle save
  const handleSave = async (data: {
    webhookUrl: string | null
    webhookEventsEnabled: boolean
  }) => {
    await channelAccountService.updateWebhookSettings(channelAccountId, data)
    // Update local state to reflect saved values
    setSettings((prev) =>
      prev
        ? {
            ...prev,
            webhookUrl: data.webhookUrl,
            webhookEventsEnabled: data.webhookEventsEnabled,
          }
        : null
    )
  }

  // Handle regenerate secret
  const handleRegenerateSecret = async (): Promise<string> => {
    const result = await channelAccountService.regenerateWebhookSecret(channelAccountId)
    // Update local state to indicate a secret exists
    setSettings((prev) => (prev ? { ...prev, hasWebhookSecret: true } : null))
    return result.secret
  }

  // Handle test webhook
  const handleTestWebhook = async (): Promise<{ success: boolean; error?: string }> => {
    return channelAccountService.testWebhook(channelAccountId)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-sm text-destructive py-4">
        {error}
      </div>
    )
  }

  if (!settings) {
    return null
  }

  return (
    <WebhookConfigSection
      channelAccountId={channelAccountId}
      webhookUrl={settings.webhookUrl}
      hasWebhookSecret={settings.hasWebhookSecret}
      webhookEventsEnabled={settings.webhookEventsEnabled}
      onSave={handleSave}
      onRegenerateSecret={handleRegenerateSecret}
      onTestWebhook={handleTestWebhook}
    />
  )
}
