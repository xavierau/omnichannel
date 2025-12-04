import * as React from "react"
import { X, Check, ChevronsUpDown } from "lucide-react"
import type { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import type {
  BroadcastFilters as BroadcastFiltersType,
  BroadcastStatus,
} from "../types"
import type { TemplateCategory } from "@/pages/whatsapp-templates/types"
import { BROADCAST_STATUSES, TEMPLATE_CATEGORIES } from "../types"

interface MultiSelectProps<T extends string> {
  options: { value: T; label: string }[]
  selected: T[]
  onChange: (selected: T[]) => void
  placeholder?: string
  emptyMessage?: string
}

function MultiSelect<T extends string>({
  options,
  selected,
  onChange,
  placeholder = "Select...",
  emptyMessage = "No options found.",
}: MultiSelectProps<T>) {
  const [open, setOpen] = React.useState(false)

  const handleSelect = (value: T) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value))
    } else {
      onChange([...selected, value])
    }
  }

  const selectedLabels = options
    .filter((opt) => selected.includes(opt.value))
    .map((opt) => opt.label)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          <span className="truncate">
            {selected.length > 0
              ? selectedLabels.length <= 2
                ? selectedLabels.join(", ")
                : `${selected.length} selected`
              : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search..." />
          <CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const isSelected = selected.includes(option.value)
                return (
                  <CommandItem
                    key={option.value}
                    value={option.label}
                    onSelect={() => handleSelect(option.value)}
                  >
                    <div
                      className={cn(
                        "mr-2 flex size-4 items-center justify-center rounded-sm border border-primary",
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : "opacity-50 [&_svg]:invisible"
                      )}
                    >
                      <Check className="size-4" />
                    </div>
                    {option.label}
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

interface BroadcastFiltersProps {
  filters: BroadcastFiltersType
  onFiltersChange: (filters: BroadcastFiltersType) => void
}

export function BroadcastFilters({
  filters,
  onFiltersChange,
}: BroadcastFiltersProps) {
  const handleStatusesChange = (statuses: BroadcastStatus[]) => {
    onFiltersChange({
      ...filters,
      statuses,
    })
  }

  const handleTemplateCategoriesChange = (templateCategories: TemplateCategory[]) => {
    onFiltersChange({
      ...filters,
      templateCategories,
    })
  }

  const handleDateRangeChange = (range: DateRange | undefined) => {
    onFiltersChange({
      ...filters,
      dateRange: {
        from: range?.from,
        to: range?.to,
      },
    })
  }

  const hasFilters =
    filters.statuses.length > 0 ||
    filters.templateCategories.length > 0 ||
    filters.dateRange.from ||
    filters.dateRange.to

  const handleClearAll = () => {
    onFiltersChange({
      search: filters.search,
      statuses: [],
      templateCategories: [],
      dateRange: { from: undefined, to: undefined },
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="w-[180px]">
        <MultiSelect
          options={BROADCAST_STATUSES}
          selected={filters.statuses}
          onChange={handleStatusesChange}
          placeholder="Status"
        />
      </div>

      <div className="w-[180px]">
        <MultiSelect
          options={TEMPLATE_CATEGORIES}
          selected={filters.templateCategories}
          onChange={handleTemplateCategoriesChange}
          placeholder="Template Category"
        />
      </div>

      <div className="w-[280px]">
        <DateRangePicker
          value={{
            from: filters.dateRange.from,
            to: filters.dateRange.to,
          }}
          onChange={handleDateRangeChange}
          placeholder="Filter by scheduled date..."
        />
      </div>

      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClearAll}
          className="h-8"
        >
          Clear filters
          <X className="ml-2 size-4" />
        </Button>
      )}
    </div>
  )
}
