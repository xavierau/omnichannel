import { formatDistanceToNow } from "date-fns"
import { FileText, Image, Video, File, type LucideIcon } from "lucide-react"
import type { ColumnDef } from "@tanstack/react-table"

import { Checkbox } from "@/components/ui/checkbox"
import { DataTableColumnHeader } from "@/components/data-table"
import { Badge } from "@/components/ui/badge"
import type { WhatsAppTemplate, HeaderType } from "../types"
import { TemplateStatusBadge } from "./TemplateStatusBadge"
import { TemplateQualityBadge } from "./TemplateQualityBadge"
import { TemplateCategoryBadge } from "./TemplateCategoryBadge"
import { TemplatePreview } from "./TemplatePreview"
import { TemplateActions } from "./TemplateActions"
import { AVAILABLE_LANGUAGES } from "../types"

interface TemplateTableColumnsProps {
  onView?: (template: WhatsAppTemplate) => void
  onEdit?: (template: WhatsAppTemplate) => void
  onDuplicate?: (template: WhatsAppTemplate) => void
  onSendTest?: (template: WhatsAppTemplate) => void
  onUseBroadcast?: (template: WhatsAppTemplate) => void
  onSubmitApproval?: (template: WhatsAppTemplate) => void
  onViewHistory?: (template: WhatsAppTemplate) => void
  onDelete?: (template: WhatsAppTemplate) => Promise<void>
}

const headerTypeIcons: Record<HeaderType, LucideIcon | null> = {
  TEXT: FileText,
  IMAGE: Image,
  VIDEO: Video,
  DOCUMENT: File,
  NONE: null,
}

function getLanguageLabel(code: string): string {
  const lang = AVAILABLE_LANGUAGES.find((l) => l.value === code)
  return lang?.label ?? code
}

export function getTemplateColumns({
  onView,
  onEdit,
  onDuplicate,
  onSendTest,
  onUseBroadcast,
  onSubmitApproval,
  onViewHistory,
  onDelete,
}: TemplateTableColumnsProps = {}): ColumnDef<WhatsAppTemplate>[] {
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
        <div className="font-medium font-mono text-sm">{row.getValue("name")}</div>
      ),
    },
    {
      accessorKey: "category",
      header: "Category",
      cell: ({ row }) => (
        <TemplateCategoryBadge category={row.getValue("category")} />
      ),
      filterFn: (row, _id, filterValue: string[]) => {
        if (!filterValue || filterValue.length === 0) return true
        return filterValue.includes(row.getValue("category"))
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <TemplateStatusBadge status={row.getValue("status")} />,
      filterFn: (row, _id, filterValue: string[]) => {
        if (!filterValue || filterValue.length === 0) return true
        return filterValue.includes(row.getValue("status"))
      },
    },
    {
      accessorKey: "quality",
      header: "Quality",
      cell: ({ row }) => <TemplateQualityBadge quality={row.original.quality} />,
    },
    {
      accessorKey: "language",
      header: "Language",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {getLanguageLabel(row.getValue("language"))}
        </span>
      ),
      filterFn: (row, _id, filterValue: string[]) => {
        if (!filterValue || filterValue.length === 0) return true
        return filterValue.includes(row.getValue("language"))
      },
    },
    {
      id: "header",
      header: "Header",
      cell: ({ row }) => {
        const header = row.original.header
        const headerType = header?.type ?? "NONE"
        const Icon = headerTypeIcons[headerType]

        if (!Icon) {
          return <span className="text-sm text-muted-foreground">—</span>
        }

        return (
          <div className="flex items-center gap-1.5">
            <Icon className="size-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground capitalize">
              {headerType.toLowerCase()}
            </span>
          </div>
        )
      },
    },
    {
      accessorKey: "body",
      header: "Preview",
      cell: ({ row }) => (
        <TemplatePreview body={row.getValue("body")} maxLength={40} />
      ),
    },
    {
      id: "buttons",
      header: "Buttons",
      cell: ({ row }) => {
        const buttonCount = row.original.buttons.length
        if (buttonCount === 0) {
          return <span className="text-sm text-muted-foreground">—</span>
        }
        return (
          <Badge variant="secondary" className="text-xs">
            {buttonCount} {buttonCount === 1 ? "button" : "buttons"}
          </Badge>
        )
      },
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
        <TemplateActions
          template={row.original}
          onView={onView}
          onEdit={onEdit}
          onDuplicate={onDuplicate}
          onSendTest={onSendTest}
          onUseBroadcast={onUseBroadcast}
          onSubmitApproval={onSubmitApproval}
          onViewHistory={onViewHistory}
          onDelete={onDelete}
        />
      ),
      enableHiding: false,
    },
  ]
}
