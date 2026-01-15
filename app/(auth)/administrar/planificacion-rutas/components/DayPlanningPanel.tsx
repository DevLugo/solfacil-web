'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import {
  Calendar,
  MapPin,
  Users,
  Navigation,
  X,
  GripVertical,
  AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { LocationForPlanning, DayPlan } from '../hooks/useRoutePlanning'

const DAY_CONFIG = [
  { index: 0, short: 'L', name: 'Lunes', color: 'bg-blue-500' },
  { index: 1, short: 'M', name: 'Martes', color: 'bg-emerald-500' },
  { index: 2, short: 'Mi', name: 'Miercoles', color: 'bg-amber-500' },
  { index: 3, short: 'J', name: 'Jueves', color: 'bg-purple-500' },
  { index: 4, short: 'V', name: 'Viernes', color: 'bg-rose-500' },
  { index: 5, short: 'S', name: 'Sabado', color: 'bg-cyan-500' },
]

interface DayPlanningPanelProps {
  locations: LocationForPlanning[]
  dayPlans: DayPlan[]
  onAssignToDay: (locationId: string, dayOfWeek: number) => void
  onRemoveFromDay: (locationId: string, dayOfWeek: number) => void
  calculateDistance: (ids: string[]) => number
}

export function DayPlanningPanel({
  locations,
  dayPlans,
  onAssignToDay,
  onRemoveFromDay,
  calculateDistance,
}: DayPlanningPanelProps) {
  const [activeTab, setActiveTab] = useState(0)

  const assignedIds = new Set(dayPlans.flatMap((d) => d.locationIds))
  const unassignedLocations = locations.filter((l) => !assignedIds.has(l.locationId))

  const getLocationById = (id: string) => locations.find((l) => l.locationId === id)

  const getDayStats = (locationIds: string[]) => {
    const dayLocations = locationIds
      .map(getLocationById)
      .filter(Boolean) as LocationForPlanning[]

    return {
      count: dayLocations.length,
      clients: dayLocations.reduce((sum, l) => sum + l.clientesActivos, 0),
      cv: dayLocations.reduce((sum, l) => sum + l.clientesEnCV, 0),
      distance: calculateDistance(locationIds),
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            <CardTitle className="text-base font-medium">
              Planificacion Semanal
            </CardTitle>
          </div>
          <Badge variant="outline" className="font-mono text-xs">
            {unassignedLocations.length} sin asignar
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        {/* Day Tabs - Desktop: grid */}
        <div className="hidden lg:grid lg:grid-cols-7 gap-2 mb-4">
          {DAY_CONFIG.map((day) => {
            const dayPlan = dayPlans.find((d) => d.dayOfWeek === day.index)
            const stats = getDayStats(dayPlan?.locationIds ?? [])
            return (
              <DayTabButton
                key={day.index}
                day={day}
                stats={stats}
                isActive={activeTab === day.index}
                onClick={() => setActiveTab(day.index)}
              />
            )
          })}
          {/* Unassigned tab */}
          <button
            onClick={() => setActiveTab(-1)}
            className={cn(
              'p-3 rounded-lg border-2 transition-all text-left',
              activeTab === -1
                ? 'border-muted-foreground bg-muted'
                : 'border-transparent bg-muted/50 hover:bg-muted'
            )}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <AlertCircle className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-medium">Sin asignar</span>
            </div>
            <p className="text-lg font-bold font-mono">
              {unassignedLocations.length}
            </p>
          </button>
        </div>

        {/* Mobile: Horizontal scroll tabs */}
        <ScrollArea className="lg:hidden w-full whitespace-nowrap mb-4">
          <div className="flex gap-2 pb-2">
            {DAY_CONFIG.map((day) => {
              const dayPlan = dayPlans.find((d) => d.dayOfWeek === day.index)
              const stats = getDayStats(dayPlan?.locationIds ?? [])
              return (
                <DayTabButton
                  key={day.index}
                  day={day}
                  stats={stats}
                  isActive={activeTab === day.index}
                  onClick={() => setActiveTab(day.index)}
                  compact
                />
              )
            })}
            <button
              onClick={() => setActiveTab(-1)}
              className={cn(
                'flex-shrink-0 px-4 py-2 rounded-lg border-2 transition-all',
                activeTab === -1
                  ? 'border-muted-foreground bg-muted'
                  : 'border-transparent bg-muted/50'
              )}
            >
              <span className="text-xs font-medium">
                Sin {unassignedLocations.length}
              </span>
            </button>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        {/* Location List for Selected Day */}
        <div className="min-h-[200px] rounded-lg border bg-muted/30 p-3">
          {activeTab === -1 ? (
            /* Unassigned locations */
            <LocationList
              locations={unassignedLocations}
              dayIndex={-1}
              onAssign={onAssignToDay}
              onRemove={() => {}}
              isUnassigned
              dayOptions={DAY_CONFIG}
            />
          ) : (
            /* Day locations */
            <LocationList
              locations={
                (dayPlans[activeTab]?.locationIds ?? [])
                  .map(getLocationById)
                  .filter(Boolean) as LocationForPlanning[]
              }
              dayIndex={activeTab}
              onAssign={onAssignToDay}
              onRemove={onRemoveFromDay}
              isUnassigned={false}
              dayOptions={DAY_CONFIG}
            />
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function DayTabButton({
  day,
  stats,
  isActive,
  onClick,
  compact = false,
}: {
  day: (typeof DAY_CONFIG)[0]
  stats: { count: number; clients: number; cv: number; distance: number }
  isActive: boolean
  onClick: () => void
  compact?: boolean
}) {
  if (compact) {
    return (
      <button
        onClick={onClick}
        className={cn(
          'flex-shrink-0 px-4 py-2 rounded-lg border-2 transition-all',
          isActive
            ? `border-current ${day.color} text-white`
            : 'border-transparent bg-muted/50 hover:bg-muted'
        )}
      >
        <span className="font-medium">{day.short}</span>
        <span className="ml-1 font-mono text-xs opacity-80">{stats.count}</span>
      </button>
    )
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        'p-3 rounded-lg border-2 transition-all text-left',
        isActive
          ? `border-current ${day.color} text-white`
          : 'border-transparent bg-muted/50 hover:bg-muted'
      )}
    >
      <div className="flex items-center gap-1.5 mb-1">
        <div
          className={cn(
            'w-2 h-2 rounded-full',
            day.color,
            !isActive && 'opacity-60'
          )}
        />
        <span className="text-xs font-medium">{day.short}</span>
      </div>
      <p className="text-lg font-bold font-mono">{stats.count}</p>
      <div className="flex items-center gap-2 mt-1 text-xs opacity-70">
        <span className="flex items-center gap-0.5">
          <Users className="h-3 w-3" />
          {stats.clients}
        </span>
        <span className="flex items-center gap-0.5">
          <Navigation className="h-3 w-3" />
          {stats.distance}km
        </span>
      </div>
    </button>
  )
}

function LocationList({
  locations,
  dayIndex,
  onAssign,
  onRemove,
  isUnassigned,
  dayOptions,
}: {
  locations: LocationForPlanning[]
  dayIndex: number
  onAssign: (id: string, day: number) => void
  onRemove: (id: string, day: number) => void
  isUnassigned: boolean
  dayOptions: typeof DAY_CONFIG
}) {
  if (locations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <MapPin className="h-8 w-8 text-muted-foreground/40 mb-2" />
        <p className="text-sm text-muted-foreground">
          {isUnassigned
            ? 'Todas las localidades estan asignadas'
            : 'Arrastra localidades aqui o usa el boton "Asignar"'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {locations.map((loc) => (
        <div
          key={loc.locationId}
          className="flex items-center justify-between p-3 bg-card rounded-lg border shadow-sm group"
        >
          <div className="flex items-center gap-3">
            <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
            <div>
              <p className="font-medium text-sm">{loc.locationName}</p>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {loc.clientesActivos}
                </span>
                {loc.clientesEnCV > 0 && (
                  <span className="flex items-center gap-1 text-warning">
                    <AlertCircle className="h-3 w-3" />
                    {loc.clientesEnCV} CV
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isUnassigned ? (
              /* Quick assign buttons */
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {dayOptions.slice(0, 3).map((day) => (
                  <Button
                    key={day.index}
                    variant="ghost"
                    size="sm"
                    className={cn(
                      'h-7 w-7 p-0',
                      day.color,
                      'text-white hover:opacity-80'
                    )}
                    onClick={() => onAssign(loc.locationId, day.index)}
                  >
                    {day.short}
                  </Button>
                ))}
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => onRemove(loc.locationId, dayIndex)}
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
