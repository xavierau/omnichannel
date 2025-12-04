import * as React from "react"
import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import type { FieldRendererProps } from "@/types/custom-fields"

export function DateFieldRenderer({
  definition,
  value,
  onChange,
  error,
  disabled,
  id,
}: FieldRendererProps) {
  const [open, setOpen] = React.useState(false)

  const dateValue = value ? new Date(value as string | Date) : undefined
  const isValidDate = dateValue instanceof Date && !isNaN(dateValue.getTime())

  const handleSelect = (date: Date | undefined) => {
    onChange(date ? date.toISOString() : null)
    setOpen(false)
  }

  const formatString = definition.fieldType === "DATETIME" ? "PPP p" : "PPP"

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground"
          )}
          aria-invalid={!!error}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 size-4" />
          {isValidDate
            ? format(dateValue, formatString)
            : definition.description ?? "Pick a date"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={isValidDate ? dateValue : undefined}
          onSelect={handleSelect}
        />
      </PopoverContent>
    </Popover>
  )
}
