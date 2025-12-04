import { useState } from "react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { WhatsAppSettingsForm } from "./WhatsAppSettingsForm"
import type { WhatsAppConfig, WhatsAppFormData, TestConnectionResult } from "../types"

interface WhatsAppFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  config?: WhatsAppConfig // If provided, we're editing
  onSubmit: (data: WhatsAppFormData) => Promise<void>
  onTestConnection: (data: WhatsAppFormData) => Promise<TestConnectionResult>
}

export function WhatsAppFormDialog({
  open,
  onOpenChange,
  config,
  onSubmit,
  onTestConnection,
}: WhatsAppFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState<TestConnectionResult | null>(null)

  const isEditMode = !!config

  const initialValues: WhatsAppFormData | undefined = config
    ? {
        name: config.name,
        phoneNumberId: config.phoneNumberId,
        whatsappBusinessAccountId: config.whatsappBusinessAccountId,
        accessToken: config.accessToken,
        appId: config.appId,
        appSecret: config.appSecret,
        webhookVerifyToken: config.webhookVerifyToken ?? "",
      }
    : undefined

  const handleSubmit = async (data: WhatsAppFormData) => {
    setIsSubmitting(true)
    try {
      await onSubmit(data)
      onOpenChange(false)
      setTestResult(null)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleTestConnection = async (data: WhatsAppFormData): Promise<TestConnectionResult> => {
    setIsTesting(true)
    setTestResult(null)
    try {
      const result = await onTestConnection(data)
      setTestResult(result)
      return result
    } finally {
      setIsTesting(false)
    }
  }

  const handleCancel = () => {
    onOpenChange(false)
    setTestResult(null)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "Edit WhatsApp Configuration" : "Add WhatsApp Configuration"}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? "Update your WhatsApp Business API credentials."
              : "Connect a new WhatsApp Business phone number to your platform."}
          </DialogDescription>
        </DialogHeader>

        <WhatsAppSettingsForm
          initialValues={initialValues}
          onSubmit={handleSubmit}
          onTestConnection={handleTestConnection}
          onCancel={handleCancel}
          isSubmitting={isSubmitting}
          isTesting={isTesting}
          testResult={testResult}
          isEditMode={isEditMode}
        />
      </DialogContent>
    </Dialog>
  )
}
