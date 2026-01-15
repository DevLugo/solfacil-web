'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckSquare, Square, MapPin, Loader2 } from 'lucide-react'
import dynamic from 'next/dynamic'

const RouteMap = dynamic(
  () =>
    import('@/components/features/route-planning/map/RouteMap').then(
      (m) => m.RouteMap
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-full bg-muted/50 rounded-lg flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    ),
  }
)

interface MapSectionProps {
  locations: Array<{
    locationId: string
    locationName: string
    latitude: number | null
    longitude: number | null
    clientesActivos: number
    clientesEnCV: number
    routeId: string
    routeName: string
  }>
  selectedIds: Set<string>
  onLocationClick: (id: string) => void
  onSelectMultiple?: (ids: string[]) => void
  onSelectAll: () => void
  onClearSelection: () => void
  loading: boolean
  onDropLocation?: (locationId: string, lat: number, lng: number) => void
  droppingLocationId?: string | null
  droppingLocationName?: string | null
  // Click-to-place workflow
  placingLocationId?: string | null
  placingLocationName?: string | null
  onMapClickToPlace?: (lat: number, lng: number) => void
  searchQuery?: string
  onSearchQueryChange?: (query: string) => void
}

export function MapSection({
  locations,
  selectedIds,
  onLocationClick,
  onSelectMultiple,
  onSelectAll,
  onClearSelection,
  loading,
  onDropLocation,
  droppingLocationId,
  droppingLocationName,
  placingLocationId,
  placingLocationName,
  onMapClickToPlace,
  searchQuery,
  onSearchQueryChange,
}: MapSectionProps) {
  const hasCoordinates = (location: MapSectionProps['locations'][0]) =>
    location.latitude !== null && location.longitude !== null

  const locationsWithCoords = locations.filter(hasCoordinates)
  const locationsWithoutCoords = locations.filter((l) => !hasCoordinates(l))

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base font-medium">
              Mapa de Localidades
            </CardTitle>
            <Badge variant="secondary" className="font-mono text-xs">
              {locationsWithCoords.length} de {locations.length}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onSelectAll}
              disabled={loading || locations.length === 0}
            >
              <CheckSquare className="h-4 w-4 mr-1" />
              Todo
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearSelection}
              disabled={loading || selectedIds.size === 0}
            >
              <Square className="h-4 w-4 mr-1" />
              Limpiar
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4">
        {/* Map Container - height accounts for search bar (~50px) and legend (~40px) */}
        <div className="h-[500px] lg:h-[600px] relative">
          <RouteMap
            locations={locationsWithCoords.map((l) => ({
              id: l.locationId,
              name: l.locationName,
              latitude: l.latitude!,
              longitude: l.longitude!,
              clientesActivos: l.clientesActivos,
              clientesEnCV: l.clientesEnCV,
              isSelected: selectedIds.has(l.locationId),
              routeId: l.routeId,
              routeName: l.routeName,
            }))}
            selectedIds={selectedIds}
            onLocationClick={onLocationClick}
            onSelectMultiple={onSelectMultiple}
            onClearSelection={onClearSelection}
            showConnections={true}
            className="h-full w-full"
            onDropLocation={onDropLocation}
            droppingLocationId={droppingLocationId}
            droppingLocationName={droppingLocationName}
            placingLocationId={placingLocationId}
            placingLocationName={placingLocationName}
            onMapClickToPlace={onMapClickToPlace}
            initialSearchQuery={searchQuery}
            onSearchQueryChange={onSearchQueryChange}
          />

          {/* Overlay for locations without coords */}
          {locationsWithoutCoords.length > 0 && (
            <div className="absolute bottom-4 left-4 right-4 p-3 bg-warning/10 border border-warning/30 rounded-lg backdrop-blur-sm">
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-warning mt-0.5 shrink-0" />
                <div className="text-xs">
                  <p className="font-medium text-foreground">
                    {locationsWithoutCoords.length} localidades sin coordenadas
                  </p>
                  <p className="text-muted-foreground mt-0.5">
                    {locationsWithoutCoords
                      .slice(0, 3)
                      .map((l) => l.locationName)
                      .join(', ')}
                    {locationsWithoutCoords.length > 3 &&
                      ` y ${locationsWithoutCoords.length - 3} mas`}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
