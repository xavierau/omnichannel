import * as React from "react"
import { formatDistanceToNow } from "date-fns"
import {
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ExpandedState,
  type SortingState,
  type RowSelectionState,
} from "@tanstack/react-table"
import { ChevronDown, ChevronRight } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { DataTableColumnHeader, DataTablePagination } from "@/components/data-table"

import type { WhatsAppTemplateGroup, TemplateTranslation } from "../types"
import { getAggregatedStatus, getLanguageLabel } from "../types"
import { TemplateCategoryBadge } from "./TemplateCategoryBadge"
import { TemplateStatusBadge } from "./TemplateStatusBadge"
import { TemplateQualityBadge } from "./TemplateQualityBadge"
import { TemplatePreview } from "./TemplatePreview"
import { AggregatedStatusBadge } from "./AggregatedStatusBadge"
import { LanguagesBadgeList } from "./LanguagesBadgeList"
import { TemplateGroupActions } from "./TemplateGroupActions"
import { TranslationActions } from "./TranslationActions"

interface TemplateGroupTableProps {
  data: WhatsAppTemplateGroup[]
  isLoading?: boolean
  onAddTranslation?: (group: WhatsAppTemplateGroup) => void
  onExportGroup?: (group: WhatsAppTemplateGroup) => void
  onDeleteGroup?: (group: WhatsAppTemplateGroup) => Promise<void>
  onViewTranslation?: (
    group: WhatsAppTemplateGroup,
    translation: TemplateTranslation
  ) => void
  onEditTranslation?: (
    group: WhatsAppTemplateGroup,
    translation: TemplateTranslation
  ) => void
  onDuplicateTranslation?: (
    group: WhatsAppTemplateGroup,
    translation: TemplateTranslation
  ) => void
  onSendTestTranslation?: (
    group: WhatsAppTemplateGroup,
    translation: TemplateTranslation
  ) => void
  onUseBroadcastTranslation?: (
    group: WhatsAppTemplateGroup,
    translation: TemplateTranslation
  ) => void
  onSubmitApprovalTranslation?: (
    group: WhatsAppTemplateGroup,
    translation: TemplateTranslation
  ) => void
  onDeleteTranslation?: (
    group: WhatsAppTemplateGroup,
    translation: TemplateTranslation
  ) => Promise<void>
  onSelectionChange?: (groups: WhatsAppTemplateGroup[]) => void
  className?: string
}

