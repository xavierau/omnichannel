import { MoreHorizontal, Pencil, Trash2, TestTube } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ChannelStatusBadge } from "./ChannelStatusBadge"
import type { WhatsAppConfig } from "../types"

interface ChannelConfigListProps {
  configs: WhatsAppConfig[]
  onEdit: (config: WhatsAppConfig) => void
  onDelete: (config: WhatsAppConfig) => void
  onTest: (config: WhatsAppConfig) => void
}

export function ChannelConfigList({
  configs,
  onEdit,
  onDelete,
  onTest,
}: ChannelConfigListProps) {
  if (configs.length === 0) {
    return (
      <div className="py-6 text-center text-muted-foreground">
        No configurations yet. Click "Add Configuration" to get started.
      </div>
    )
  }

  return (
    <div className="divide-y">
      {configs.map((config) => (
        <div
          key={config.id}
          className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium truncate">{config.name}</span>
              <ChannelStatusBadge status={config.status} />
            </div>
            <p className="text-sm text-muted-foreground truncate">
              Phone ID: {config.phoneNumberId}
            </p>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onTest(config)}>
                <TestTube className="mr-2 h-4 w-4" />
                Test Connection
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(config)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(config)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ))}
    </div>
  )
}
