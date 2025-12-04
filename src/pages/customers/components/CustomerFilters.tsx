import { X } from "lucide-react"
import type { DateRange } from "react-day-picker"

import { Button } from "@/components/ui/button"
import { TagSelector, type TagOption } from "@/components/ui/tag-selector"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import type { CustomerFilters as CustomerFiltersType, Tag } from "../types"

interface CustomerFiltersProps {
  filters: CustomerFiltersType
  onFiltersChange: (filters: CustomerFiltersType) => void
  availableTags: Tag[]
}

export function CustomerFilters({
  filters,
  onFiltersChange,
  availableTags,
}: CustomerFiltersProps) {
  const tagOptions: TagOption[] = availableTags.map((tag) => ({
    id: tag.id,
    name: tag.name,
    color: tag.color,
  }))

  const handleTagsChange = (selected: string[]) => {
    onFiltersChange({
      ...filters,
      tags: selected,
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

  const hasFilters = filters.tags.length > 0 || filters.dateRange.from || filters.dateRange.to

  const handleClearAll = () => {
    onFiltersChange({
      search: filters.search,
      tags: [],
      dateRange: { from: undefined, to: undefined },
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="w-[250px]">
        <TagSelector
          options={tagOptions}
          selected={filters.tags}
          onChange={handleTagsChange}
          placeholder="Filter by tags..."
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
