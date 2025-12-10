import * as React from "react"
import {
  Copy,
  Check,
  Eye,
  EyeOff,
  RefreshCw,
  Loader2,
  AlertCircle,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard"
import { cn } from "@/lib/utils"

export interface WebhookConfigSectionProps {
  channelAccountId: string
  webhookUrl: string | null
  hasWebhookSecret: boolean
  webhookEventsEnabled: boolean
  onSave: (data: {
    webhookUrl: string | null
    webhookEventsEnabled: boolean
  }) => Promise<void>
  onRegenerateSecret: () => Promise<string>
  onTestWebhook: () => Promise<{ success: boolean; error?: string }>
}

/**
 * Validates a webhook URL to ensure it uses HTTPS protocol.
 */
function validateWebhookUrl(url: string): { valid: boolean; error?: string } {
  if (!url.trim()) {
    return { valid: true }
  }

  try {
    const parsed = new URL(url)
    if (parsed.protocol !== "https:") {
      return { valid: false, error: "Webhook URL must use HTTPS" }
    }
    return { valid: true }
  } catch {
    return { valid: false, error: "Invalid URL format" }
  }
}

export function WebhookConfigSection({
  webhookUrl: initialWebhookUrl,
  hasWebhookSecret,
  webhookEventsEnabled: initialEventsEnabled,
  onSave,
  onRegenerateSecret,
  onTestWebhook,
}: WebhookConfigSectionProps) {
  // Form state
  const [webhookUrl, setWebhookUrl] = React.useState(initialWebhookUrl ?? "")
  const [eventsEnabled, setEventsEnabled] = React.useState(initialEventsEnabled)
  const [urlError, setUrlError] = React.useState<string | null>(null)

  // Secret state
  const [currentSecret, setCurrentSecret] = React.useState<string | null>(null)
  const [secretVisible, setSecretVisible] = React.useState(false)

  // UI state
  const [isSaving, setIsSaving] = React.useState(false)
  const [isRegenerating, setIsRegenerating] = React.useState(false)
  const [isTesting, setIsTesting] = React.useState(false)
  const [showRegenerateConfirm, setShowRegenerateConfirm] = React.useState(false)

  const { copy: copySecret, copied: secretCopied } = useCopyToClipboard()

  // Track if form has unsaved changes
  const hasChanges = React.useMemo(() => {
    const urlChanged = (webhookUrl || null) !== (initialWebhookUrl || null)
    const eventsChanged = eventsEnabled !== initialEventsEnabled
    return urlChanged || eventsChanged
  }, [webhookUrl, initialWebhookUrl, eventsEnabled, initialEventsEnabled])

  // Validate URL on change
  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setWebhookUrl(value)

    if (value.trim()) {
      const validation = validateWebhookUrl(value)
      setUrlError(validation.error ?? null)
    } else {
      setUrlError(null)
    }
  }

  // Handle save
  const handleSave = async () => {
    const trimmedUrl = webhookUrl.trim()

    if (trimmedUrl) {
      const validation = validateWebhookUrl(trimmedUrl)
      if (!validation.valid) {
        setUrlError(validation.error ?? "Invalid URL")
        return
      }
    }

    setIsSaving(true)
    try {
      await onSave({
        webhookUrl: trimmedUrl || null,
        webhookEventsEnabled: eventsEnabled,
      })
      toast.success("Webhook settings saved")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save webhook settings"
      toast.error(message)
    } finally {
      setIsSaving(false)
    }
  }

  // Handle regenerate secret
  const handleRegenerateSecret = async () => {
    setIsRegenerating(true)
    try {
      const newSecret = await onRegenerateSecret()
      setCurrentSecret(newSecret)
      setSecretVisible(true)
      toast.success("Webhook secret regenerated")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to regenerate secret"
      toast.error(message)
    } finally {
      setIsRegenerating(false)
      setShowRegenerateConfirm(false)
    }
  }

  // Handle test webhook
  const handleTestWebhook = async () => {
    setIsTesting(true)
    try {
      const result = await onTestWebhook()
      if (result.success) {
        toast.success("Webhook test successful")
      } else {
        toast.error(result.error ?? "Webhook test failed")
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to test webhook"
      toast.error(message)
    } finally {
      setIsTesting(false)
    }
  }

  // Handle copy secret
  const handleCopySecret = () => {
    if (currentSecret) {
      copySecret(currentSecret)
      toast.success("Secret copied to clipboard")
    }
  }

  // Generate masked secret display
  const maskedSecret = React.useMemo(() => {
    if (currentSecret) {
      return secretVisible
        ? currentSecret
        : "*".repeat(Math.min(currentSecret.length, 32))
    }
    if (hasWebhookSecret) {
      return "*".repeat(32)
    }
    return ""
  }, [currentSecret, secretVisible, hasWebhookSecret])

  const isDisabled = isSaving || isRegenerating || isTesting

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div>
        <h3 className="text-lg font-medium">Webhooks & Integrations</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Receive notifications when events occur on this channel.
        </p>
      </div>

      {/* Webhook URL */}
      <div className="space-y-2">
        <Label htmlFor="webhook-url">Webhook URL</Label>
        <Input
          id="webhook-url"
          type="url"
          value={webhookUrl}
          onChange={handleUrlChange}
          placeholder="https://your-server.com/webhooks/omnichannel"
          aria-invalid={!!urlError}
          disabled={isDisabled}
        />
        {urlError ? (
          <p className="text-sm text-destructive">{urlError}</p>
        ) : (
          <p className="text-xs text-muted-foreground">
            URL to receive webhook notifications (must be HTTPS)
          </p>
        )}
      </div>

      {/* Webhook Secret */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Webhook Secret</Label>
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowRegenerateConfirm(true)}
                  disabled={isDisabled}
                >
                  <RefreshCw
                    className={cn("size-4 mr-1", isRegenerating && "animate-spin")}
                  />
                  Regenerate
                </Button>
              </TooltipTrigger>
              <TooltipContent>Generate a new webhook secret</TooltipContent>
            </Tooltip>

            {(currentSecret || hasWebhookSecret) && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    onClick={handleCopySecret}
                    disabled={isDisabled || !currentSecret}
                    aria-label={secretCopied ? "Copied" : "Copy secret"}
                  >
                    {secretCopied ? (
                      <Check className="size-4 text-emerald-500" />
                    ) : (
                      <Copy className="size-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {secretCopied ? "Copied!" : "Copy secret"}
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>

        <div className="relative">
          <Input
            value={maskedSecret}
            readOnly
            className={cn(
              "font-mono text-sm bg-muted pr-10",
              !hasWebhookSecret && !currentSecret && "text-muted-foreground"
            )}
            placeholder={!hasWebhookSecret && !currentSecret ? "No secret configured" : ""}
            aria-label="Webhook secret"
          />
          {(currentSecret || hasWebhookSecret) && (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="absolute right-1 top-1/2 -translate-y-1/2"
              onClick={() => setSecretVisible(!secretVisible)}
              disabled={!currentSecret}
              aria-label={secretVisible ? "Hide secret" : "Show secret"}
            >
              {secretVisible ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </Button>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          Used to verify webhook signatures (HMAC-SHA256)
        </p>
        {hasWebhookSecret && !currentSecret && (
          <Alert className="border-amber-500/25 bg-amber-500/10">
            <AlertCircle className="size-4 text-amber-600" />
            <AlertDescription className="text-amber-700">
              Secret is only shown after regenerating. Make sure to copy it immediately.
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Events */}
      <div className="space-y-3">
        <Label>Events</Label>
        <label className="flex items-start gap-3 cursor-pointer">
          <Checkbox
            checked={eventsEnabled}
            onCheckedChange={(checked) => setEventsEnabled(checked === true)}
            disabled={isDisabled}
            className="mt-0.5"
          />
          <div className="space-y-1">
            <span className="text-sm font-medium">Unassigned message received</span>
            <p className="text-xs text-muted-foreground">
              Triggered when a message arrives for an unassigned conversation
            </p>
          </div>
        </label>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={handleTestWebhook}
          disabled={isDisabled || !webhookUrl.trim()}
        >
          {isTesting ? (
            <>
              <Loader2 className="size-4 mr-2 animate-spin" />
              Testing...
            </>
          ) : (
            "Test Webhook"
          )}
        </Button>

        <Button
          type="button"
          onClick={handleSave}
          disabled={isDisabled || !hasChanges || !!urlError}
        >
          {isSaving ? (
            <>
              <Loader2 className="size-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Changes"
          )}
        </Button>
      </div>

      {/* Regenerate Confirmation Dialog */}
      <ConfirmDialog
        open={showRegenerateConfirm}
        onOpenChange={setShowRegenerateConfirm}
        title="Regenerate Webhook Secret"
        description="This will invalidate the current secret. Any integrations using the old secret will stop working. Are you sure you want to continue?"
        confirmText="Regenerate"
        variant="destructive"
        onConfirm={handleRegenerateSecret}
      />
    </div>
  )
}
