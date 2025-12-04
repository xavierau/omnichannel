import type {
  ColumnDef,
  Table,
  Row,
  RowSelectionState,
  SortingState,
  ColumnFiltersState,
  VisibilityState,
} from "@tanstack/react-table"
import type { ReactNode } from "react"

export interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  isLoading?: boolean

  // Pagination
  pageSize?: number
  pageSizeOptions?: number[]

  // Selection
  enableRowSelection?: boolean | ((row: Row<TData>) => boolean)
  onSelectionChange?: (selectedRows: TData[]) => void

  // Bulk Actions (shown when rows selected)
  bulkActions?: BulkAction<TData>[]

  // Empty State
  emptyStateTitle?: string
  emptyStateDescription?: string
  emptyStateIcon?: ReactNode

  // Toolbar
  searchPlaceholder?: string
  searchColumn?: string
  filterableColumns?: FilterableColumn[]

  // Customization
  renderToolbar?: (table: Table<TData>) => ReactNode
  className?: string
}

export interface BulkAction<TData> {
  id: string
  label: string
  icon?: ReactNode
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost"
  onClick: (selectedRows: TData[]) => void | Promise<void>
  disabled?: boolean
}

export interface FilterableColumn {
  id: string
  title: string
  options: FilterOption[]
}

export interface FilterOption {
  label: string
  value: string
  icon?: ReactNode
}

export interface DataTableState {
  sorting: SortingState
  columnFilters: ColumnFiltersState
  columnVisibility: VisibilityState
  rowSelection: RowSelectionState
  globalFilter: string
}

export type { ColumnDef, Table, Row, SortingState, ColumnFiltersState, VisibilityState, RowSelectionState }
