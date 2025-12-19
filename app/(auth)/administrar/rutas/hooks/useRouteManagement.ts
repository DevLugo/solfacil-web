import { useState, useMemo } from 'react'
import { useQuery } from '@apollo/client'
import { GET_ROUTES_WITH_STATS } from '@/graphql/queries/routeManagement'
import type { RouteWithStats } from '../types'

/**
 * Hook for managing route data and selection state
 * Always fetches data for the current month
 */
export function useRouteManagement() {
  const [selectedRoute, setSelectedRoute] = useState<RouteWithStats | null>(null)

  // Always use current month
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  const { data, loading, error } = useQuery(GET_ROUTES_WITH_STATS, {
    variables: { year, month },
    fetchPolicy: 'cache-and-network',
  })

  const routes = useMemo(() => {
    return (data?.routesWithStats ?? []) as RouteWithStats[]
  }, [data])

  const otherRoutes = useMemo(() => {
    if (!selectedRoute) return routes
    return routes.filter((r) => r.routeId !== selectedRoute.routeId)
  }, [routes, selectedRoute])

  return {
    routes,
    otherRoutes,
    selectedRoute,
    loading,
    error,
    setSelectedRoute,
  }
}
