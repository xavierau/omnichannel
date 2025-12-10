import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

type ApiKeyStatus = "active" | "revoked" | "expired"

interface ApiKeyStatusBadgeProps {
  isActive: boolean
  expiresAt: string | null
  className?: string
}

/**
 * Status-specific styling configuration.
 * Maps API key status to Tailwind classes for consistent visual representation.
 */
const STATUS_STYLES: Record<ApiKeyStatus, string> = {
  active:
    "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800",
  revoked:
    "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
  expired:
    "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800",
}

const STATUS_LABELS: Record<ApiKeyStatus, string> = {
  active: "Active",
  revoked: "Revoked",
  expired: "Expired",
}

/**
 * Determines the status of an API key based on its active flag and expiration date.
 */
function getApiKeyStatus(isActive: boolean, expiresAt: string | null): ApiKeyStatus {
  if (!isActive) {
    return "revoked"
  }

  if (expiresAt && new Date(expiresAt) < new Date()) {
    return "expired"
  }

  return "active"
}

export function ApiKeyStatusBadge({
  isActive,
  expiresAt,
  className,
}: ApiKeyStatusBadgeProps) {
  const status = getApiKeyStatus(isActive, expiresAt)

  return (
    <Badge variant="outline" className={cn(STATUS_STYLES[status], className)}>
      {STATUS_LABELS[status]}
    </Badge>
  )
}
