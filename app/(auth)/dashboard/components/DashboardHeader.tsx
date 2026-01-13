'use client'

import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Calendar, MapPin, RefreshCw, LayoutDashboard } from 'lucide-react'
import { cn } from '@/lib/utils'
import { WeekSelector } from './WeekSelector'
import type { Route } from './types'

interface DashboardHeaderProps {
  title?: string
  subtitle?: string
  selectedYear: number
  selectedWeekNumber: number
  onWeekChange: (year: number, weekNumber: number) => void
  selectedRouteId: string | null
  onRouteChange: (routeId: string | null) => void
  routes: Route[]
  loading?: boolean
  onRefresh?: () => void
}

export function DashboardHeader({
  title = 'Dashboard',
  subtitle,
  selectedYear,
  selectedWeekNumber,
  onWeekChange,
  selectedRouteId,
  onRouteChange,
  routes,
  loading = false,
  onRefresh,
}: DashboardHeaderProps) {
  const handleRouteChange = (value: string) => {
    if (value === 'all') {
      onRouteChange(null)
    } else {
      onRouteChange(value)
    }
  }

  return (
    <div className="space-y-3">
      {/* Title Row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 shrink-0">
            <LayoutDashboard className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h1 className="text-lg sm:text-2xl font-bold tracking-tight">{title}</h1>
            {subtitle && (
              <p className="text-xs sm:text-sm text-muted-foreground">{subtitle}</p>
            )}
          </div>
        </div>
        {onRefresh && (
          <Button
            variant="outline"
            size="icon"
            onClick={onRefresh}
            className="shrink-0 h-9 w-9"
          >
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </Button>
        )}
      </div>

      {/* Filters Row - stacks on mobile */}
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
          <WeekSelector
            year={selectedYear}
            weekNumber={selectedWeekNumber}
            onChange={onWeekChange}
            disabled={loading}
            compact
          />
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-sm text-muted-foreground">Ruta:</span>
          <Select value={selectedRouteId || 'all'} onValueChange={handleRouteChange}>
            <SelectTrigger className="w-[140px] sm:w-[160px] bg-background h-9">
              <SelectValue placeholder="Ruta" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                <span className="font-medium">Todas las rutas</span>
              </SelectItem>
              {routes.map((route) => (
                <SelectItem key={route.id} value={route.id}>
                  {route.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}
