import { MapPin } from 'lucide-react'
import {
  RouteStatsCard,
  RouteStatsSummary,
  type RouteDeltas,
} from '@/components/features/route-stats'
import type { RouteWithStats } from '../types'

interface RouteBreakdownTableProps {
  routes: RouteWithStats[]
  routeDeltas: Map<string, RouteDeltas>
  totals: {
    lastWeekClientes: number
    pagandoPromedio: number
    cvPromedio: number
    balance: number
    pagandoDelta: number
    cvDelta: number
  }
  onSelectRoute: (route: RouteWithStats) => void
}

/**
 * Grid of route cards showing statistics for each route
 * Uses the same RouteStatsCard component as the portfolio report
 * Allows selection of a route to view its localities
 */
export function RouteBreakdownTable({
  routes,
  routeDeltas,
  totals,
  onSelectRoute,
}: RouteBreakdownTableProps) {
  if (routes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <MapPin className="h-12 w-12 text-muted-foreground" />
        <div className="text-center">
          <p className="font-medium text-foreground">No routes available</p>
          <p className="text-sm text-muted-foreground">No routes found in the system</p>
        </div>
      </div>
    )
  }

  // Sort by clientes activos descending
  const sortedRoutes = [...routes].sort((a, b) => {
    const aClientes = routeDeltas.get(a.routeId)?.lastWeekClientes ?? a.totalActivos
    const bClientes = routeDeltas.get(b.routeId)?.lastWeekClientes ?? b.totalActivos
    return bClientes - aClientes
  })

  return (
    <div className="space-y-4">
      {/* Summary */}
      <RouteStatsSummary totals={totals} />

      {/* Instruction */}
      <p className="text-xs sm:text-sm text-muted-foreground">
        Selecciona una ruta para ver y administrar sus localidades
      </p>

      {/* Cards grid */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {sortedRoutes.map((route) => {
          const deltas = routeDeltas.get(route.routeId)
          return (
            <div key={route.routeId} className="space-y-2">
              <RouteStatsCard
                route={{
                  id: route.routeId,
                  name: route.routeName,
                  clientesActivos: route.totalActivos,
                  clientesAlCorriente: route.alCorriente,
                  clientesEnCV: route.enCV,
                  balance: deltas?.clientesDelta ?? 0,
                }}
                deltas={deltas}
                onClick={() => onSelectRoute(route)}
              />
              <p className="text-xs text-muted-foreground text-center">
                {route.employees.length} {route.employees.length === 1 ? 'localidad' : 'localidades'}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
