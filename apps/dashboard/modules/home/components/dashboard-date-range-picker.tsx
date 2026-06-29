"use client"

import * as React from "react"
import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"
import type { DateRange } from "react-day-picker"
import { Button } from "@/shared/components/ui/button"
import { Calendar } from "@/shared/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/shared/components/ui/popover"

interface DashboardDateRangePickerProps {
    from: Date
    to: Date
    onChange: (range: { from: Date; to: Date }) => void
}

export function DashboardDateRangePicker({
    from,
    to,
    onChange,
}: DashboardDateRangePickerProps) {
    const [open, setOpen] = React.useState(false)

    const handleSelect = (range: DateRange | undefined) => {
        if (range?.from && range?.to) {
            onChange({ from: range.from, to: range.to })
            setOpen(false)
        }
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2 h-9">
                    <CalendarIcon className="h-4 w-4 shrink-0" />
                    <span>
                        {format(from, "MMM d")} – {format(to, "MMM d, yyyy")}
                    </span>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                    mode="range"
                    selected={{ from, to }}
                    onSelect={handleSelect}
                    numberOfMonths={2}
                    disabled={(date) => date > new Date()}
                />
            </PopoverContent>
        </Popover>
    )
}
