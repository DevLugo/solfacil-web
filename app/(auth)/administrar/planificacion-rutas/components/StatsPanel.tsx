'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  MapPin,
  Users,
  UserCheck,
  AlertTriangle,
  Navigation,
  Calendar,
  TrendingUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DayPlan, AggregatedStats } from '../hooks/useRoutePlanning'

const DAY_NAMES = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado']

interface StatsPanelProps {
  selectedCount: number
  stats: AggregatedStats | null
  loading: boolean
  dayPlans: DayPlan[]
  onAssignToDay: (locationId: string, dayOfWeek: number) => void
  selectedIds: Set<string>
}

export function StatsPanel({
  selectedCount,
  stats,
  loading,
  dayPlans,
  onAssignToDay,
  selectedIds,
}: StatsPanelProps) {
  const handleAssignSelected = (day: string) => {
    const dayIndex = parseInt(day, 10)
    selectedIds.forEach((id) => onAssignToDay(id, dayIndex))
  }

  const hasSelection = selectedCount > 0

  return (
    <Card>
      <CardHeader className="pb-3 border-b">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <CardTitle className="text-base font-medium">
            Resumen de Seleccion
          </CardTitle>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        {/* Selection Count */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">Localidades seleccionadas</span>
          </div>
          <Badge
            variant={selectedCount > 0 ? 'default' : 'secondary'}
            className="font-mono"
          >
            {selectedCount}
          </Badge>
        </div>

        {stats && hasSelection ? (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              <StatCard
                icon={Users}
                label="Clientes"
                value={stats.totalClientes}
                variant="default"
              />
              <StatCard
                icon={UserCheck}
                label="Activos"
                value={stats.clientesActivos}
                variant="success"
              />
              <StatCard
                icon={AlertTriangle}
                label="En CV"
                value={stats.clientesEnCV}
                variant="warning"
              />
              <StatCard
                icon={Navigation}
                label="Distancia"
                value={`${stats.totalDistanceKm} km`}
                variant="info"
              />
            </div>

            {/* Assign to Day */}
            <div className="pt-2 border-t">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Asignar seleccion a dia
              </label>
              <div className="flex gap-2 mt-2">
                <Select onValueChange={handleAssignSelected}>
                  <SelectTrigger className="flex-1">
                    <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                    <SelectValue placeholder="Elegir dia" />
                  </SelectTrigger>
                  <SelectContent>
                    {DAY_NAMES.map((name, index) => {
                      const dayPlan = dayPlans.find((d) => d.dayOfWeek === index)
                      return (
                        <SelectItem key={index} value={index.toString()}>
                          {name} ({dayPlan?.locationIds.length ?? 0} loc)
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </>
        ) : (
          <div className="py-8 text-center">
            <MapPin className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Selecciona localidades en el mapa para ver estadisticas
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  variant,
}: {
  icon: React.ElementType
  label: string
  value: string | number
  variant: 'default' | 'success' | 'warning' | 'info'
}) {
  const variantStyles = {
    default: 'bg-muted/50 text-foreground border-border',
    success: 'bg-success/10 text-success border-success/20',
    warning: 'bg-warning/10 text-warning border-warning/20',
    info: 'bg-info/10 text-info border-info/20',
  }

  return (
    <div className={cn('p-3 rounded-lg border', variantStyles[variant])}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className="h-3.5 w-3.5" />
        <span className="text-xs font-medium uppercase tracking-wide opacity-80">
          {label}
        </span>
      </div>
      <p className="text-xl font-bold font-mono">{value}</p>
    </div>
  )
}
