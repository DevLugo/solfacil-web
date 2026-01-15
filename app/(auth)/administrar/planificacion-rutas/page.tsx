'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2, Map, Info, X, Filter } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useQuery } from '@apollo/client'
import { GET_ROUTES } from '@/graphql/queries/reports'
import { useRoutePlanning } from './hooks/useRoutePlanning'
import { MapSection } from './components/MapSection'
import { StatsPanel } from './components/StatsPanel'
import { LocationCoordinatesPanel } from './components/LocationCoordinatesPanel'
import { ScrollArea } from '@/components/ui/scroll-area'

interface RouteOption {
  id: string
  name: string
}

function LoadingState() {
  return (
    <div className="container py-8">
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Cargando datos...</p>
      </div>
    </div>
  )
}

export default function PlanificacionRutasPage() {
  // By default, show all routes (empty array)
  const [selectedRouteIds, setSelectedRouteIds] = useState<string[]>([])
  const [draggingLocation, setDraggingLocation] = useState<{
    id: string
    name: string
  } | null>(null)
  // Click-to-place workflow state
  const [placingLocation, setPlacingLocation] = useState<{
    id: string
    name: string
  } | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const { data: routesData, loading: routesLoading } = useQuery<{
    routes: RouteOption[]
  }>(GET_ROUTES)

  // State for route hover highlight
  const [hoveredRouteId, setHoveredRouteId] = useState<string | null>(null)

  const {
    locations,
    selectedIds,
    aggregatedStats,
    loading,
    editingLocationId,
    updatingCoordinates,
    toggleLocation,
    selectAll,
    clearSelection,
    addToSelection,
    updateCoordinates,
    startEditingCoordinates,
    cancelEditingCoordinates,
  } = useRoutePlanning(selectedRouteIds)

  // Toggle a route in the filter
  const toggleRouteFilter = (routeId: string) => {
    setSelectedRouteIds((prev) =>
      prev.includes(routeId)
        ? prev.filter((id) => id !== routeId)
        : [...prev, routeId]
    )
  }

  // ESC key to clear selection and placing mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (placingLocation) {
          setPlacingLocation(null)
          setSearchQuery('')
        } else if (selectedIds.size > 0) {
          clearSelection()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [placingLocation, selectedIds.size, clearSelection])

  if (routesLoading || loading) {
    return <LoadingState />
  }

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Map className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Mapa de Localidades
            </h1>
            <p className="text-sm text-muted-foreground">
              Visualiza y gestiona las coordenadas de las localidades
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Multi-select Route Filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full sm:w-auto justify-start">
                <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
                {selectedRouteIds.length === 0 ? (
                  <span>Todas las rutas</span>
                ) : (
                  <span>{selectedRouteIds.length} ruta{selectedRouteIds.length > 1 ? 's' : ''}</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-0" align="end">
              <div className="p-3 border-b">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Filtrar rutas</span>
                  {selectedRouteIds.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-1 text-xs"
                      onClick={() => setSelectedRouteIds([])}
                    >
                      Mostrar todas
                    </Button>
                  )}
                </div>
              </div>
              <ScrollArea className="h-64">
                <div className="p-2 space-y-1">
                  {(routesData?.routes || []).map((route) => (
                    <label
                      key={route.id}
                      className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer"
                    >
                      <Checkbox
                        checked={selectedRouteIds.includes(route.id)}
                        onCheckedChange={() => toggleRouteFilter(route.id)}
                      />
                      <span className="text-sm">{route.name}</span>
                    </label>
                  ))}
                </div>
              </ScrollArea>
            </PopoverContent>
          </Popover>

          {/* Selected routes badges */}
          {selectedRouteIds.length > 0 && selectedRouteIds.length <= 3 && (
            <div className="hidden sm:flex items-center gap-1">
              {selectedRouteIds.map((routeId) => {
                const route = routesData?.routes.find((r) => r.id === routeId)
                return route ? (
                  <Badge
                    key={routeId}
                    variant="secondary"
                    className="flex items-center gap-1"
                  >
                    {route.name}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => toggleRouteFilter(routeId)}
                    />
                  </Badge>
                ) : null
              })}
            </div>
          )}

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Info className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-xs">
                <p>
                  Click en localidades para ver info. Shift+drag para selección múltiple. ESC para limpiar selección.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map Section - 2 columns on desktop */}
        <div className="lg:col-span-2 space-y-4">
          <MapSection
            locations={locations}
            selectedIds={selectedIds}
            onLocationClick={toggleLocation}
            onSelectMultiple={addToSelection}
            onSelectAll={selectAll}
            onClearSelection={clearSelection}
            loading={loading}
            onDropLocation={async (locationId, lat, lng) => {
              await updateCoordinates(locationId, lat, lng)
              setDraggingLocation(null)
            }}
            droppingLocationId={draggingLocation?.id}
            droppingLocationName={draggingLocation?.name}
            placingLocationId={placingLocation?.id}
            placingLocationName={placingLocation?.name}
            onMapClickToPlace={async (lat, lng) => {
              if (placingLocation) {
                await updateCoordinates(placingLocation.id, lat, lng)
                setPlacingLocation(null)
                setSearchQuery('')
              }
            }}
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            hoveredRouteId={hoveredRouteId}
            onRouteHover={setHoveredRouteId}
          />
        </div>

        {/* Stats Panel - 1 column */}
        <div className="space-y-4">
          <StatsPanel
            selectedCount={selectedIds.size}
            stats={aggregatedStats}
            loading={loading}
            locations={locations}
            selectedIds={selectedIds}
          />

          {/* Location Coordinates Panel */}
          <LocationCoordinatesPanel
            locations={locations}
            editingLocationId={editingLocationId}
            updatingCoordinates={updatingCoordinates}
            onStartEditing={startEditingCoordinates}
            onCancelEditing={cancelEditingCoordinates}
            onSaveCoordinates={updateCoordinates}
            placingLocationId={placingLocation?.id}
            onSelectForPlacing={(id, name) => {
              setPlacingLocation({ id, name })
              setSearchQuery(name)
            }}
            onCancelPlacing={() => {
              setPlacingLocation(null)
              setSearchQuery('')
            }}
          />
        </div>
      </div>
    </div>
  )
}
