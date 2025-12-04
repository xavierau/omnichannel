import * as React from "react"
import {
  ExternalLink,
  FileText,
  Image,
  Phone,
  Copy,
  Video,
  RefreshCw,
  User,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { Customer } from "@/pages/customers/types"
import type { WhatsAppTemplate } from "@/pages/whatsapp-templates/types"
import type { TemplateVariablesConfig } from "../types"
import { substituteTemplateVariables } from "../utils/template-variables"

interface TemplatePreviewProps {
  template: WhatsAppTemplate
  variableConfig: TemplateVariablesConfig
  sampleCustomers?: Customer[]
}

export function TemplatePreview({
  template,
  variableConfig,
  sampleCustomers = [],
}: TemplatePreviewProps) {
  const [selectedCustomerId, setSelectedCustomerId] = React.useState<string>(
    sampleCustomers[0]?.id ?? ""
  )
  const [refreshKey, setRefreshKey] = React.useState(0)

  const selectedCustomer = sampleCustomers.find((c) => c.id === selectedCustomerId)

  const { headerText, body, buttonUrls } = React.useMemo(
    () => substituteTemplateVariables(template, variableConfig, selectedCustomer),
    [template, variableConfig, selectedCustomer, refreshKey]
  )

  const handleRefresh = () => {
    setRefreshKey((k) => k + 1)
  }

  // Get header media URL (from config or template default)
  const headerMediaUrl = variableConfig.header?.mediaUrl || template.header?.mediaUrl

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Preview</h3>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          className="gap-1.5 text-xs"
        >
          <RefreshCw className="size-3" />
          Refresh
        </Button>
      </div>

      {/* Customer Selector (if multiple customers available) */}
      {sampleCustomers.length > 1 && (
        <div className="flex items-center gap-2">
          <User className="size-4 text-muted-foreground" />
          <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
            <SelectTrigger className="h-8 w-[200px] text-xs">
              <SelectValue placeholder="Select sample customer" />
            </SelectTrigger>
            <SelectContent>
              {sampleCustomers.map((customer) => (
                <SelectItem key={customer.id} value={customer.id} className="text-xs">
                  {customer.name} ({customer.whatsappNumber})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* WhatsApp Message Preview */}
      <div className="rounded-lg border border-input bg-[#e5ddd5] p-4">
        <div className="mx-auto max-w-sm">
          {/* Message Bubble */}
          <div className="rounded-lg bg-white shadow-sm overflow-hidden">
            {/* Header Media */}
            {template.header && template.header.type !== "NONE" && (
              <div className="relative">
                {template.header.type === "IMAGE" && (
                  <div className="aspect-video bg-muted flex items-center justify-center">
                    {headerMediaUrl ? (
                      <img
                        src={headerMediaUrl}
                        alt="Header"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = "none"
                          e.currentTarget.nextElementSibling?.classList.remove("hidden")
                        }}
                      />
                    ) : null}
                    <div
                      className={`flex flex-col items-center justify-center gap-1 text-muted-foreground ${
                        headerMediaUrl ? "hidden" : ""
                      }`}
                    >
                      <Image className="size-8" />
                      <span className="text-xs">Image Header</span>
                    </div>
                  </div>
                )}

                {template.header.type === "VIDEO" && (
                  <div className="aspect-video bg-muted flex flex-col items-center justify-center gap-1 text-muted-foreground">
                    <Video className="size-8" />
                    <span className="text-xs">Video Header</span>
                  </div>
                )}

                {template.header.type === "DOCUMENT" && (
                  <div className="flex items-center gap-3 bg-muted p-3">
                    <div className="flex size-10 items-center justify-center rounded bg-red-100">
                      <FileText className="size-5 text-red-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">Document.pdf</p>
                      <p className="text-xs text-muted-foreground">PDF Document</p>
                    </div>
                  </div>
                )}

                {template.header.type === "TEXT" && headerText && (
                  <div className="px-3 pt-3">
                    <p className="font-semibold text-sm">{headerText}</p>
                  </div>
                )}
              </div>
            )}

            {/* Body */}
            <div className="p-3">
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{body}</p>
            </div>

            {/* Footer */}
            {template.footer && (
              <div className="px-3 pb-2">
                <p className="text-xs text-muted-foreground">{template.footer}</p>
              </div>
            )}

            {/* Buttons */}
            {template.buttons.length > 0 && (
              <div className="border-t border-input">
                {template.buttons.map((button, index) => {
                  const buttonUrl = buttonUrls.get(index) || button.url

                  // buttonUrl is available for future use when rendering the actual URL
                  void buttonUrl
                  return (
                    <div
                      key={button.id}
                      className="flex items-center justify-center gap-2 border-b border-input last:border-b-0 py-2.5 text-primary hover:bg-muted/50 transition-colors cursor-pointer"
                    >
                      {button.type === "URL" && <ExternalLink className="size-4" />}
                      {button.type === "CALL" && <Phone className="size-4" />}
                      {button.type === "COPY_CODE" && <Copy className="size-4" />}
                      <span className="text-sm font-medium">{button.text}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Timestamp */}
          <div className="mt-1 text-right">
            <span className="text-xs text-muted-foreground/70">
              {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        </div>
      </div>

      {/* Sample Info */}
      {selectedCustomer && (
        <p className="text-xs text-muted-foreground text-center">
          Preview using: <span className="font-medium">{selectedCustomer.name}</span> (
          {selectedCustomer.whatsappNumber})
        </p>
      )}

      {!selectedCustomer && sampleCustomers.length === 0 && (
        <p className="text-xs text-muted-foreground text-center">
          No sample customer available. Static values shown.
        </p>
      )}
    </div>
  )
}
