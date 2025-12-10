import { useState, useCallback } from "react"
import { Loader2 } from "lucide-react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { ApiKey } from "@/types/api-key"

interface RevokeApiKeyDialogProps {
  open: boolean
  apiKey: ApiKey | null
  onOpenChange: (open: boolean) => void
  onConfirm: () => Promise<void>
}

export function RevokeApiKeyDialog({
  open,
  apiKey,
  onOpenChange,
  onConfirm,
}: RevokeApiKeyDialogProps) {
  const [isRevoking, setIsRevoking] = useState(false)

  const handleConfirm = useCallback(async () => {
    setIsRevoking(true)
    try {
      await onConfirm()
      onOpenChange(false)
    } finally {
      setIsRevoking(false)
    }
  }, [onConfirm, onOpenChange])

  const handleCancel = useCallback(() => {
    onOpenChange(false)
  }, [onOpenChange])

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Revoke API Key</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to revoke the API key{" "}
            <span className="font-semibold text-foreground">
              "{apiKey?.name}"
            </span>
            ? This action cannot be undone and any applications using this key
            will immediately lose access.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel} disabled={isRevoking}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isRevoking}
            className={cn(buttonVariants({ variant: "destructive" }))}
          >
            {isRevoking && <Loader2 className="mr-2 size-4 animate-spin" />}
            Revoke Key
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