export function TemplateGroupTable({
  data,
  isLoading = false,
  onAddTranslation,
  onExportGroup,
  onDeleteGroup,
  onViewTranslation,
  onEditTranslation,
  onDuplicateTranslation,
  onSendTestTranslation,
  onUseBroadcastTranslation,
  onSubmitApprovalTranslation,
  onDeleteTranslation,
  onSelectionChange,
  className,
}: TemplateGroupTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [expanded, setExpanded] = React.useState<ExpandedState>({})
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({})

  const columns: ColumnDef<WhatsAppTemplateGroup>[] = React.useMemo(
    () => [
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
        id: "expander",
        header: () => null,
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="sm"
            className="size-8 p-0"
            onClick={() => row.toggleExpanded()}
            disabled={row.original.translations.length === 0}
          >
            {row.getIsExpanded() ? (
              <ChevronDown className="size-4" />
            ) : (
              <ChevronRight className="size-4" />
            )}
          </Button>
        ),
        enableSorting: false,
        enableHiding: false,
      },
      {
        accessorKey: "name",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Template Name" />
        ),
        cell: ({ row }) => (
          <div className="font-medium font-mono text-sm">
            {row.getValue("name")}
          </div>
        ),
      },
      {
        accessorKey: "category",
        header: "Category",
        cell: ({ row }) => (
          <TemplateCategoryBadge category={row.getValue("category")} />
        ),
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => {
          const status = getAggregatedStatus(row.original.translations)
          return <AggregatedStatusBadge status={status} />
        },
      },
      {
        id: "languages",
        header: "Languages",
        cell: ({ row }) => (
          <LanguagesBadgeList translations={row.original.translations} />
        ),
      },
      {
        id: "translationCount",
        header: "Translations",
        cell: ({ row }) => (
          <Badge variant="secondary">
            {row.original.translations.length}
          </Badge>
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
          <TemplateGroupActions
            group={row.original}
            onAddTranslation={onAddTranslation}
            onExport={onExportGroup}
            onDelete={onDeleteGroup}
          />
        ),
        enableHiding: false,
      },
    ],
    [onAddTranslation, onExportGroup, onDeleteGroup]
  )

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onExpandedChange: setExpanded,
    onRowSelectionChange: setRowSelection,
    getRowCanExpand: (row) => row.original.translations.length > 0,
    enableRowSelection: true,
    state: {
      sorting,
      expanded,
      rowSelection,
    },
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  })

  // Create stable primitive for comparison to avoid re-running on every render
  const selectedRowIds = React.useMemo(
    () => Object.keys(rowSelection).sort().join(","),
    [rowSelection]
  )

  // Skip initial mount notification
  const isFirstRender = React.useRef(true)

  // Notify parent of selection changes
  React.useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }

    if (onSelectionChange) {
      const selectedRows = data.filter((_, idx) =>
        rowSelection[idx.toString()]
      )
      onSelectionChange(selectedRows)
    }
  }, [selectedRowIds, onSelectionChange, data])

  if (isLoading) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="rounded-md border">
          <div className="h-[400px] flex items-center justify-center text-muted-foreground">
            Loading...
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <React.Fragment key={row.id}>
                  {/* Parent row */}
                  <TableRow data-state={row.getIsSelected() && "selected"}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>

                  {/* Expanded translations */}
                  {row.getIsExpanded() && (
                    <>
                      {/* Sub-header row */}
                      <TableRow className="bg-muted/30 hover:bg-muted/30">
                        <TableCell colSpan={2} />
                        <TableCell className="text-xs font-medium text-muted-foreground">
                          Language
                        </TableCell>
                        <TableCell className="text-xs font-medium text-muted-foreground">
                          Status
                        </TableCell>
                        <TableCell className="text-xs font-medium text-muted-foreground">
                          Quality
                        </TableCell>
                        <TableCell className="text-xs font-medium text-muted-foreground">
                          Preview
                        </TableCell>
                        <TableCell className="text-xs font-medium text-muted-foreground">
                          Updated
                        </TableCell>
                        <TableCell className="text-xs font-medium text-muted-foreground">
                          Actions
                        </TableCell>
                      </TableRow>

                      {/* Translation rows */}
                      {row.original.translations.map((translation) => (
                        <TableRow
                          key={translation.id}
                          className="bg-muted/10 hover:bg-muted/20"
                        >
                          <TableCell colSpan={2} />
                          <TableCell>
                            <span className="text-sm">
                              {getLanguageLabel(translation.language)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <TemplateStatusBadge status={translation.status} />
                          </TableCell>
                          <TableCell>
                            <TemplateQualityBadge quality={translation.quality} />
                          </TableCell>
                          <TableCell>
                            <TemplatePreview
                              body={translation.body}
                              maxLength={40}
                            />
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {formatDistanceToNow(translation.updatedAt, {
                                addSuffix: true,
                              })}
                            </span>
                          </TableCell>
                          <TableCell>
                            <TranslationActions
                              group={row.original}
                              translation={translation}
                              onView={onViewTranslation}
                              onEdit={onEditTranslation}
                              onDuplicate={onDuplicateTranslation}
                              onSendTest={onSendTestTranslation}
                              onUseBroadcast={onUseBroadcastTranslation}
                              onSubmitApproval={onSubmitApprovalTranslation}
                              onDelete={onDeleteTranslation}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </>
                  )}
                </React.Fragment>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No templates found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <DataTablePagination table={table} />
    </div>
  )
}
