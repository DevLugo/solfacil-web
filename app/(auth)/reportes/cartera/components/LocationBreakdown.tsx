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
  calculateRouteDeltas,
} from '@/components/features/route-stats'
import type {
  LocationBreakdown as LocationBreakdownType,
  LocalityReport,
  LocalityBreakdownDetail,
} from '../hooks'
import { LocalityWeeklyTable } from './LocalityWeeklyTable'
import { LocalityDetailModal } from './LocalityDetailModal'

interface LocationBreakdownProps {
  locations: LocationBreakdownType[]
  localityReport?: LocalityReport | null
  localityLoading?: boolean
  year: number
  month: number
}

function RouteCardsView({
  locations,
  localityReport,
  onRouteClick,
}: {
  locations: LocationBreakdownType[]
  localityReport?: LocalityReport | null
  onRouteClick: (routeId: string) => void
}) {
  // Calculate deltas from weekly data for each route (shared logic)
  const routeDeltas = useMemo(() => {
    return calculateRouteDeltas(localityReport ?? null)
  }, [localityReport])

  // Calculate totals
  const totals = useMemo(() => {
    const base = locations.reduce(
      (acc, loc) => ({
        activos: acc.activos + loc.clientesActivos,
        alCorriente: acc.alCorriente + loc.clientesAlCorriente,
        enCV: acc.enCV + loc.clientesEnCV,
        balance: acc.balance + loc.balance,
      }),
      { activos: 0, alCorriente: 0, enCV: 0, balance: 0 }
    )

    // Calculate total deltas, last week totals, and averages from weekly data
    let totalPagandoDelta = 0
    let totalCvDelta = 0
    let lastWeekClientes = 0
    let totalPagandoPromedio = 0
    let totalCvPromedio = 0

    for (const deltas of routeDeltas.values()) {
      totalPagandoDelta += deltas.pagandoDelta
      totalCvDelta += deltas.cvDelta
      lastWeekClientes += deltas.lastWeekClientes
      totalPagandoPromedio += deltas.pagandoPromedio
      totalCvPromedio += deltas.cvPromedio
    }

    return {
      ...base,
      pagandoDelta: totalPagandoDelta,
      cvDelta: totalCvDelta,
      lastWeekClientes: lastWeekClientes || base.activos,
      // Use averages for Pagando and CV
      pagandoPromedio: totalPagandoPromedio || base.alCorriente,
      cvPromedio: totalCvPromedio || base.enCV,
    }
  }, [locations, routeDeltas])

  // Sort by clientes activos descending
  const sortedLocations = [...locations].sort(
    (a, b) => b.clientesActivos - a.clientesActivos
  )

  if (locations.length === 0) {
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
      <RouteStatsSummary totals={totals} />

      {/* Instruction */}
      <p className="text-xs sm:text-sm text-muted-foreground">
        Toca una ruta para ver detalle por localidad
      </p>

      {/* Cards grid */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {sortedLocations.map((location) => (
          <RouteStatsCard
            key={location.locationId}
            route={{
              id: location.locationId,
              name: location.routeName || location.locationName,
              clientesActivos: location.clientesActivos,
              clientesAlCorriente: location.clientesAlCorriente,
              clientesEnCV: location.clientesEnCV,
              balance: location.balance,
            }}
            deltas={routeDeltas.get(location.routeId || location.locationId)}
            onClick={() => onRouteClick(location.routeId || location.locationId)}
          />
        ))}
      </div>
    </div>
  )
}

export function LocationBreakdown({
  locations,
  localityReport,
  localityLoading,
  year,
  month,
}: LocationBreakdownProps) {
  // Drill-down state: null = show routes, string = show localities for that route
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null)
  const [selectedLocality, setSelectedLocality] = useState<LocalityBreakdownDetail | null>(null)
  const [selectedWeekNumber, setSelectedWeekNumber] = useState<number | undefined>(undefined)

  // Find the selected route name
  const selectedRouteName = useMemo(() => {
    if (!selectedRouteId) return null
    const route = locations.find((loc) => loc.routeId === selectedRouteId || loc.locationId === selectedRouteId)
    return route?.routeName || route?.locationName || 'Ruta'
  }, [selectedRouteId, locations])

  const handleRouteClick = (routeId: string) => {
    setSelectedRouteId(routeId)
  }

  const handleBackToRoutes = () => {
    setSelectedRouteId(null)
  }

  const handleLocalityClick = (locality: LocalityBreakdownDetail, weekNumber?: number) => {
    setSelectedLocality(locality)
    setSelectedWeekNumber(weekNumber)
  }

  const handleModalClose = () => {
    setSelectedLocality(null)
    setSelectedWeekNumber(undefined)
  }

  // Filter localities by selected route for drill-down view
  // IMPORTANT: Use same matching logic as RouteCardsView routeDeltas (loc.routeId || loc.localityId)
  const filteredLocalityReport = useMemo(() => {
    if (!localityReport || !selectedRouteId) return localityReport

    const filteredLocalities = localityReport.localities.filter(
      (loc) => (loc.routeId || loc.localityId) === selectedRouteId
    )

    // Recalculate totals for filtered data
    const totals = filteredLocalities.reduce(
      (acc, loc) => ({
        totalClientesActivos: acc.totalClientesActivos + loc.summary.totalClientesActivos,
        totalClientesAlCorriente: acc.totalClientesAlCorriente + loc.summary.totalClientesAlCorriente,
        totalClientesEnCV: acc.totalClientesEnCV + loc.summary.totalClientesEnCV,
        totalNuevos: acc.totalNuevos + loc.summary.totalNuevos,
        totalRenovados: acc.totalRenovados + loc.summary.totalRenovados,
        totalReintegros: acc.totalReintegros + loc.summary.totalReintegros,
        totalFinalizados: acc.totalFinalizados + loc.summary.totalFinalizados,
        balance: acc.balance + loc.summary.balance,
        alCorrientePromedio: 0,
        cvPromedio: 0,
        porcentajePagando: 0,
      }),
      {
        totalClientesActivos: 0,
        totalClientesAlCorriente: 0,
        totalClientesEnCV: 0,
        totalNuevos: 0,
        totalRenovados: 0,
        totalReintegros: 0,
        totalFinalizados: 0,
        balance: 0,
        alCorrientePromedio: 0,
        cvPromedio: 0,
        porcentajePagando: 0,
      }
    )

    // Calculate averages - SUM locality averages (not average of averages)
    // This matches the RouteCard calculation which sums weekly averages
    if (filteredLocalities.length > 0) {
      totals.alCorrientePromedio = filteredLocalities.reduce(
        (sum, loc) => sum + (loc.summary.alCorrientePromedio ?? loc.summary.totalClientesAlCorriente ?? 0),
        0
      )
      totals.cvPromedio = filteredLocalities.reduce(
        (sum, loc) => sum + (loc.summary.cvPromedio ?? loc.summary.totalClientesEnCV ?? 0),
        0
      )
      totals.porcentajePagando = totals.totalClientesActivos > 0
        ? (totals.totalClientesAlCorriente / totals.totalClientesActivos) * 100
        : 0
    }

    return {
      ...localityReport,
      localities: filteredLocalities,
      totals,
    }
  }, [localityReport, selectedRouteId])

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
                    {locations.length} rutas con clientes activos
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
            // Default: Show route cards
            <RouteCardsView
              locations={locations}
              localityReport={localityReport}
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
