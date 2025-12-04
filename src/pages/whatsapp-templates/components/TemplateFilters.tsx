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
  TemplateFilters as TemplateFiltersType,
  TemplateCategory,
  TemplateStatus,
  AggregatedStatus,
} from "../types"
import {
  TEMPLATE_CATEGORIES,
  TEMPLATE_STATUSES,
  AVAILABLE_LANGUAGES,
  AGGREGATED_STATUSES,
} from "../types"

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

interface TemplateFiltersProps {
  filters: TemplateFiltersType
  onFiltersChange: (filters: TemplateFiltersType) => void
}

export function TemplateFilters({
  filters,
  onFiltersChange,
}: TemplateFiltersProps) {
  const handleCategoriesChange = (categories: TemplateCategory[]) => {
    onFiltersChange({
      ...filters,
      categories,
    })
  }

  const handleStatusesChange = (statuses: TemplateStatus[]) => {
    onFiltersChange({
      ...filters,
      statuses,
    })
  }

  const handleLanguagesChange = (languages: string[]) => {
    onFiltersChange({
      ...filters,
      languages,
    })
  }

  const handleAggregatedStatusesChange = (
    aggregatedStatuses: AggregatedStatus[]
  ) => {
    onFiltersChange({
      ...filters,
      aggregatedStatuses,
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
    filters.categories.length > 0 ||
    filters.statuses.length > 0 ||
    filters.languages.length > 0 ||
    filters.aggregatedStatuses.length > 0 ||
    filters.dateRange.from ||
    filters.dateRange.to

  const handleClearAll = () => {
    onFiltersChange({
      search: filters.search,
      categories: [],
      statuses: [],
      languages: [],
      aggregatedStatuses: [],
      dateRange: { from: undefined, to: undefined },
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="w-[180px]">
        <MultiSelect
          options={TEMPLATE_CATEGORIES}
          selected={filters.categories}
          onChange={handleCategoriesChange}
          placeholder="Category"
        />
      </div>

      <div className="w-[180px]">
        <MultiSelect
          options={TEMPLATE_STATUSES}
          selected={filters.statuses}
          onChange={handleStatusesChange}
          placeholder="Status"
        />
      </div>

      <div className="w-[180px]">
        <MultiSelect
          options={AVAILABLE_LANGUAGES}
          selected={filters.languages}
          onChange={handleLanguagesChange}
          placeholder="Language"
        />
      </div>

      <div className="w-[180px]">
        <MultiSelect
          options={AGGREGATED_STATUSES}
          selected={filters.aggregatedStatuses}
          onChange={handleAggregatedStatusesChange}
          placeholder="Template Status"
        />
      </div>

      <div className="w-[280px]">
        <DateRangePicker
          value={{
            from: filters.dateRange.from,
            to: filters.dateRange.to,
          }}
          onChange={handleDateRangeChange}
          placeholder="Filter by date..."
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
