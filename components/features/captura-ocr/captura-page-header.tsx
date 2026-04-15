'use client'

import { useState } from 'react'
import { format, startOfWeek, addDays, getISOWeek } from 'date-fns'
import { es } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, CircleCheck, CircleX, Loader2, Activity, CalendarDays } from 'lucide-react'
import { useQuery } from '@apollo/client'

import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { cn } from '@/lib/utils'
import { CAPTURA_HEALTH_CHECK_QUERY } from '@/graphql/queries/captura'

interface CapturaPageHeaderProps {
  weekStart: Date
  onWeekChange: (weekStart: Date) => void
}

function HealthCheckIndicator() {
  const { data, loading, error, refetch } = useQuery(CAPTURA_HEALTH_CHECK_QUERY, {
    fetchPolicy: 'cache-and-network',
  })

  const health = data?.capturaHealthCheck
  const allOk = health && health.python && health.googleCredentials && health.googleVisionApi && health.anthropicKey
  const hasError = error || (health && !allOk)

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'h-8 w-8 rounded-full',
            loading && 'text-muted-foreground',
            allOk && 'text-emerald-600',
            hasError && 'text-red-500',
          )}
        >
          {loading && !health ? <Loader2 className="h-4 w-4 animate-spin" /> : <Activity className="h-4 w-4" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">Estado del Pipeline</h4>
            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => refetch()}>
              {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Verificar'}
            </Button>
          </div>

          {error ? (
            <p className="text-xs text-red-500">Error: {error.message}</p>
          ) : !health ? (
            <p className="text-xs text-muted-foreground">Verificando...</p>
          ) : (
            <div className="space-y-1.5">
              <StatusRow label="Python" ok={health.python} />
              <StatusRow label="Google Credentials" ok={health.googleCredentials} />
              <StatusRow label="Google Vision API" ok={health.googleVisionApi} />
              <StatusRow label="Anthropic API Key" ok={health.anthropicKey} />

              {health.errors.length > 0 && (
                <div className="mt-2 rounded bg-red-50 p-2">
                  {health.errors.map((err: string, i: number) => (
                    <p key={i} className="text-xs text-red-600">{err}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

function StatusRow({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      {ok
        ? <CircleCheck className="h-4 w-4 text-emerald-600" />
        : <CircleX className="h-4 w-4 text-red-500" />
      }
    </div>
  )
}

export function CapturaPageHeader({ weekStart, onWeekChange }: CapturaPageHeaderProps) {
  const [calendarOpen, setCalendarOpen] = useState(false)

  const monday = startOfWeek(weekStart, { weekStartsOn: 1 })
  const sunday = addDays(monday, 6)
  const weekNum = getISOWeek(monday)

  const rangeLabel = `${format(monday, 'd MMM', { locale: es })} - ${format(sunday, 'd MMM yyyy', { locale: es })}`

  const handlePrev = () => {
    onWeekChange(addDays(monday, -7))
  }

  const handleNext = () => {
    onWeekChange(addDays(monday, 7))
  }

  const handleToday = () => {
    onWeekChange(startOfWeek(new Date(), { weekStartsOn: 1 }))
  }

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      onWeekChange(startOfWeek(date, { weekStartsOn: 1 }))
      setCalendarOpen(false)
    }
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
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <button className="flex items-center gap-1.5 min-w-[220px] justify-center text-sm font-medium hover:bg-accent rounded-md px-2 py-1 transition-colors">
                <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                Semana {weekNum} ({rangeLabel})
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="center">
              <Calendar
                mode="single"
                selected={monday}
                onSelect={handleDateSelect}
                defaultMonth={monday}
                locale={es}
                weekStartsOn={1}
              />
            </PopoverContent>
          </Popover>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <HealthCheckIndicator />
      </div>
    </div>
  )
}
