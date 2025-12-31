'use client'

import { useQuery } from '@apollo/client'
import { Download, Filter, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { Badge } from '@/components/ui/badge'
import { GET_ROUTES, GET_LOCATIONS } from '@/graphql/queries/leader'
import { PDF_EXPORT_ENDPOINT } from '../constants'
import type { BadDebtFilters, RouteOption, LocationOption } from '../types'

interface FilterBarProps {
  filters: BadDebtFilters
  onFiltersChange: (filters: BadDebtFilters) => void
  totalCount: number
  loading?: boolean
}

export function FilterBar({
  filters,
  onFiltersChange,
  totalCount,
  loading,
}: FilterBarProps) {
  // Fetch routes
  const { data: routesData } = useQuery<{ routes: RouteOption[] }>(GET_ROUTES)

  // Fetch locations based on selected route
  const { data: locationsData, loading: locationsLoading } = useQuery<{
    locations: LocationOption[]
  }>(GET_LOCATIONS, {
    variables: { routeId: filters.routeId },
    skip: !filters.routeId, // Only fetch when a route is selected
  })

  const routes = routesData?.routes || []
  const locations = locationsData?.locations || []

  const routeOptions = routes.map((r) => ({ value: r.id, label: r.name }))
  const locationOptions = locations.map((l) => ({ value: l.id, label: l.name }))

  const selectedRoute = routes.find((r) => r.id === filters.routeId)
  const selectedLocation = locations.find((l) => l.id === filters.locationId)

  const handleRouteChange = (routeId: string | null) => {
    // When route changes, clear location
    onFiltersChange({
      ...filters,
      routeId: routeId || undefined,
      locationId: undefined,
    })
  }

  const handleLocationChange = (locationId: string | null) => {
    onFiltersChange({
      ...filters,
      locationId: locationId || undefined,
    })
  }

  const handleClearFilters = () => {
    onFiltersChange({})
  }

  const handleExportPDF = () => {
    const params = new URLSearchParams()
    if (filters.routeId) params.append('routeId', filters.routeId)
    if (filters.locationId) params.append('locationId', filters.locationId)
    if (selectedRoute) params.append('routeName', selectedRoute.name)
    if (selectedLocation) params.append('locationName', selectedLocation.name)

    const url = `${PDF_EXPORT_ENDPOINT}?${params.toString()}`
    window.open(url, '_blank')
  }

  const hasFilters = filters.routeId || filters.locationId

  return (
    <div className="space-y-3">
      {/* Filter controls */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 text-muted-foreground">
          <Filter className="h-4 w-4" />
          <span className="text-sm font-medium">Filtros:</span>
        </div>

        <SearchableSelect
          options={routeOptions}
          value={filters.routeId}
          onValueChange={handleRouteChange}
          placeholder="Todas las rutas"
          searchPlaceholder="Buscar ruta..."
          emptyText="No hay rutas"
          className="w-40"
          allowClear
        />

        <SearchableSelect
          options={locationOptions}
          value={filters.locationId}
          onValueChange={handleLocationChange}
          placeholder="Todas las localidades"
          searchPlaceholder="Buscar localidad..."
          emptyText="No hay localidades"
          disabled={!filters.routeId || locationsLoading}
          loading={locationsLoading}
          className="w-48"
          allowClear
        />

        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearFilters}
            className="h-8 px-2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4 mr-1" />
            Limpiar
          </Button>
        )}

        <div className="flex-1" />

        <Button
          variant="outline"
          size="sm"
          onClick={handleExportPDF}
          disabled={loading}
          className="h-8"
        >
          <Download className="h-4 w-4 mr-1" />
          Exportar PDF
        </Button>
      </div>

      {/* Results count and active filters */}
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="font-mono">
          {loading ? '...' : totalCount} clientes morosos
        </Badge>

        {hasFilters && (
          <div className="flex items-center gap-1">
            {selectedRoute && (
              <Badge variant="outline" className="text-xs">
                {selectedRoute.name}
              </Badge>
            )}
            {selectedLocation && (
              <Badge variant="outline" className="text-xs">
                {selectedLocation.name}
              </Badge>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
