import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { ApiKeyPermission } from "@/types/api-key"

interface ApiKeyPermissionBadgesProps {
  permissions: ApiKeyPermission[]
  className?: string
}

/**
 * Maps full permission strings to short display labels.
 */
const PERMISSION_LABELS: Record<ApiKeyPermission, string> = {
  "conversation:read": "Read",
  "conversation:update_status": "Status",
  "conversation:assign": "Assign",
  "message:send": "Send",
}

/**
 * Defines the display order for permissions.
 * Ensures consistent ordering regardless of array order in props.
 */
const PERMISSION_ORDER: ApiKeyPermission[] = [
  "conversation:read",
  "conversation:update_status",
  "conversation:assign",
  "message:send",
]

export function ApiKeyPermissionBadges({
  permissions,
  className,
}: ApiKeyPermissionBadgesProps) {
  const sortedPermissions = PERMISSION_ORDER.filter((permission) =>
    permissions.includes(permission)
  )

  return (
    <div className={cn("flex flex-wrap gap-1", className)}>
      {sortedPermissions.map((permission) => (
        <Badge key={permission} variant="outline">
          {PERMISSION_LABELS[permission]}
        </Badge>
      ))}
    </div>
  )
}
