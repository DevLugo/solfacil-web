'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react'
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { getWeekOfDate } from '../utils/weekUtils'

interface WeekSelectorProps {
  year: number
  weekNumber: number
  onChange: (year: number, weekNumber: number) => void
  disabled?: boolean
}

/**
 * Visual week selector component using a calendar
 * Shows week ranges and allows easy selection
 */
export function WeekSelector({
  year,
  weekNumber,
  onChange,
  disabled,
}: WeekSelectorProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [displayMonth, setDisplayMonth] = useState<Date>(new Date())
  const [isOpen, setIsOpen] = useState(false)
  const [hoveredDate, setHoveredDate] = useState<Date | undefined>(undefined)

  // Calculate week start and end dates based on year and weekNumber
  useEffect(() => {
    // Find a date that belongs to the selected week
    const today = new Date()
    const currentYear = today.getFullYear()

    // Start from January 1st of the selected year
    const date = new Date(year, 0, 1)

    // Find the first Monday of the year
    const dayOfWeek = date.getDay()
    // Monday is 1, so calculate days to first Monday
    const daysToFirstMonday = dayOfWeek === 0 ? 1 : dayOfWeek === 1 ? 0 : 8 - dayOfWeek
    const firstMonday = new Date(year, 0, 1 + daysToFirstMonday)

    // Calculate the target date (middle of the week)
    const targetDate = new Date(firstMonday)
    targetDate.setDate(firstMonday.getDate() + (weekNumber - 1) * 7 + 3) // +3 to get mid-week

    setSelectedDate(targetDate)
    setDisplayMonth(targetDate)
  }, [year, weekNumber])

  // Get week boundaries (Monday to Sunday)
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 }) // 1 = Monday
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 })

  // Handle date selection from calendar
  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return

    const weekInfo = getWeekOfDate(date)
    onChange(weekInfo.year, weekInfo.weekNumber)
    setIsOpen(false)
  }

  // Navigate to previous week
  const handlePreviousWeek = () => {
    const newDate = subWeeks(selectedDate, 1)
    const weekInfo = getWeekOfDate(newDate)
    onChange(weekInfo.year, weekInfo.weekNumber)
  }

  // Navigate to next week
  const handleNextWeek = () => {
    const newDate = addWeeks(selectedDate, 1)
    const weekInfo = getWeekOfDate(newDate)
    onChange(weekInfo.year, weekInfo.weekNumber)
  }

  // Navigate to current week
  const handleToday = () => {
    const today = new Date()
    const weekInfo = getWeekOfDate(today)
    onChange(weekInfo.year, weekInfo.weekNumber)
  }

  return (
    <div className="space-y-4">
      {/* Week navigation */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={handlePreviousWeek}
          disabled={disabled}
          title="Semana anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'flex-1 justify-start text-left font-normal',
                !selectedDate && 'text-muted-foreground'
              )}
              disabled={disabled}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              <div className="flex flex-col flex-1">
                <span className="font-medium">
                  Semana {weekNumber}, {year}
                </span>
                <span className="text-xs text-muted-foreground">
                  {format(weekStart, "d 'de' MMM", { locale: es })} - {format(weekEnd, "d 'de' MMM yyyy", { locale: es })}
                </span>
              </div>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <div className="p-3 border-b bg-muted/50">
              <p className="text-sm font-medium text-center">
                Selecciona cualquier día de la semana deseada
              </p>
            </div>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              month={displayMonth}
              onMonthChange={setDisplayMonth}
              locale={es}
              weekStartsOn={1}
              captionLayout="dropdown-months"
              fromYear={2020}
              toYear={2030}
              modifiers={{
                selectedWeek: (date) => {
                  const dateWeekStart = startOfWeek(date, { weekStartsOn: 1 })
                  const selectedWeekStart = startOfWeek(selectedDate, { weekStartsOn: 1 })
                  return dateWeekStart.getTime() === selectedWeekStart.getTime()
                },
                hoveredWeek: (date) => {
                  if (!hoveredDate) return false
                  const dateWeekStart = startOfWeek(date, { weekStartsOn: 1 })
                  const hoveredWeekStart = startOfWeek(hoveredDate, { weekStartsOn: 1 })
                  return dateWeekStart.getTime() === hoveredWeekStart.getTime()
                },
              }}
              modifiersClassNames={{
                selectedWeek: 'bg-primary/20',
                hoveredWeek: 'bg-muted',
              }}
              onDayMouseEnter={setHoveredDate}
              onDayMouseLeave={() => setHoveredDate(undefined)}
              disabled={disabled}
            />
            <div className="p-3 border-t">
              <Button
                variant="outline"
                className="w-full"
                onClick={handleToday}
                size="sm"
              >
                Ir a esta semana
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        <Button
          variant="outline"
          size="icon"
          onClick={handleNextWeek}
          disabled={disabled}
          title="Semana siguiente"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Week info display */}
      <div className="rounded-lg border bg-muted/50 p-3">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground mb-1">Inicio de semana</p>
            <p className="font-medium">
              {format(weekStart, "EEEE, d 'de' MMMM yyyy", { locale: es })}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground mb-1">Fin de semana</p>
            <p className="font-medium">
              {format(weekEnd, "EEEE, d 'de' MMMM yyyy", { locale: es })}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
