import type { RouteDeltas } from './RouteStatsCard'

/**
 * Minimal weekly data required for delta calculations
 */
export interface LocalityWeekData {
  isCompleted: boolean
  clientesActivos: number
  clientesAlCorriente: number
  clientesEnCV: number
}

/**
 * Minimal locality data required for delta calculations
 */
export interface LocalityBreakdownDetail {
  localityId: string
  routeId: string | null
  weeklyData: LocalityWeekData[]
  summary?: {
    alCorrientePromedio?: number
    cvPromedio?: number
  }
}

/**
 * Minimal locality report required for delta calculations
 */
export interface LocalityReport {
  localities: LocalityBreakdownDetail[]
}

/**
 * Calculate route deltas from weekly locality data
 * Used by both LocationBreakdown (reports) and useRouteManagement (admin)
 *
 * IMPORTANT: For averages (pagandoPromedio, cvPromedio), this function prefers
 * using pre-calculated values from locality.summary when available (from backend).
 * This ensures consistency with backend calculations and avoids recalculation errors.
 *
 * @param localityReport - The locality report with weekly data (accepts any object with localities array)
 * @returns Map of routeId to RouteDeltas
 */
export function calculateRouteDeltas<
  T extends { localities: Array<{ localityId: string; routeId: string | null; weeklyData: Array<{ isCompleted: boolean; clientesActivos: number; clientesAlCorriente: number; clientesEnCV: number }>; summary?: { alCorrientePromedio?: number; cvPromedio?: number } }> }
>(
  localityReport: T | null
): Map<string, RouteDeltas> {
  if (!localityReport?.localities) return new Map()

  const deltasMap = new Map<string, RouteDeltas>()

  // Group localities by route
  const localitiesByRoute = new Map<string, LocalityBreakdownDetail[]>()
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

    // Sum pre-calculated averages from backend (preferred)
    let summaryPagandoPromedio = 0
    let summaryCvPromedio = 0
    let hasSummaryData = false

    for (const loc of localities) {
      const weeklyData = loc.weeklyData || []
      const completedWeeks = weeklyData.filter((w) => w.isCompleted)

      // Use backend-calculated summary if available
      if (loc.summary?.alCorrientePromedio !== undefined || loc.summary?.cvPromedio !== undefined) {
        hasSummaryData = true
        summaryPagandoPromedio += loc.summary.alCorrientePromedio ?? 0
        summaryCvPromedio += loc.summary.cvPromedio ?? 0
      }

      if (completedWeeks.length >= 1) {
        const firstWeek = completedWeeks[0]
        const lastWeek = completedWeeks[completedWeeks.length - 1]

        firstWeekClientes += firstWeek.clientesActivos
        firstWeekPagando += firstWeek.clientesAlCorriente
        firstWeekCV += firstWeek.clientesEnCV

        lastWeekClientes += lastWeek.clientesActivos
        lastWeekPagando += lastWeek.clientesAlCorriente
        lastWeekCV += lastWeek.clientesEnCV
      }
    }

    // IMPORTANT: Use backend-calculated averages when available
    // This ensures consistency with the original Keystone calculation:
    // cvPromedio = sum(CV for all weeks) / number of weeks (per locality)
    // Then sum across localities for route total
    const pagandoPromedio = hasSummaryData ? Math.round(summaryPagandoPromedio) : lastWeekPagando
    const cvPromedio = hasSummaryData ? Math.round(summaryCvPromedio) : lastWeekCV

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
}

/**
 * Calculate totals from route deltas
 * Used to aggregate stats across all routes
 */
export interface RouteTotals {
  lastWeekClientes: number
  pagandoPromedio: number
  cvPromedio: number
  balance: number
  pagandoDelta: number
  cvDelta: number
}

export function calculateRouteTotals<
  T extends { localities: Array<{ weeklyData: Array<{ isCompleted: boolean; clientesActivos: number }> }> } | null
>(
  routeDeltas: Map<string, RouteDeltas>,
  localityReport: T
): RouteTotals {
  let lastWeekClientes = 0
  let pagandoPromedio = 0
  let cvPromedio = 0
  let balance = 0
  let pagandoDelta = 0
  let cvDelta = 0

  for (const deltas of routeDeltas.values()) {
    lastWeekClientes += deltas.lastWeekClientes
    pagandoPromedio += deltas.pagandoPromedio
    cvPromedio += deltas.cvPromedio
    pagandoDelta += deltas.pagandoDelta
    cvDelta += deltas.cvDelta
  }

  // Calculate balance from locality report
  if (localityReport?.localities) {
    for (const loc of localityReport.localities) {
      const completedWeeks = loc.weeklyData?.filter((w) => w.isCompleted) || []
      if (completedWeeks.length > 0) {
        const lastWeek = completedWeeks[completedWeeks.length - 1]
        const firstWeek = completedWeeks[0]
        balance += lastWeek.clientesActivos - firstWeek.clientesActivos
      }
    }
  }

  return {
    lastWeekClientes,
    pagandoPromedio,
    cvPromedio,
    balance,
    pagandoDelta,
    cvDelta,
  }
}
