'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  MapPin,
  Users,
  UserCheck,
  AlertTriangle,
  Navigation,
  TrendingUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AggregatedStats, LocationForPlanning } from '../hooks/useRoutePlanning'

interface StatsPanelProps {
  selectedCount: number
  stats: AggregatedStats | null
  loading: boolean
  locations: LocationForPlanning[]
  selectedIds: Set<string>
}

export function StatsPanel({
  selectedCount,
  stats,
  loading,
  locations,
  selectedIds,
}: StatsPanelProps) {
  const hasSelection = selectedCount > 0

  // Get selected location details for the list
  const selectedLocations = locations.filter((l) => selectedIds.has(l.locationId))

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

            {/* Selected Locations List */}
            {selectedLocations.length > 0 && (
              <div className="pt-2 border-t">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                  Localidades
                </p>
                <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                  {selectedLocations.map((loc) => (
                    <div
                      key={loc.locationId}
                      className="flex items-center justify-between p-2 rounded bg-muted/30 text-sm"
                    >
                      <span className="font-medium truncate">{loc.locationName}</span>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
                        <span>{loc.clientesActivos} act</span>
                        {loc.clientesEnCV > 0 && (
                          <span className="text-warning">{loc.clientesEnCV} CV</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
