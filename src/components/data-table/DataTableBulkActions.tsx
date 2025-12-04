import type { Table } from "@tanstack/react-table"
import { X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import type { BulkAction } from "./types"

interface DataTableBulkActionsProps<TData> {
  table: Table<TData>
  bulkActions: BulkAction<TData>[]
}

export function DataTableBulkActions<TData>({
  table,
  bulkActions,
}: DataTableBulkActionsProps<TData>) {
  const selectedRows = table.getFilteredSelectedRowModel().rows
  const selectedCount = selectedRows.length

  const handleAction = async (action: BulkAction<TData>) => {
    const data = selectedRows.map((row) => row.original)
    await action.onClick(data)
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border bg-muted/50 p-2">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">
          {selectedCount} selected
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2"
          onClick={() => table.resetRowSelection()}
        >
          <X className="size-4" />
          <span className="sr-only">Clear selection</span>
        </Button>
      </div>
      <Separator orientation="vertical" className="h-6" />
      <div className="flex items-center gap-1">
        {bulkActions.map((action) => (
          <Button
            key={action.id}
            variant={action.variant ?? "ghost"}
            size="sm"
            className="h-7"
            disabled={action.disabled}
            onClick={() => handleAction(action)}
          >
            {action.icon}
            <span className="ml-1">{action.label}</span>
          </Button>
        ))}
      </div>
    </div>
  )
}
