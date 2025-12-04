import * as React from "react"
import { CheckCircle2, XCircle, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { PasswordInput } from "./PasswordInput"
import type { WhatsAppFormData, WhatsAppFormErrors, TestConnectionResult } from "../types"
import { defaultWhatsAppFormData } from "../types"

interface WhatsAppSettingsFormProps {
  initialValues?: WhatsAppFormData
  onSubmit: (data: WhatsAppFormData) => Promise<void>
  onTestConnection: (data: WhatsAppFormData) => Promise<TestConnectionResult>
  onCancel?: () => void
  isSubmitting?: boolean
  isTesting?: boolean
  testResult?: TestConnectionResult | null
  isEditMode?: boolean
}

export function WhatsAppSettingsForm({
  initialValues,
  onSubmit,
  onTestConnection,
  onCancel,
  isSubmitting = false,
  isTesting = false,
  testResult,
  isEditMode = false,
}: WhatsAppSettingsFormProps) {
  const [name, setName] = React.useState(
    initialValues?.name ?? defaultWhatsAppFormData.name
  )
  const [phoneNumberId, setPhoneNumberId] = React.useState(
    initialValues?.phoneNumberId ?? defaultWhatsAppFormData.phoneNumberId
  )
  const [whatsappBusinessAccountId, setWhatsappBusinessAccountId] = React.useState(
    initialValues?.whatsappBusinessAccountId ?? defaultWhatsAppFormData.whatsappBusinessAccountId
  )
  const [accessToken, setAccessToken] = React.useState(
    initialValues?.accessToken ?? defaultWhatsAppFormData.accessToken
  )
  const [appId, setAppId] = React.useState(
    initialValues?.appId ?? defaultWhatsAppFormData.appId
  )
  const [appSecret, setAppSecret] = React.useState(
    initialValues?.appSecret ?? defaultWhatsAppFormData.appSecret
  )
  const [webhookVerifyToken, setWebhookVerifyToken] = React.useState(
    initialValues?.webhookVerifyToken ?? defaultWhatsAppFormData.webhookVerifyToken
  )
  const [errors, setErrors] = React.useState<WhatsAppFormErrors>({})

  const isDisabled = isSubmitting || isTesting

  const getFormData = (): WhatsAppFormData => ({
    name: name.trim(),
    phoneNumberId: phoneNumberId.trim(),
    whatsappBusinessAccountId: whatsappBusinessAccountId.trim(),
    accessToken: accessToken.trim(),
    appId: appId.trim(),
    appSecret: appSecret.trim(),
    webhookVerifyToken: webhookVerifyToken.trim(),
  })

  const validateForm = (): boolean => {
    const newErrors: WhatsAppFormErrors = {}

    // Name: required, minimum 2 characters
    if (!name.trim()) {
      newErrors.name = "Configuration name is required"
    } else if (name.trim().length < 2) {
      newErrors.name = "Name must be at least 2 characters"
    }

    // Phone Number ID: required, numeric only
    if (!phoneNumberId.trim()) {
      newErrors.phoneNumberId = "Phone Number ID is required"
    } else if (!/^\d+$/.test(phoneNumberId.trim())) {
      newErrors.phoneNumberId = "Phone Number ID must contain only digits"
    }

    // WhatsApp Business Account ID: required, numeric only
    if (!whatsappBusinessAccountId.trim()) {
      newErrors.whatsappBusinessAccountId = "Business Account ID is required"
    } else if (!/^\d+$/.test(whatsappBusinessAccountId.trim())) {
      newErrors.whatsappBusinessAccountId = "Business Account ID must contain only digits"
    }

    // Access Token: required, minimum 50 characters
    if (!accessToken.trim()) {
      newErrors.accessToken = "Access Token is required"
    } else if (accessToken.trim().length < 50) {
      newErrors.accessToken = "Access Token must be at least 50 characters"
    }

    // App ID: required, numeric only
    if (!appId.trim()) {
      newErrors.appId = "App ID is required"
    } else if (!/^\d+$/.test(appId.trim())) {
      newErrors.appId = "App ID must contain only digits"
    }

    // App Secret: required, minimum 32 characters
    if (!appSecret.trim()) {
      newErrors.appSecret = "App Secret is required"
    } else if (appSecret.trim().length < 32) {
      newErrors.appSecret = "App Secret must be at least 32 characters"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return
    await onSubmit(getFormData())
  }

  const handleTestConnection = async () => {
    if (!validateForm()) return
    await onTestConnection(getFormData())
  }

  const clearFieldError = (field: keyof WhatsAppFormErrors) => {
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {testResult && (
        <Alert
          variant={testResult.success ? "default" : "destructive"}
          className={testResult.success ? "border-emerald-500/25 bg-emerald-500/10" : ""}
        >
          {testResult.success ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          ) : (
            <XCircle className="h-4 w-4" />
          )}
          <AlertDescription className={testResult.success ? "text-emerald-700" : ""}>
            {testResult.message}
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <label htmlFor="name" className="text-sm font-medium">
          Configuration Name <span className="text-destructive">*</span>
        </label>
        <Input
          id="name"
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            clearFieldError("name")
          }}
          placeholder="e.g., Marketing Line, Support Number"
          aria-invalid={!!errors.name}
          disabled={isDisabled}
        />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name}</p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="phoneNumberId" className="text-sm font-medium">
            Phone Number ID <span className="text-destructive">*</span>
          </label>
          <Input
            id="phoneNumberId"
            type="text"
            value={phoneNumberId}
            onChange={(e) => {
              setPhoneNumberId(e.target.value)
              clearFieldError("phoneNumberId")
            }}
            placeholder="123456789012345"
            aria-invalid={!!errors.phoneNumberId}
            disabled={isDisabled}
          />
          {errors.phoneNumberId && (
            <p className="text-sm text-destructive">{errors.phoneNumberId}</p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="whatsappBusinessAccountId" className="text-sm font-medium">
            Business Account ID <span className="text-destructive">*</span>
          </label>
          <Input
            id="whatsappBusinessAccountId"
            type="text"
            value={whatsappBusinessAccountId}
            onChange={(e) => {
              setWhatsappBusinessAccountId(e.target.value)
              clearFieldError("whatsappBusinessAccountId")
            }}
            placeholder="987654321098765"
            aria-invalid={!!errors.whatsappBusinessAccountId}
            disabled={isDisabled}
          />
          {errors.whatsappBusinessAccountId && (
            <p className="text-sm text-destructive">{errors.whatsappBusinessAccountId}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="accessToken" className="text-sm font-medium">
          Access Token <span className="text-destructive">*</span>
        </label>
        <PasswordInput
          id="accessToken"
          value={accessToken}
          onChange={(e) => {
            setAccessToken(e.target.value)
            clearFieldError("accessToken")
          }}
          placeholder="EAAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx..."
          aria-invalid={!!errors.accessToken}
          disabled={isDisabled}
        />
        {errors.accessToken && (
          <p className="text-sm text-destructive">{errors.accessToken}</p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="appId" className="text-sm font-medium">
            App ID <span className="text-destructive">*</span>
          </label>
          <Input
            id="appId"
            type="text"
            value={appId}
            onChange={(e) => {
              setAppId(e.target.value)
              clearFieldError("appId")
            }}
            placeholder="1234567890123456"
            aria-invalid={!!errors.appId}
            disabled={isDisabled}
          />
          {errors.appId && (
            <p className="text-sm text-destructive">{errors.appId}</p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="appSecret" className="text-sm font-medium">
            App Secret <span className="text-destructive">*</span>
          </label>
          <PasswordInput
            id="appSecret"
            value={appSecret}
            onChange={(e) => {
              setAppSecret(e.target.value)
              clearFieldError("appSecret")
            }}
            placeholder="abc123def456ghi789..."
            aria-invalid={!!errors.appSecret}
            disabled={isDisabled}
          />
          {errors.appSecret && (
            <p className="text-sm text-destructive">{errors.appSecret}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="webhookVerifyToken" className="text-sm font-medium">
          Webhook Verify Token
        </label>
        <Input
          id="webhookVerifyToken"
          type="text"
          value={webhookVerifyToken}
          onChange={(e) => setWebhookVerifyToken(e.target.value)}
          placeholder="my-webhook-verify-token (optional)"
          disabled={isDisabled}
        />
        <p className="text-xs text-muted-foreground">
          Optional. Used to verify incoming webhook requests from Meta.
        </p>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        {onCancel && (
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={isDisabled}
          >
            Cancel
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          onClick={handleTestConnection}
          disabled={isDisabled}
        >
          {isTesting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Testing...
            </>
          ) : (
            "Test Connection"
          )}
        </Button>
        <Button type="submit" disabled={isDisabled}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : isEditMode ? (
            "Save Changes"
          ) : (
            "Add Configuration"
          )}
        </Button>
      </div>
    </form>
  )
}
