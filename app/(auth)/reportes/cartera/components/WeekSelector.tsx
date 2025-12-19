'use client'

import { useMemo } from 'react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import type { PeriodType, WeekRange } from '../hooks'

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

interface WeekSelectorProps {
  periodType: PeriodType
  year: number
  month?: number
  weekNumber?: number
  currentActiveWeek?: WeekRange | null
  onPeriodTypeChange: (type: PeriodType) => void
  onYearChange: (year: number) => void
  onMonthChange: (month: number) => void
  onWeekNumberChange: (week: number | undefined) => void
  onPrevious: () => void
  onNext: () => void
  onGoToCurrent: () => void
}

export function WeekSelector({
  year,
  month,
  onYearChange,
  onMonthChange,
  onGoToCurrent,
}: WeekSelectorProps) {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  const availableYears = useMemo(() => {
    return Array.from({ length: 5 }, (_, i) => currentYear - i)
  }, [currentYear])

  const isCurrentMonth = year === currentYear && month === currentMonth

  const goToPreviousMonth = () => {
    if ((month ?? 1) === 1) {
      onYearChange(year - 1)
      onMonthChange(12)
    } else {
      onMonthChange((month ?? 1) - 1)
    }
  }

  const goToNextMonth = () => {
    if ((month ?? 12) === 12) {
      onYearChange(year + 1)
      onMonthChange(1)
    } else {
      onMonthChange((month ?? 1) + 1)
    }
  }

  const monthName = MONTH_NAMES[(month ?? 1) - 1]

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {/* Previous month */}
        <Button variant="outline" size="icon" onClick={goToPreviousMonth} title="Mes anterior">
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {/* Month selector */}
        <Select
          value={(month ?? 1).toString()}
          onValueChange={(value) => onMonthChange(parseInt(value))}
        >
          <SelectTrigger className="w-[140px]">
            <Calendar className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MONTH_NAMES.map((name, idx) => (
              <SelectItem key={idx} value={(idx + 1).toString()}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Year selector */}
        <Select
          value={year.toString()}
          onValueChange={(value) => onYearChange(parseInt(value))}
        >
          <SelectTrigger className="w-[90px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {availableYears.map((y) => (
              <SelectItem key={y} value={y.toString()}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Next month */}
        <Button variant="outline" size="icon" onClick={goToNextMonth} title="Mes siguiente">
          <ChevronRight className="h-4 w-4" />
        </Button>

        {/* Current month indicator or Go to current button */}
        {isCurrentMonth ? (
          <Badge variant="secondary" className="bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-400">
            Mes Actual
          </Badge>
        ) : (
          <Button variant="outline" size="sm" onClick={onGoToCurrent}>
            Hoy
          </Button>
        )}
      </div>
    </div>
  )
}
