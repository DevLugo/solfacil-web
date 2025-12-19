'use client'

import { Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useRouteManagement } from './hooks/useRouteManagement'
import { RouteBreakdownTable } from './components/RouteBreakdownTable'
import { LocalityList } from './components/LocalityList'

/**
 * Route administration page
 * Allows viewing current route statistics and moving localities between routes
 * Always shows data for the current month
 */
export default function AdministrarRutasPage() {
  const {
    routes,
    otherRoutes,
    selectedRoute,
    loading,
    error,
    setSelectedRoute,
  } = useRouteManagement()

  if (loading) {
    return (
      <div className="container py-8">
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading routes...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container py-8">
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <div className="text-center">
            <p className="font-medium text-destructive">Error loading routes</p>
            <p className="text-sm text-muted-foreground">
              {error.message || 'An unexpected error occurred'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Manage Routes</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage localities assigned to each route
          </p>
        </div>

        {/* Current Period Badge */}
        <Badge variant="outline" className="border-border text-foreground">
          Current Month
        </Badge>
      </div>

      {/* Main Content */}
      {selectedRoute ? (
        <LocalityList
          route={selectedRoute}
          otherRoutes={otherRoutes}
          onBack={() => setSelectedRoute(null)}
        />
      ) : (
        <RouteBreakdownTable routes={routes} onSelectRoute={setSelectedRoute} />
      )}
    </div>
  )
}
