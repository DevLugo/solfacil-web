'use client'

import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react'
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { getWeekOfDate } from '../utils/weekUtils'

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

interface WeekSelectorProps {
  year: number
  weekNumber: number
  onChange: (year: number, weekNumber: number) => void
  disabled?: boolean
  compact?: boolean
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
  compact = false,
}: WeekSelectorProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [displayMonth, setDisplayMonth] = useState<Date>(new Date())
  const [isOpen, setIsOpen] = useState(false)
  const [hoveredDate, setHoveredDate] = useState<Date | undefined>(undefined)

  // Calculate week start and end dates based on year and weekNumber
  useEffect(() => {
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

  // Calculate which month this week belongs to (majority of business days Mon-Fri)
  const weekMonth = useMemo(() => {
    const businessDays = []
    for (let i = 0; i < 5; i++) {
      const day = new Date(weekStart)
      day.setDate(weekStart.getDate() + i)
      businessDays.push(day)
    }

    // Count days per month
    const monthCounts = new Map<number, number>()
    businessDays.forEach(day => {
      const month = day.getMonth()
      monthCounts.set(month, (monthCounts.get(month) || 0) + 1)
    })

    // Find the month with most business days
    let maxMonth = weekStart.getMonth()
    let maxCount = 0
    monthCounts.forEach((count, month) => {
      if (count > maxCount) {
        maxCount = count
        maxMonth = month
      }
    })

    return maxMonth
  }, [weekStart])

  // Calculate week number within the month
  const weekNumberInMonth = useMemo(() => {
    // Find first Monday of the month
    const monthStart = new Date(weekStart.getFullYear(), weekMonth, 1)
    let firstMonday = new Date(monthStart)
    const dayOfWeek = monthStart.getDay()
    if (dayOfWeek !== 1) {
      // Find the first Monday
      const daysToMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek
      firstMonday = new Date(monthStart)
      firstMonday.setDate(1 + daysToMonday)
      // If first Monday is after the 7th, start from the Monday before month start
      if (firstMonday.getDate() > 7) {
        firstMonday.setDate(firstMonday.getDate() - 7)
      }
    }

    // Count weeks from first Monday to current week
    const daysDiff = Math.floor((weekStart.getTime() - firstMonday.getTime()) / (1000 * 60 * 60 * 24))
    return Math.floor(daysDiff / 7) + 1
  }, [weekStart, weekMonth])

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
    <div className="flex items-center gap-1">
      <Button
        variant="outline"
        size="icon"
        onClick={handlePreviousWeek}
        disabled={disabled}
        title="Semana anterior"
        className="h-9 w-9"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              'justify-start text-left font-normal h-9',
              compact ? 'w-[200px]' : 'w-[240px]',
              !selectedDate && 'text-muted-foreground'
            )}
            disabled={disabled}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            <div className="flex flex-col">
              <span className="text-sm font-medium">
                Semana {weekNumberInMonth} {MONTH_NAMES[weekMonth]}
              </span>
              {!compact && (
                <span className="text-xs text-muted-foreground">
                  {format(weekStart, 'd MMM', { locale: es })} - {format(weekEnd, 'd MMM', { locale: es })}
                </span>
              )}
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="p-3 border-b bg-muted/50">
            <p className="text-sm font-medium text-center">
              Selecciona cualquier dia de la semana
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
        className="h-9 w-9"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )
}
