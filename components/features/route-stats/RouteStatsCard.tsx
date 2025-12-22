'use client'

import { cn } from '@/lib/utils'
import { Route, ChevronRight } from 'lucide-react'

/**
 * Route deltas calculated from weekly data
 * Used for showing trends and changes between periods
 */
export interface RouteDeltas {
  clientesDelta: number
  pagandoDelta: number
  cvDelta: number
  /** Last week values (for Clientes which shows last week total) */
  lastWeekClientes: number
  lastWeekPagando: number
  lastWeekCV: number
  /** Averages (for Pagando and CV which show averages) */
  pagandoPromedio: number
  cvPromedio: number
}

/**
 * Base route/location data for the stats card
 */
export interface RouteStatsData {
  id: string
  name: string
  clientesActivos: number
  clientesAlCorriente: number
  clientesEnCV: number
  balance: number
}

interface RouteStatsCardProps {
  route: RouteStatsData
  deltas?: RouteDeltas
  onClick?: () => void
  /** Whether to show the chevron icon for navigation */
  showChevron?: boolean
}

/**
 * Inline delta badge showing change from previous period
 */
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

/**
 * Unified route statistics card used in both:
 * - Reportes/Cartera -> Por Ruta view
 * - Administrar Rutas page
 *
 * Shows:
 * - Clientes (last week total)
 * - Pagando (average, with PROM badge)
 * - CV (average, with PROM badge)
 * - Progress bar with percentages
 */
export function RouteStatsCard({
  route,
  deltas,
  onClick,
  showChevron = true,
}: RouteStatsCardProps) {
  // Clientes = last week total, Pagando/CV = averages
  const clientes = deltas?.lastWeekClientes ?? route.clientesActivos
  const pagando = deltas?.pagandoPromedio ?? route.clientesAlCorriente
  const cv = deltas?.cvPromedio ?? route.clientesEnCV

  const cvPercentage = clientes > 0 ? (cv / clientes) * 100 : 0
  const pagandoPercentage = clientes > 0 ? (pagando / clientes) * 100 : 0

  const CardWrapper = onClick ? 'button' : 'div'

  return (
    <CardWrapper
      onClick={onClick}
      className={cn(
        'w-full text-left rounded-lg border bg-card p-3 transition-all',
        onClick && 'hover:bg-muted/50 hover:border-primary/50 group cursor-pointer'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Route className="h-4 w-4 text-muted-foreground" />
          <h4 className="font-semibold text-sm">{route.name}</h4>
        </div>
        {showChevron && onClick && (
          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
        )}
      </div>

      {/* Stats - Clientes (última semana), Pagando y CV (promedios) with inline deltas */}
      <div className="grid grid-cols-3 gap-1.5 text-center mb-2">
        <div className="bg-muted/50 rounded px-2 py-1.5">
          <div className="flex items-center justify-center">
            <span className="text-base font-bold">{clientes}</span>
            <InlineDelta value={route.balance} />
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
    </CardWrapper>
  )
}

/**
 * Summary card showing totals across all routes
 */
interface RouteStatsSummaryProps {
  totals: {
    lastWeekClientes: number
    pagandoPromedio: number
    cvPromedio: number
    balance: number
    pagandoDelta?: number
    cvDelta?: number
  }
}

export function RouteStatsSummary({ totals }: RouteStatsSummaryProps) {
  const pagandoPercentage = totals.lastWeekClientes > 0
    ? (totals.pagandoPromedio / totals.lastWeekClientes) * 100
    : 0
  const cvPercentage = totals.lastWeekClientes > 0
    ? (totals.cvPromedio / totals.lastWeekClientes) * 100
    : 0

  return (
    <div className="rounded-lg border p-3 sm:p-4 bg-muted/30">
      <p className="text-xs sm:text-sm font-medium mb-2 sm:mb-3">Resumen Total</p>
      <div className="grid grid-cols-3 gap-2 sm:gap-3 text-center mb-2 sm:mb-3">
        <div className="bg-muted/50 rounded px-2 sm:px-3 py-1.5 sm:py-2">
          <div className="flex items-center justify-center">
            <span className="text-lg sm:text-2xl font-bold">{totals.lastWeekClientes}</span>
            <InlineDelta value={totals.balance} />
          </div>
          <p className="text-[10px] sm:text-xs text-muted-foreground">Clientes</p>
        </div>
        <div className="bg-green-50 dark:bg-green-950/30 rounded px-2 sm:px-3 py-1.5 sm:py-2">
          <div className="flex items-center justify-center">
            <span className="text-lg sm:text-2xl font-bold text-green-600 dark:text-green-400">{totals.pagandoPromedio}</span>
            <InlineDelta value={totals.pagandoDelta ?? 0} />
          </div>
          <p className="text-[10px] sm:text-xs text-muted-foreground flex items-center justify-center gap-0.5 sm:gap-1">
            Pagando <span className="text-[8px] sm:text-[9px] font-semibold text-green-700 dark:text-green-300 bg-green-200 dark:bg-green-800/50 px-1 sm:px-1.5 py-0.5 rounded-sm uppercase tracking-wide hidden sm:inline">prom</span>
          </p>
        </div>
        <div className="bg-red-50 dark:bg-red-950/30 rounded px-2 sm:px-3 py-1.5 sm:py-2">
          <div className="flex items-center justify-center">
            <span className="text-lg sm:text-2xl font-bold text-red-600 dark:text-red-400">{totals.cvPromedio}</span>
            <InlineDelta value={totals.cvDelta ?? 0} inverted />
          </div>
          <p className="text-[10px] sm:text-xs text-muted-foreground flex items-center justify-center gap-0.5 sm:gap-1">
            CV <span className="text-[8px] sm:text-[9px] font-semibold text-red-700 dark:text-red-300 bg-red-200 dark:bg-red-800/50 px-1 sm:px-1.5 py-0.5 rounded-sm uppercase tracking-wide hidden sm:inline">prom</span>
          </p>
        </div>
      </div>
      {/* Progress Bar */}
      {totals.lastWeekClientes > 0 && (
        <div className="space-y-1">
          <div className="h-2 rounded-full bg-muted overflow-hidden flex">
            <div
              className="h-full bg-green-500 dark:bg-green-600"
              style={{ width: `${pagandoPercentage}%` }}
            />
            <div
              className="h-full bg-red-500 dark:bg-red-600"
              style={{ width: `${cvPercentage}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{pagandoPercentage.toFixed(0)}% pagando</span>
            <span>{cvPercentage.toFixed(0)}% CV</span>
          </div>
        </div>
      )}
    </div>
  )
}
