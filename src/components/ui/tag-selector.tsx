import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"

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
import { TagBadge, type TagColor } from "@/components/ui/tag-badge"

export interface TagOption {
  id: string
  name: string
  color: TagColor
}

interface TagSelectorProps {
  options: TagOption[]
  selected: string[]
  onChange: (selected: string[]) => void
  placeholder?: string
  emptyMessage?: string
  className?: string
  disabled?: boolean
}

export function TagSelector({
  options,
  selected,
  onChange,
  placeholder = "Select tags...",
  emptyMessage = "No tags found.",
  className,
  disabled = false,
}: TagSelectorProps) {
  const [open, setOpen] = React.useState(false)

  const selectedTags = options.filter((option) => selected.includes(option.id))

  const handleSelect = (tagId: string) => {
    if (selected.includes(tagId)) {
      onChange(selected.filter((id) => id !== tagId))
    } else {
      onChange([...selected, tagId])
    }
  }

  const handleRemove = (tagId: string) => {
    onChange(selected.filter((id) => id !== tagId))
  }

  return (
    <div className={cn("space-y-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            disabled={disabled}
          >
            <span className="truncate">
              {selected.length > 0
                ? `${selected.length} tag${selected.length > 1 ? "s" : ""} selected`
                : placeholder}
            </span>
            <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search tags..." />
            <CommandList>
              <CommandEmpty>{emptyMessage}</CommandEmpty>
              <CommandGroup>
                {options.map((option) => {
                  const isSelected = selected.includes(option.id)
                  return (
                    <CommandItem
                      key={option.id}
                      value={option.name}
                      onSelect={() => handleSelect(option.id)}
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
                      <TagBadge color={option.color} size="sm">
                        {option.name}
                      </TagBadge>
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Display selected tags */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedTags.map((tag) => (
            <TagBadge
              key={tag.id}
              color={tag.color}
              removable
              onRemove={() => handleRemove(tag.id)}
            >
              {tag.name}
            </TagBadge>
          ))}
        </div>
      )}
    </div>
  )
}
