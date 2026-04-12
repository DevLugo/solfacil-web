'use client'

import { format, startOfWeek, addDays, getISOWeek } from 'date-fns'
import { es } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { Button } from '@/components/ui/button'

interface CapturaPageHeaderProps {
  weekStart: Date
  onWeekChange: (weekStart: Date) => void
}

export function CapturaPageHeader({ weekStart, onWeekChange }: CapturaPageHeaderProps) {
  const monday = startOfWeek(weekStart, { weekStartsOn: 1 })
  const friday = addDays(monday, 4)
  const weekNum = getISOWeek(monday)

  const rangeLabel = `${format(monday, 'd MMM', { locale: es })} - ${format(friday, 'd MMM yyyy', { locale: es })}`

  const handlePrev = () => {
    onWeekChange(addDays(monday, -7))
  }

  const handleNext = () => {
    onWeekChange(addDays(monday, 7))
  }

  const handleToday = () => {
    onWeekChange(startOfWeek(new Date(), { weekStartsOn: 1 }))
  }

  const isCurrentWeek = startOfWeek(new Date(), { weekStartsOn: 1 }).getTime() === monday.getTime()

  return (
    <div className="flex items-center justify-between gap-4">
      <h1 className="text-2xl font-bold tracking-tight">Captura OCR</h1>

      <div className="flex items-center gap-2">
        {!isCurrentWeek && (
          <Button variant="outline" size="sm" onClick={handleToday}>
            Hoy
          </Button>
        )}
        <div className="flex items-center gap-1 rounded-lg border bg-card px-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handlePrev}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[220px] text-center text-sm font-medium">
            Semana {weekNum} ({rangeLabel})
          </span>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
