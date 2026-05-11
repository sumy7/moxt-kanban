import { useState } from "react"
import { format, isValid, parseISO } from "date-fns"
import { CalendarIcon, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

function toDate(value: string | null | undefined): Date | undefined {
  if (!value) return undefined
  try {
    const d = parseISO(value)
    return isValid(d) ? d : undefined
  } catch {
    return undefined
  }
}

type DatePickerProps = {
  value?: string | null
  placeholder?: string
  title?: string
  onValueChange?: (value: string | null) => void
}

export function DatePicker({
  value,
  placeholder = "Select date",
  title,
  onValueChange,
}: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const selectedDate = toDate(value)

  function handleSelect(date: Date | undefined): void {
    onValueChange?.(date ? format(date, "yyyy-MM-dd") : null)
    if (date) setOpen(false)
  }

  function clearDate(): void {
    onValueChange?.(null)
    setOpen(false)
  }

  return (
    <div className="flex items-center gap-1.5">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            title={title}
            className="inline-flex h-9 w-full items-center justify-between rounded-none border border-input bg-background px-3 py-2 text-xs focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            <span
              className={
                selectedDate ? "text-foreground" : "text-muted-foreground"
              }
            >
              {selectedDate ? format(selectedDate, "yyyy-MM-dd") : placeholder}
            </span>
            <CalendarIcon className="size-4 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto rounded-none p-0" align="start">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleSelect}
          />
        </PopoverContent>
      </Popover>

      {selectedDate ? (
        <Button
          type="button"
          size="icon-xs"
          variant="ghost"
          onClick={clearDate}
          title="Clear date"
        >
          <X className="size-3.5" />
          <span className="sr-only">Clear date</span>
        </Button>
      ) : null}
    </div>
  )
}
