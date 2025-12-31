'use client'

import { useState, useMemo } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { MapPin, ArrowLeft, Route } from 'lucide-react'
import {
  RouteStatsCard,
  RouteStatsSummary,
} from '@/components/features/route-stats'
import type {
  LocalityReport,
  LocalityBreakdownDetail,
  RouteKPI,
} from '../hooks'
import { LocalityWeeklyTable } from './LocalityWeeklyTable'
import { LocalityDetailModal } from './LocalityDetailModal'

interface LocationBreakdownProps {
  // New simplified RouteKPI data
  routeKPIs: RouteKPI[]
  routeKPIsTotals: { clientesTotal: number; pagandoPromedio: number; cvPromedio: number } | null
  routeKPIsLoading: boolean
  // Locality data for drill-down
  localityReport?: LocalityReport | null
  localityLoading?: boolean
  year: number
  month: number
  // Controlled drill-down state
  selectedRouteId?: string | null
  onRouteSelect?: (routeId: string | null) => void
}

function RouteCardsView({
  routeKPIs,
  totals,
  loading,
  onRouteClick,
}: {
  routeKPIs: RouteKPI[]
  totals: { clientesTotal: number; pagandoPromedio: number; cvPromedio: number } | null
  loading: boolean
  onRouteClick: (routeId: string) => void
}) {
  // Transform totals to match RouteStatsSummary expected format
  const summaryTotals = useMemo(() => {
    if (!totals) return { lastWeekClientes: 0, pagandoPromedio: 0, cvPromedio: 0, balance: 0, pagandoDelta: 0, cvDelta: 0 }
    return {
      lastWeekClientes: totals.clientesTotal,
      pagandoPromedio: totals.pagandoPromedio,
      cvPromedio: totals.cvPromedio,
      balance: 0, // Not used in simplified view
      pagandoDelta: 0,
      cvDelta: 0,
    }
  }, [totals])

  if (loading) {
    return (
      <div className="space-y-3 sm:space-y-4">
        <Skeleton className="h-20 w-full" />
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    )
  }

  if (routeKPIs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6 sm:py-12 text-center">
        <MapPin className="h-8 w-8 sm:h-12 sm:w-12 text-muted-foreground/50 mb-2 sm:mb-4" />
        <h3 className="text-base sm:text-lg font-semibold">Sin datos de rutas</h3>
        <p className="text-xs sm:text-sm text-muted-foreground">
          No hay rutas con clientes activos
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Summary */}
      <RouteStatsSummary totals={summaryTotals} />

      {/* Instruction */}
      <p className="text-xs sm:text-sm text-muted-foreground">
        Toca una ruta para ver detalle por localidad
      </p>

      {/* Cards grid */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {routeKPIs.map((kpi) => (
          <RouteStatsCard
            key={kpi.routeId}
            route={{
              id: kpi.routeId,
              name: kpi.routeName,
              clientesActivos: kpi.clientesTotal,
              clientesAlCorriente: Math.round(kpi.pagandoPromedio),
              clientesEnCV: Math.round(kpi.cvPromedio),
              balance: 0, // Not used in simplified view
            }}
            deltas={{
              clientesDelta: 0,
              pagandoDelta: 0,
              cvDelta: 0,
              lastWeekClientes: kpi.clientesTotal,
              lastWeekPagando: Math.round(kpi.pagandoPromedio),
              lastWeekCV: Math.round(kpi.cvPromedio),
              pagandoPromedio: kpi.pagandoPromedio,
              cvPromedio: kpi.cvPromedio,
            }}
            onClick={() => onRouteClick(kpi.routeId)}
          />
        ))}
      </div>
    </div>
  )
}

export function LocationBreakdown({
  routeKPIs,
  routeKPIsTotals,
  routeKPIsLoading,
  localityReport,
  localityLoading,
  year,
  month,
  selectedRouteId: controlledRouteId,
  onRouteSelect,
}: LocationBreakdownProps) {
  // Local state for modal (not controlled by parent)
  const [selectedLocality, setSelectedLocality] = useState<LocalityBreakdownDetail | null>(null)
  const [selectedWeekNumber, setSelectedWeekNumber] = useState<number | undefined>(undefined)

  // Use controlled state from parent, or fall back to null (routes view)
  const selectedRouteId = controlledRouteId ?? null

  // Find the selected route name
  const selectedRouteName = useMemo(() => {
    if (!selectedRouteId) return null
    const route = routeKPIs.find((kpi) => kpi.routeId === selectedRouteId)
    return route?.routeName || 'Ruta'
  }, [selectedRouteId, routeKPIs])

  const handleRouteClick = (routeId: string) => {
    onRouteSelect?.(routeId)
  }

  const handleBackToRoutes = () => {
    onRouteSelect?.(null)
  }

  const handleLocalityClick = (locality: LocalityBreakdownDetail, weekNumber?: number) => {
    setSelectedLocality(locality)
    setSelectedWeekNumber(weekNumber)
  }

  const handleModalClose = () => {
    setSelectedLocality(null)
    setSelectedWeekNumber(undefined)
  }

  // When drilling down into a route, localityReport is already filtered by that route on the backend.
  // We just use it directly without re-filtering to ensure consistency with routeKPIs.
  // The backend's totals are the source of truth.
  const filteredLocalityReport = localityReport

  const localityCount = filteredLocalityReport?.localities.length ?? 0

  return (
    <>
      <Card>
        <CardHeader className="px-3 sm:px-6 pt-3 sm:pt-6 pb-2 sm:pb-3">
          <div className="flex flex-col gap-2 sm:gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              {selectedRouteId ? (
                // Drill-down header with back button
                <div className="flex items-center gap-2 sm:gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleBackToRoutes}
                    className="flex items-center gap-1 -ml-2 h-8 px-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span className="text-xs sm:text-sm">Rutas</span>
                  </Button>
                  <div className="h-5 sm:h-6 w-px bg-border" />
                  <div className="min-w-0">
                    <CardTitle className="text-base sm:text-lg flex items-center gap-2 truncate">
                      <Route className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                      <span className="truncate">{selectedRouteName}</span>
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm">
                      {localityCount} localidades
                    </CardDescription>
                  </div>
                </div>
              ) : (
                // Routes view header
                <>
                  <CardTitle className="text-base sm:text-lg">Desglose por Ruta</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    {routeKPIs.length} rutas con clientes activos
                  </CardDescription>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
          {selectedRouteId ? (
            // Drill-down: Show localities for selected route
            localityLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : (
              <LocalityWeeklyTable
                report={filteredLocalityReport ?? null}
                onLocalityClick={handleLocalityClick}
              />
            )
          ) : (
            // Default: Show route cards with simplified KPIs
            <RouteCardsView
              routeKPIs={routeKPIs}
              totals={routeKPIsTotals}
              loading={routeKPIsLoading}
              onRouteClick={handleRouteClick}
            />
          )}
        </CardContent>
      </Card>

      {/* Detail Modal */}
      <LocalityDetailModal
        locality={selectedLocality}
        year={year}
        month={month}
        weekNumber={selectedWeekNumber}
        onClose={handleModalClose}
      />
    </>
  )
}
