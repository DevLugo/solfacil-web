'use client'

import { format, startOfWeek, addDays, getISOWeek } from 'date-fns'
import { es } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, CircleCheck, CircleX, Loader2, Activity } from 'lucide-react'
import { useQuery } from '@apollo/client'

import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
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
        <HealthCheckIndicator />
      </div>
    </div>
  )
}
