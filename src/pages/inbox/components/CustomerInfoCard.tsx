import { useCallback, useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Check, Copy, MessageCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Conversation } from "../types"

interface CustomerInfoCardProps {
  conversation: Conversation
  className?: string
}

/**
 * Extracts initials from a customer's name for avatar fallback.
 */
function getCustomerInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

/**
 * Formats a WhatsApp number for display.
 */
function formatWhatsAppNumber(number: string): string {
  // Basic formatting: add spaces for readability
  const cleaned = number.replace(/\D/g, "")
  if (cleaned.length > 10) {
    return `+${cleaned.slice(0, -10)} ${cleaned.slice(-10, -7)} ${cleaned.slice(-7, -4)} ${cleaned.slice(-4)}`
  }
  return number
}

/**
 * CustomerInfoCard displays customer contact information for a conversation.
 * Includes avatar, name, WhatsApp number with copy functionality, and channel badge.
 */
export function CustomerInfoCard({
  conversation,
  className,
}: CustomerInfoCardProps) {
  const [copied, setCopied] = useState(false)

  const handleCopyNumber = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(conversation.customerWhatsappNumber)
      setCopied(true)
      // Reset copied state after a short delay
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error("Failed to copy number:", error)
    }
  }, [conversation.customerWhatsappNumber])

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center gap-4">
        <Avatar className="size-14">
          <AvatarImage
            src={conversation.customerAvatar}
            alt={conversation.customerName}
          />
          <AvatarFallback className="text-lg font-semibold">
            {getCustomerInitials(conversation.customerName)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold">
            {conversation.customerName}
          </h3>
          <div className="mt-1 flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto gap-1.5 px-2 py-1 text-muted-foreground hover:text-foreground"
                  onClick={handleCopyNumber}
                >
                  <span className="text-sm">
                    {formatWhatsAppNumber(conversation.customerWhatsappNumber)}
                  </span>
                  {copied ? (
                    <Check className="size-3.5 text-green-500" />
                  ) : (
                    <Copy className="size-3.5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {copied ? "Copied!" : "Click to copy"}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge
          variant="secondary"
          className="gap-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
        >
          <MessageCircle className="size-3" />
          WhatsApp
        </Badge>
      </div>
    </div>
  )
}
