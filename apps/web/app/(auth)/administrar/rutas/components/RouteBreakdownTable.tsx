import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MapPin } from 'lucide-react'
import { RouteStatsCard } from './RouteStatsCard'
import type { RouteWithStats } from '../types'

interface RouteBreakdownTableProps {
  routes: RouteWithStats[]
  onSelectRoute: (route: RouteWithStats) => void
}

/**
 * Grid of route cards showing statistics for each route
 * Allows selection of a route to view its localities
 */
export function RouteBreakdownTable({ routes, onSelectRoute }: RouteBreakdownTableProps) {
  if (routes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <MapPin className="h-12 w-12 text-muted-foreground" />
        <div className="text-center">
          <p className="font-medium text-foreground">No routes available</p>
          <p className="text-sm text-muted-foreground">
            No routes found in the system
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {routes.map((route) => (
        <Card key={route.routeId} className="hover:shadow-md transition-shadow border-border">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <CardTitle className="text-lg text-foreground">{route.routeName}</CardTitle>
              <Badge variant="secondary" className="text-xs">
                {route.employees.length} {route.employees.length === 1 ? 'locality' : 'localities'}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <RouteStatsCard stats={route} />

            <Button
              onClick={() => onSelectRoute(route)}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              size="sm"
            >
              View Localities
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
