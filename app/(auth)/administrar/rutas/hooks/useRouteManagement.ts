import { useState, useMemo } from 'react'
import { useQuery } from '@apollo/client'
import { GET_ROUTES_WITH_STATS } from '@/graphql/queries/routeManagement'
import { GET_PORTFOLIO_BY_LOCALITY } from '@/graphql/queries/portfolioReport'
import type { RouteWithStats } from '../types'
import {
  calculateRouteDeltas,
  calculateRouteTotals,
  type LocalityReport,
} from '@/components/features/route-stats'

/**
 * Hook for managing route data and selection state
 * Always fetches data for the current month
 * Includes portfolio data for accurate KPI calculations (averages, deltas)
 */
export function useRouteManagement() {
  const [selectedRoute, setSelectedRoute] = useState<RouteWithStats | null>(null)

  // Always use current month
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  // Fetch routes with basic stats (for employee/locality data)
  const { data, loading, error, refetch } = useQuery(GET_ROUTES_WITH_STATS, {
    variables: { year, month },
    fetchPolicy: 'cache-and-network',
  })

  // Fetch portfolio data for accurate KPIs (weekly breakdown for averages)
  const { data: portfolioData, loading: portfolioLoading } = useQuery(GET_PORTFOLIO_BY_LOCALITY, {
    variables: { year, month, filters: {} },
    fetchPolicy: 'cache-and-network',
  })

  const routes = useMemo(() => {
    return (data?.routesWithStats ?? []) as RouteWithStats[]
  }, [data])

  const localityReport = useMemo(() => {
    return (portfolioData?.portfolioByLocality ?? null) as LocalityReport | null
  }, [portfolioData])

  // Calculate route deltas from weekly data (shared logic with LocationBreakdown)
  const routeDeltas = useMemo(() => {
    return calculateRouteDeltas(localityReport)
  }, [localityReport])

  // Calculate totals for summary (shared logic)
  const totals = useMemo(() => {
    return calculateRouteTotals(routeDeltas, localityReport)
  }, [routeDeltas, localityReport])

  const otherRoutes = useMemo(() => {
    if (!selectedRoute) return routes
    return routes.filter((r) => r.routeId !== selectedRoute.routeId)
  }, [routes, selectedRoute])

  return {
    routes,
    otherRoutes,
    routeDeltas,
    totals,
    selectedRoute,
    loading: loading || portfolioLoading,
    error,
    setSelectedRoute,
    refetch,
  }
}
