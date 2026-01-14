/**
 * Helpers for calculating locality alerts and top locations
 * from critical clients data
 */

import type { CriticalClient, LocationBreakdown } from '../hooks/useCEODashboard'
import type { LocalityAlert, TopLocation } from '../components'

// ============================================================================
// Types
// ============================================================================

interface LocalityData {
  locality: string
  route: string
  clientCount: number
  totalPending: number
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Build a map of CV counts by route name
 */
export function buildCVByRouteMap(locationBreakdown: LocationBreakdown[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const loc of locationBreakdown) {
    if (loc.routeName) {
      map.set(loc.routeName, (map.get(loc.routeName) || 0) + loc.clientesEnCV)
    }
  }
  return map
}

/**
 * Group critical clients by locality and route
 */
export function groupClientsByLocality(loans: CriticalClient[]): Map<string, LocalityData> {
  const map = new Map<string, LocalityData>()

  for (const client of loans) {
    const locality = client.lead.locality || 'Sin localidad'
    const route = client.lead.route || ''
    const key = `${locality}-${route}`

    if (!map.has(key)) {
      map.set(key, { locality, route, clientCount: 0, totalPending: 0 })
    }

    const data = map.get(key)!
    data.clientCount++
    data.totalPending += parseFloat(client.pendingAmountStored || '0')
  }

  return map
}

/**
 * Calculate percent change between two values
 */
export function calculatePercentChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return Math.round(((current - previous) / previous) * 100)
}

// ============================================================================
// Main Functions
// ============================================================================

/**
 * Build locality alerts from critical clients data
 * @param loans - Array of critical client loans
 * @param previousLocationBreakdown - Previous week's location breakdown
 * @param currentLocationBreakdown - Current week's location breakdown
 * @param minClientsForAlert - Minimum clients to trigger an alert
 * @param maxAlertsDisplayed - Maximum number of alerts to return
 */
export function buildLocalityAlerts(
  loans: CriticalClient[] | undefined,
  previousLocationBreakdown: LocationBreakdown[],
  currentLocationBreakdown: LocationBreakdown[],
  minClientsForAlert: number,
  maxAlertsDisplayed: number
): LocalityAlert[] {
  if (!loans || loans.length === 0) return []

  const previousCVByRoute = buildCVByRouteMap(previousLocationBreakdown)
  const currentCVByRoute = buildCVByRouteMap(currentLocationBreakdown)
  const localityMap = groupClientsByLocality(loans)

  const alerts: LocalityAlert[] = []

  for (const [key, data] of localityMap) {
    if (data.clientCount < minClientsForAlert) continue

    const prevRouteCV = previousCVByRoute.get(data.route) || 0
    const currRouteCV = currentCVByRoute.get(data.route) || 0
    const cvChange = currRouteCV - prevRouteCV

    alerts.push({
      locationId: key,
      locationName: data.locality,
      routeName: data.route,
      metricType: 'CV',
      previousValue: prevRouteCV,
      currentValue: data.clientCount,
      percentChange: calculatePercentChange(currRouteCV, prevRouteCV),
      direction: cvChange >= 0 ? 'UP' : 'DOWN',
      totalPending: data.totalPending,
    })
  }

  return alerts
    .sort((a, b) => b.currentValue - a.currentValue)
    .slice(0, maxAlertsDisplayed)
}

/**
 * Build top locations from critical clients
 * @param loans - Array of critical client loans
 * @param maxLocations - Maximum number of locations to return
 */
export function buildTopLocationsFromLeads(
  loans: CriticalClient[] | undefined,
  maxLocations: number = 6
): TopLocation[] {
  if (!loans || loans.length === 0) return []

  const localityMap = groupClientsByLocality(loans)

  return Array.from(localityMap.values())
    .map(data => ({
      locationId: `${data.locality}-${data.route}`,
      locationName: data.locality,
      routeName: data.route,
      clientesActivos: data.clientCount,
      clientesAlCorriente: 0,
      clientesEnCV: data.clientCount,
    }))
    .sort((a, b) => b.clientesActivos - a.clientesActivos)
    .slice(0, maxLocations)
}
