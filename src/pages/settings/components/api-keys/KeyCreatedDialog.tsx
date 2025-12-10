import { useState, useCallback } from "react"
import { Check, Copy, AlertTriangle } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface KeyCreatedDialogProps {
  open: boolean
  rawKey: string
  onClose: () => void
}

export function KeyCreatedDialog({ open, rawKey, onClose }: KeyCreatedDialogProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    if (!rawKey) return

    try {
      await navigator.clipboard.writeText(rawKey)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard API not available - fall back to selection
      const textarea = document.createElement("textarea")
      textarea.value = rawKey
      document.body.appendChild(textarea)
      textarea.select()
      try {
        document.execCommand("copy")
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch {
        // Copy failed
      }
      document.body.removeChild(textarea)
    }
  }, [rawKey])

  const handleClose = useCallback(() => {
    setCopied(false)
    onClose()
  }, [onClose])

  // Prevent closing by clicking outside or pressing Escape
  const handleInteractOutside = useCallback((event: Event) => {
    event.preventDefault()
  }, [])

  const handleEscapeKeyDown = useCallback((event: KeyboardEvent) => {
    event.preventDefault()
  }, [])

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="sm:max-w-[500px]"
        onPointerDownOutside={handleInteractOutside}
        onEscapeKeyDown={handleEscapeKeyDown}
        onInteractOutside={handleInteractOutside}
        showCloseButton={false}
      >
        <DialogHeader>
          <DialogTitle>API Key Created</DialogTitle>
          <DialogDescription>
            Your new API key has been created successfully.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="size-4" />
            <AlertDescription className="font-medium">
              This key will only be shown once. Store it securely now.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <label className="text-sm font-medium">Your API Key</label>
            <div className="flex items-start gap-2">
              <code className="flex-1 rounded-md bg-muted p-3 font-mono text-sm break-all select-all">
                {rawKey}
              </code>
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopy}
                className="shrink-0"
                aria-label={copied ? "Copied" : "Copy to clipboard"}
              >
                {copied ? (
                  <Check className="size-4 text-green-500" />
                ) : (
                  <Copy className="size-4" />
                )}
              </Button>
            </div>
            {copied && (
              <p className="text-sm text-green-600">Copied to clipboard!</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
