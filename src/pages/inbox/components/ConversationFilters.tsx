import { useCallback, useState } from "react"
import { Check, ChevronDown, Filter, Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  CONVERSATION_STATUSES,
  type ConversationFilters as ConversationFiltersType,
  type ConversationStatus,
} from "../types"

interface ConversationFiltersProps {
  filters: ConversationFiltersType
  onFiltersChange: (filters: ConversationFiltersType) => void
}

const ASSIGNMENT_OPTIONS = [
  { value: "all", label: "All Conversations" },
  { value: "unassigned", label: "Unassigned" },
  { value: "mine", label: "My Conversations" },
] as const

type AssignmentValue = (typeof ASSIGNMENT_OPTIONS)[number]["value"]

export function ConversationFilters({
  filters,
  onFiltersChange,
}: ConversationFiltersProps) {
  const [statusPopoverOpen, setStatusPopoverOpen] = useState(false)
  const [assignmentPopoverOpen, setAssignmentPopoverOpen] = useState(false)

  // Search input change handler with debounce consideration
  const handleSearchChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onFiltersChange({
        ...filters,
        search: event.target.value,
      })
    },
    [filters, onFiltersChange]
  )

  // Clear search input
  const handleClearSearch = useCallback(() => {
    onFiltersChange({
      ...filters,
      search: "",
    })
  }, [filters, onFiltersChange])

  // Toggle status filter selection
  const handleStatusToggle = useCallback(
    (status: ConversationStatus) => {
      const newStatuses = filters.statuses.includes(status)
        ? filters.statuses.filter((s) => s !== status)
        : [...filters.statuses, status]

      onFiltersChange({
        ...filters,
        statuses: newStatuses,
      })
    },
    [filters, onFiltersChange]
  )

  // Clear all status filters
  const handleClearStatuses = useCallback(() => {
    onFiltersChange({
      ...filters,
      statuses: [],
    })
  }, [filters, onFiltersChange])

  // Assignment filter change
  const handleAssignmentChange = useCallback(
    (value: AssignmentValue) => {
      onFiltersChange({
        ...filters,
        assignedTo: value,
      })
      setAssignmentPopoverOpen(false)
    },
    [filters, onFiltersChange]
  )

  const selectedAssignmentLabel =
    ASSIGNMENT_OPTIONS.find((opt) => opt.value === filters.assignedTo)?.label ??
    "All Conversations"

  const hasActiveFilters =
    filters.statuses.length > 0 || filters.assignedTo !== "all"

  return (
    <div className="flex flex-col gap-3 p-4 border-b">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search conversations..."
          value={filters.search}
          onChange={handleSearchChange}
          className="pl-9 pr-9"
        />
        {filters.search && (
          <button
            type="button"
            onClick={handleClearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Clear search"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {/* Filter Row */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Status Multi-Select Filter */}
        <Popover open={statusPopoverOpen} onOpenChange={setStatusPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-8 gap-1",
                filters.statuses.length > 0 && "border-primary"
              )}
            >
              <Filter className="size-3.5" />
              Status
              {filters.statuses.length > 0 && (
                <Badge
                  variant="secondary"
                  className="ml-1 px-1.5 py-0 h-5 min-w-5 text-xs"
                >
                  {filters.statuses.length}
                </Badge>
              )}
              <ChevronDown className="size-3.5 ml-1" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-52 p-0" align="start">
            <Command>
              <CommandList>
                <CommandEmpty>No status found.</CommandEmpty>
                <CommandGroup>
                  {CONVERSATION_STATUSES.map((status) => {
                    const isSelected = filters.statuses.includes(status.value)
                    return (
                      <CommandItem
                        key={status.value}
                        onSelect={() => handleStatusToggle(status.value)}
                        className="cursor-pointer"
                      >
                        <div
                          className={cn(
                            "mr-2 flex size-4 items-center justify-center rounded-sm border",
                            isSelected
                              ? "bg-primary border-primary text-primary-foreground"
                              : "border-muted-foreground/30"
                          )}
                        >
                          {isSelected && <Check className="size-3" />}
                        </div>
                        <span>{status.label}</span>
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
              </CommandList>
            </Command>
            {filters.statuses.length > 0 && (
              <div className="border-t p-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearStatuses}
                  className="w-full h-8 text-xs"
                >
                  Clear filters
                </Button>
              </div>
            )}
          </PopoverContent>
        </Popover>

        {/* Assignment Filter */}
        <Popover
          open={assignmentPopoverOpen}
          onOpenChange={setAssignmentPopoverOpen}
        >
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-8 gap-1",
                filters.assignedTo !== "all" && "border-primary"
              )}
            >
              {selectedAssignmentLabel}
              <ChevronDown className="size-3.5 ml-1" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-0" align="start">
            <Command>
              <CommandList>
                <CommandGroup>
                  {ASSIGNMENT_OPTIONS.map((option) => (
                    <CommandItem
                      key={option.value}
                      onSelect={() => handleAssignmentChange(option.value)}
                      className="cursor-pointer"
                    >
                      <Check
                        className={cn(
                          "mr-2 size-4",
                          filters.assignedTo === option.value
                            ? "opacity-100"
                            : "opacity-0"
                        )}
                      />
                      {option.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {/* Clear All Filters Button */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              onFiltersChange({
                ...filters,
                statuses: [],
                assignedTo: "all",
              })
            }
            className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <X className="size-3.5 mr-1" />
            Clear all
          </Button>
        )}
      </div>

      {/* Active Filter Tags */}
      {filters.statuses.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {filters.statuses.map((status) => {
            const statusConfig = CONVERSATION_STATUSES.find(
              (s) => s.value === status
            )
            return (
              <Badge
                key={status}
                variant="secondary"
                className="gap-1 pr-1"
              >
                {statusConfig?.label ?? status}
                <button
                  type="button"
                  onClick={() => handleStatusToggle(status)}
                  className="ml-0.5 rounded-full hover:bg-muted-foreground/20 p-0.5"
                  aria-label={`Remove ${statusConfig?.label ?? status} filter`}
                >
                  <X className="size-3" />
                </button>
              </Badge>
            )
          })}
        </div>
      )}
    </div>
  )
}
