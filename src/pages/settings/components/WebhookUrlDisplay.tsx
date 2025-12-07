import * as React from "react"
import { Copy, Check, Eye, EyeOff, Link, Shield } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard"
import { cn } from "@/lib/utils"

interface WebhookUrlDisplayProps {
  webhookUrl: string
  verifyToken: string
  isConfigured?: boolean
  className?: string
}

/**
 * Displays webhook URL and verify token with copy functionality.
 *
 * Features:
 * - Read-only URL display with copy button
 * - Masked verify token with reveal toggle
 * - Copy buttons with visual feedback
 * - Configuration status indicator
 */
export function WebhookUrlDisplay({
  webhookUrl,
  verifyToken,
  isConfigured = false,
  className,
}: WebhookUrlDisplayProps) {
  const [tokenVisible, setTokenVisible] = React.useState(false)
  const {
    copy: copyUrl,
    copied: urlCopied,
    error: urlError,
  } = useCopyToClipboard()
  const {
    copy: copyToken,
    copied: tokenCopied,
    error: tokenError,
  } = useCopyToClipboard()

  const maskedToken = React.useMemo(() => {
    if (!verifyToken) return ""
    if (verifyToken.length <= 8) return "*".repeat(verifyToken.length)
    return verifyToken.slice(0, 4) + "*".repeat(verifyToken.length - 8) + verifyToken.slice(-4)
  }, [verifyToken])

  const handleCopyUrl = () => {
    copyUrl(webhookUrl)
  }

  const handleCopyToken = () => {
    copyToken(verifyToken)
  }

  const toggleTokenVisibility = () => {
    setTokenVisible((prev) => !prev)
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Status Badge */}
      <div className="flex items-center gap-2">
        <Badge
          variant={isConfigured ? "default" : "secondary"}
          className={cn(
            isConfigured
              ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/25"
              : ""
          )}
        >
          {isConfigured ? (
            <>
              <Check className="mr-1 size-3" />
              Configured
            </>
          ) : (
            "Not Configured"
          )}
        </Badge>
      </div>

      {/* Webhook URL */}
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm font-medium">
          <Link className="size-4" />
          Webhook URL
        </label>
        <div className="flex gap-2">
          <Input
            value={webhookUrl}
            readOnly
            className="font-mono text-sm bg-muted"
            aria-label="Webhook URL"
          />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleCopyUrl}
                aria-label={urlCopied ? "Copied" : "Copy webhook URL"}
              >
                {urlCopied ? (
                  <Check className="size-4 text-emerald-500" />
                ) : (
                  <Copy className="size-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {urlCopied ? "Copied!" : "Copy webhook URL"}
            </TooltipContent>
          </Tooltip>
        </div>
        {urlError && (
          <p className="text-xs text-destructive">{urlError.message}</p>
        )}
        <p className="text-xs text-muted-foreground">
          Use this URL in your Meta App webhook configuration.
        </p>
      </div>

      {/* Verify Token */}
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm font-medium">
          <Shield className="size-4" />
          Verify Token
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              value={tokenVisible ? verifyToken : maskedToken}
              readOnly
              className="font-mono text-sm bg-muted pr-10"
              aria-label="Verify token"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
              onClick={toggleTokenVisibility}
              aria-label={tokenVisible ? "Hide token" : "Show token"}
            >
              {tokenVisible ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </Button>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleCopyToken}
                aria-label={tokenCopied ? "Copied" : "Copy verify token"}
              >
                {tokenCopied ? (
                  <Check className="size-4 text-emerald-500" />
                ) : (
                  <Copy className="size-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {tokenCopied ? "Copied!" : "Copy verify token"}
            </TooltipContent>
          </Tooltip>
        </div>
        {tokenError && (
          <p className="text-xs text-destructive">{tokenError.message}</p>
        )}
        <p className="text-xs text-muted-foreground">
          Enter this token in Meta App when configuring the webhook.
        </p>
      </div>
    </div>
  )
}
