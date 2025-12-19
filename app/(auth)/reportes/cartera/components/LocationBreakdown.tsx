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
import { MapPin, ChevronRight, ArrowLeft, Route } from 'lucide-react'
import { cn } from '@/lib/utils'
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

// Route deltas calculated from weekly data
interface RouteDeltas {
  clientesDelta: number
  pagandoDelta: number
  cvDelta: number
  // Last week values (for Clientes which shows last week total)
  lastWeekClientes: number
  lastWeekPagando: number
  lastWeekCV: number
  // Averages (for Pagando and CV which show averages)
  pagandoPromedio: number
  cvPromedio: number
}

// Inline delta badge
function InlineDelta({ value, inverted = false }: { value: number; inverted?: boolean }) {
  if (value === 0) return null
  const isPositive = inverted ? value < 0 : value > 0
  const isNegative = inverted ? value > 0 : value < 0

  return (
    <span className={cn(
      'text-[10px] font-medium ml-1',
      isPositive ? 'text-green-600' : isNegative ? 'text-red-600' : 'text-muted-foreground'
    )}>
      {value > 0 ? '+' : ''}{value}
    </span>
  )
}

// Clickable route card for drill-down navigation
function RouteCard({
  location,
  deltas,
  onClick,
}: {
  location: LocationBreakdownType
  deltas?: RouteDeltas
  onClick: () => void
}) {
  // Clientes = last week total, Pagando/CV = averages
  const clientes = deltas?.lastWeekClientes ?? location.clientesActivos
  const pagando = deltas?.pagandoPromedio ?? location.clientesAlCorriente
  const cv = deltas?.cvPromedio ?? location.clientesEnCV

  const cvPercentage = clientes > 0 ? (cv / clientes) * 100 : 0
  const pagandoPercentage = clientes > 0 ? (pagando / clientes) * 100 : 0

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-lg border bg-card p-3 hover:bg-muted/50 hover:border-primary/50 transition-all group cursor-pointer"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Route className="h-4 w-4 text-muted-foreground" />
          <h4 className="font-semibold text-sm">{location.routeName || location.locationName}</h4>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
      </div>

      {/* Stats - Clientes (última semana), Pagando y CV (promedios) with inline deltas */}
      <div className="grid grid-cols-3 gap-1.5 text-center mb-2">
        <div className="bg-muted/50 rounded px-2 py-1.5">
          <div className="flex items-center justify-center">
            <span className="text-base font-bold">{clientes}</span>
            <InlineDelta value={location.balance} />
          </div>
          <p className="text-[10px] text-muted-foreground">Clientes</p>
        </div>
        <div className="bg-green-50 dark:bg-green-950/30 rounded px-2 py-1.5">
          <div className="flex items-center justify-center">
            <span className="text-base font-bold text-green-600 dark:text-green-400">{pagando}</span>
            <InlineDelta value={deltas?.pagandoDelta ?? 0} />
          </div>
          <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
            Pagando <span className="text-[8px] font-semibold text-green-700 dark:text-green-300 bg-green-200 dark:bg-green-800/50 px-1.5 py-0.5 rounded-sm uppercase tracking-wide">prom</span>
          </p>
        </div>
        <div className="bg-red-50 dark:bg-red-950/30 rounded px-2 py-1.5">
          <div className="flex items-center justify-center">
            <span className="text-base font-bold text-red-600 dark:text-red-400">{cv}</span>
            <InlineDelta value={deltas?.cvDelta ?? 0} inverted />
          </div>
          <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
            CV <span className="text-[8px] font-semibold text-red-700 dark:text-red-300 bg-red-200 dark:bg-red-800/50 px-1.5 py-0.5 rounded-sm uppercase tracking-wide">prom</span>
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-0.5">
        <div className="h-1.5 rounded-full bg-muted overflow-hidden flex">
          <div
            className="h-full bg-green-500 dark:bg-green-600"
            style={{ width: `${pagandoPercentage}%` }}
          />
          <div
            className="h-full bg-red-500 dark:bg-red-600"
            style={{ width: `${cvPercentage}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>{pagandoPercentage.toFixed(0)}% pagando</span>
          <span>{cvPercentage.toFixed(0)}% CV</span>
        </div>
      </div>
    </button>
  )
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
  // Calculate deltas from weekly data for each route
  const routeDeltas = useMemo(() => {
    if (!localityReport?.localities) return new Map<string, RouteDeltas>()

    const deltasMap = new Map<string, RouteDeltas>()

    // Group localities by route
    const localitiesByRoute = new Map<string, typeof localityReport.localities>()
    for (const loc of localityReport.localities) {
      const routeId = loc.routeId || loc.localityId
      if (!localitiesByRoute.has(routeId)) {
        localitiesByRoute.set(routeId, [])
      }
      localitiesByRoute.get(routeId)!.push(loc)
    }

    // Calculate deltas for each route
    for (const [routeId, localities] of localitiesByRoute) {
      let firstWeekClientes = 0
      let firstWeekPagando = 0
      let firstWeekCV = 0
      let lastWeekClientes = 0
      let lastWeekPagando = 0
      let lastWeekCV = 0
      // For averages: sum all values across all completed weeks
      let totalPagandoSum = 0
      let totalCvSum = 0
      let totalCompletedWeeks = 0

      for (const loc of localities) {
        const weeklyData = loc.weeklyData || []
        const completedWeeks = weeklyData.filter(w => w.isCompleted)

        if (completedWeeks.length >= 1) {
          const firstWeek = completedWeeks[0]
          const lastWeek = completedWeeks[completedWeeks.length - 1]

          firstWeekClientes += firstWeek.clientesActivos
          firstWeekPagando += firstWeek.clientesAlCorriente
          firstWeekCV += firstWeek.clientesEnCV

          lastWeekClientes += lastWeek.clientesActivos
          lastWeekPagando += lastWeek.clientesAlCorriente
          lastWeekCV += lastWeek.clientesEnCV

          // Sum all completed weeks for average calculation
          for (const week of completedWeeks) {
            totalPagandoSum += week.clientesAlCorriente
            totalCvSum += week.clientesEnCV
            totalCompletedWeeks++
          }
        }
      }

      // Calculate averages
      const pagandoPromedio = totalCompletedWeeks > 0
        ? Math.round(totalPagandoSum / totalCompletedWeeks)
        : lastWeekPagando
      const cvPromedio = totalCompletedWeeks > 0
        ? Math.round(totalCvSum / totalCompletedWeeks)
        : lastWeekCV

      deltasMap.set(routeId, {
        clientesDelta: lastWeekClientes - firstWeekClientes,
        pagandoDelta: lastWeekPagando - firstWeekPagando,
        cvDelta: lastWeekCV - firstWeekCV,
        lastWeekClientes,
        lastWeekPagando,
        lastWeekCV,
        pagandoPromedio,
        cvPromedio,
      })
    }

    return deltasMap
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
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <MapPin className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-semibold">Sin datos de rutas</h3>
        <p className="text-sm text-muted-foreground">
          No hay rutas con clientes activos en este período
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary - Compact inline format matching the cards */}
      <div className="rounded-lg border p-4 bg-muted/30">
        <p className="text-sm font-medium mb-3">Resumen Total</p>
        <div className="grid grid-cols-3 gap-3 text-center mb-3">
          <div className="bg-muted/50 rounded px-3 py-2">
            <div className="flex items-center justify-center">
              <span className="text-2xl font-bold">{totals.lastWeekClientes}</span>
              <InlineDelta value={totals.balance} />
            </div>
            <p className="text-xs text-muted-foreground">Clientes</p>
          </div>
          <div className="bg-green-50 dark:bg-green-950/30 rounded px-3 py-2">
            <div className="flex items-center justify-center">
              <span className="text-2xl font-bold text-green-600 dark:text-green-400">{totals.pagandoPromedio}</span>
              <InlineDelta value={totals.pagandoDelta} />
            </div>
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
              Pagando <span className="text-[9px] font-semibold text-green-700 dark:text-green-300 bg-green-200 dark:bg-green-800/50 px-1.5 py-0.5 rounded-sm uppercase tracking-wide">prom</span>
            </p>
          </div>
          <div className="bg-red-50 dark:bg-red-950/30 rounded px-3 py-2">
            <div className="flex items-center justify-center">
              <span className="text-2xl font-bold text-red-600 dark:text-red-400">{totals.cvPromedio}</span>
              <InlineDelta value={totals.cvDelta} inverted />
            </div>
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
              CV <span className="text-[9px] font-semibold text-red-700 dark:text-red-300 bg-red-200 dark:bg-red-800/50 px-1.5 py-0.5 rounded-sm uppercase tracking-wide">prom</span>
            </p>
          </div>
        </div>
        {/* Progress Bar */}
        {totals.lastWeekClientes > 0 && (
          <div className="space-y-1">
            <div className="h-2 rounded-full bg-muted overflow-hidden flex">
              <div
                className="h-full bg-green-500 dark:bg-green-600"
                style={{ width: `${(totals.pagandoPromedio / totals.lastWeekClientes) * 100}%` }}
              />
              <div
                className="h-full bg-red-500 dark:bg-red-600"
                style={{ width: `${(totals.cvPromedio / totals.lastWeekClientes) * 100}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{((totals.pagandoPromedio / totals.lastWeekClientes) * 100).toFixed(0)}% pagando</span>
              <span>{((totals.cvPromedio / totals.lastWeekClientes) * 100).toFixed(0)}% CV</span>
            </div>
          </div>
        )}
      </div>

      {/* Instruction */}
      <p className="text-sm text-muted-foreground">
        Haz clic en una ruta para ver el detalle por localidad
      </p>

      {/* Cards grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sortedLocations.map((location) => (
          <RouteCard
            key={location.locationId}
            location={location}
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
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              {selectedRouteId ? (
                // Drill-down header with back button
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleBackToRoutes}
                    className="flex items-center gap-1 -ml-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span>Rutas</span>
                  </Button>
                  <div className="h-6 w-px bg-border" />
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Route className="h-5 w-5" />
                      {selectedRouteName}
                    </CardTitle>
                    <CardDescription>
                      {localityCount} localidades con clientes activos
                    </CardDescription>
                  </div>
                </div>
              ) : (
                // Routes view header
                <>
                  <CardTitle className="text-lg">Desglose por Ruta</CardTitle>
                  <CardDescription>
                    {locations.length} rutas con clientes activos
                  </CardDescription>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
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
