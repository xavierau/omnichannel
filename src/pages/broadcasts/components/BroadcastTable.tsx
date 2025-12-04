import { format, formatDistanceToNow } from "date-fns"
import { Clock, Users } from "lucide-react"
import type { ColumnDef } from "@tanstack/react-table"

import { Checkbox } from "@/components/ui/checkbox"
import { DataTableColumnHeader } from "@/components/data-table"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import type { Broadcast } from "../types"
import { BroadcastStatusBadge } from "./BroadcastStatusBadge"
import { BroadcastProgress } from "./BroadcastProgress"
import { BroadcastActions } from "./BroadcastActions"
import { TemplateCategoryBadge } from "@/pages/whatsapp-templates/components/TemplateCategoryBadge"

interface BroadcastTableColumnsProps {
  onViewDetails?: (broadcast: Broadcast) => void
  onEdit?: (broadcast: Broadcast) => void
  onSchedule?: (broadcast: Broadcast) => void
  onPause?: (broadcast: Broadcast) => void
  onResume?: (broadcast: Broadcast) => void
  onCancel?: (broadcast: Broadcast) => Promise<void>
  onRetry?: (broadcast: Broadcast) => void
  onDuplicate?: (broadcast: Broadcast) => void
  onViewReport?: (broadcast: Broadcast) => void
  onDelete?: (broadcast: Broadcast) => Promise<void>
}

export function getBroadcastColumns({
  onViewDetails,
  onEdit,
  onSchedule,
  onPause,
  onResume,
  onCancel,
  onRetry,
  onDuplicate,
  onViewReport,
  onDelete,
}: BroadcastTableColumnsProps = {}): ColumnDef<Broadcast>[] {
  return [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
          className="translate-y-[2px]"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
          className="translate-y-[2px]"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Name" />
      ),
      cell: ({ row }) => (
        <div className="max-w-[200px]">
          <div className="font-medium text-sm truncate">{row.getValue("name")}</div>
          {row.original.description && (
            <div className="text-xs text-muted-foreground truncate">
              {row.original.description}
            </div>
          )}
        </div>
      ),
    },
    {
      id: "template",
      header: "Template",
      cell: ({ row }) => (
        <div className="space-y-1">
          <div className="text-sm font-mono truncate max-w-[150px]">
            {row.original.templateName}
          </div>
          <TemplateCategoryBadge category={row.original.templateCategory} />
        </div>
      ),
    },
    {
      id: "recipients",
      header: "Recipients",
      cell: ({ row }) => {
        const { recipientType, groupName, totalRecipients } = row.original
        return (
          <div className="flex items-center gap-2">
            <Users className="size-4 text-muted-foreground" />
            <div>
              {recipientType === "GROUP" ? (
                <div className="text-sm">{groupName}</div>
              ) : (
                <div className="text-sm">{totalRecipients} customers</div>
              )}
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: "scheduledAt",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Scheduled" />
      ),
      cell: ({ row }) => {
        const { scheduledAt, isImmediate, timezone } = row.original

        if (isImmediate) {
          return (
            <span className="text-sm text-muted-foreground">Immediate</span>
          )
        }

        if (!scheduledAt) {
          return (
            <span className="text-sm text-muted-foreground">Not scheduled</span>
          )
        }

        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1.5">
                  <Clock className="size-3.5 text-muted-foreground" />
                  <div>
                    <div className="text-sm">
                      {format(scheduledAt, "MMM d, yyyy")}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {format(scheduledAt, "h:mm a")}
                    </div>
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-xs">
                  <div>{format(scheduledAt, "PPpp")}</div>
                  <div className="text-muted-foreground">{timezone}</div>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <BroadcastStatusBadge status={row.getValue("status")} />,
      filterFn: (row, _id, filterValue: string[]) => {
        if (!filterValue || filterValue.length === 0) return true
        return filterValue.includes(row.getValue("status"))
      },
    },
    {
      id: "progress",
      header: "Progress",
      cell: ({ row }) => (
        <BroadcastProgress broadcast={row.original} className="min-w-[120px]" />
      ),
    },
    {
      accessorKey: "updatedAt",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Updated" />
      ),
      cell: ({ row }) => {
        const date = row.getValue("updatedAt") as Date
        return (
          <span className="text-sm text-muted-foreground">
            {formatDistanceToNow(date, { addSuffix: true })}
          </span>
        )
      },
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <BroadcastActions
          broadcast={row.original}
          onViewDetails={onViewDetails}
          onEdit={onEdit}
          onSchedule={onSchedule}
          onPause={onPause}
          onResume={onResume}
          onCancel={onCancel}
          onRetry={onRetry}
          onDuplicate={onDuplicate}
          onViewReport={onViewReport}
          onDelete={onDelete}
        />
      ),
      enableHiding: false,
    },
  ]
}
