import type { Table } from "@tanstack/react-table"
import { X, Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DataTableViewOptions } from "./DataTableViewOptions"
import { DataTableFacetedFilter } from "./DataTableFacetedFilter"
import type { FilterableColumn } from "./types"

interface DataTableToolbarProps<TData> {
  table: Table<TData>
  searchPlaceholder?: string
  searchColumn?: string
  filterableColumns?: FilterableColumn[]
  globalFilter: string
  setGlobalFilter: (value: string) => void
}

export function DataTableToolbar<TData>({
  table,
  searchPlaceholder = "Search...",
  searchColumn,
  filterableColumns,
  globalFilter,
  setGlobalFilter,
}: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0 || globalFilter.length > 0

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-1 items-center space-x-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={searchColumn
              ? (table.getColumn(searchColumn)?.getFilterValue() as string) ?? ""
              : globalFilter
            }
            onChange={(event) => {
              if (searchColumn) {
                table.getColumn(searchColumn)?.setFilterValue(event.target.value)
              } else {
                setGlobalFilter(event.target.value)
              }
            }}
            className="h-8 w-[150px] pl-8 lg:w-[250px]"
          />
        </div>
        {filterableColumns?.map((column) => {
          const tableColumn = table.getColumn(column.id)
          if (!tableColumn) return null
          return (
            <DataTableFacetedFilter
              key={column.id}
              column={tableColumn}
              title={column.title}
              options={column.options}
            />
          )
        })}
        {isFiltered && (
          <Button
            variant="ghost"
            onClick={() => {
              table.resetColumnFilters()
              setGlobalFilter("")
            }}
            className="h-8 px-2 lg:px-3"
          >
            Reset
            <X className="ml-2 size-4" />
          </Button>
        )}
      </div>
      <DataTableViewOptions table={table} />
    </div>
  )
}
