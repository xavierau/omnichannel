import { Phone } from "lucide-react"
import type { ColumnDef } from "@tanstack/react-table"

import { Checkbox } from "@/components/ui/checkbox"
import { DataTableColumnHeader } from "@/components/data-table"
import type { Customer } from "../types"
import { CustomerTagBadge } from "./CustomerTagBadge"
import { CustomerActions } from "./CustomerActions"

interface CustomerTableColumnsProps {
  onView?: (customer: Customer) => void
  onEdit?: (customer: Customer) => void
  onDelete?: (customer: Customer) => Promise<void>
  onMessage?: (customer: Customer) => void
}

export function getCustomerColumns({
  onView,
  onEdit,
  onDelete,
  onMessage,
}: CustomerTableColumnsProps = {}): ColumnDef<Customer>[] {
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
        <div className="font-medium">{row.getValue("name")}</div>
      ),
    },
    {
      accessorKey: "whatsappNumber",
      header: "WhatsApp",
      cell: ({ row }) => (
        <div className="flex items-center gap-2 text-sm">
          <Phone className="size-4 text-muted-foreground" />
          <span>{row.getValue("whatsappNumber")}</span>
        </div>
      ),
    },
    {
      accessorKey: "tags",
      header: "Tags",
      cell: ({ row }) => {
        const tags = row.original.tags
        return (
          <div className="flex flex-wrap gap-1">
            {tags.map((tag) => (
              <CustomerTagBadge key={tag.id} tag={tag} size="sm" />
            ))}
          </div>
        )
      },
      filterFn: (row, _id, filterValue: string[]) => {
        if (!filterValue || filterValue.length === 0) return true
        const tags = row.original.tags
        return tags.some((tag) => filterValue.includes(tag.id))
      },
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <CustomerActions
          customer={row.original}
          onView={onView}
          onEdit={onEdit}
          onDelete={onDelete}
          onMessage={onMessage}
        />
      ),
      enableHiding: false,
    },
  ]
}
