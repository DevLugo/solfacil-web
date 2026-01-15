'use client'

import { useMemo, useEffect, useState, useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'
import type { LatLngExpression, Map as LeafletMap } from 'leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, Loader2, MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'

// ============================================================================
// Constants
// ============================================================================

/** Default center coordinates (Mexico) when no locations available */
const DEFAULT_CENTER: LatLngExpression = [23.6345, -102.5528]

/** Zoom levels for different scenarios */
const ZOOM = {
  DEFAULT: 10,
  SINGLE_LOCATION: 14,
  SEARCH_RESULT: 14,
  MAX_FIT_BOUNDS: 15,
} as const

/** Icon sizes for different marker states */
const ICON_SIZE = {
  DEFAULT: 12,
  SELECTED: 32,
  PLACING: 36,
} as const

/** Map padding for fit bounds */
const FIT_BOUNDS_PADDING: [number, number] = [50, 50]

/** CV (Cartera Vencida) warning color */
const CV_WARNING_COLOR = 'hsl(38, 92%, 50%)'

// ============================================================================
// Dynamic Imports (SSR disabled for Leaflet)
// ============================================================================

const MapContainer = dynamic(
  () => import('react-leaflet').then((m) => m.MapContainer),
  { ssr: false }
)
const TileLayer = dynamic(
  () => import('react-leaflet').then((m) => m.TileLayer),
  { ssr: false }
)
const Marker = dynamic(
  () => import('react-leaflet').then((m) => m.Marker),
  { ssr: false }
)
const Popup = dynamic(
  () => import('react-leaflet').then((m) => m.Popup),
  { ssr: false }
)
const Polyline = dynamic(
  () => import('react-leaflet').then((m) => m.Polyline),
  { ssr: false }
)
const Tooltip = dynamic(
  () => import('react-leaflet').then((m) => m.Tooltip),
  { ssr: false }
)

// Component to access map instance
function MapController({
  onMapReady,
}: {
  onMapReady: (map: LeafletMap) => void
}) {
  const MapHook = dynamic(
    () =>
      import('react-leaflet').then((m) => {
        const Component = () => {
          const map = m.useMap()
          useEffect(() => {
            onMapReady(map)
          }, [map])
          return null
        }
        return Component
      }),
    { ssr: false }
  )
  return <MapHook />
}

export interface MapLocation {
  id: string
  name: string
  latitude: number
  longitude: number
  clientesActivos: number
  clientesEnCV: number
  isSelected?: boolean
  routeId: string
  routeName: string
}

/** Color palette for routes (up to 12 distinct colors) */
const ROUTE_COLORS = [
  { bg: 'hsl(240, 38%, 25%)', name: 'Azul marino' },
  { bg: 'hsl(142, 71%, 35%)', name: 'Verde' },
  { bg: 'hsl(262, 52%, 47%)', name: 'Púrpura' },
  { bg: 'hsl(25, 95%, 53%)', name: 'Naranja' },
  { bg: 'hsl(340, 82%, 52%)', name: 'Rosa' },
  { bg: 'hsl(199, 89%, 48%)', name: 'Cyan' },
  { bg: 'hsl(45, 93%, 47%)', name: 'Amarillo' },
  { bg: 'hsl(0, 72%, 51%)', name: 'Rojo' },
  { bg: 'hsl(173, 58%, 39%)', name: 'Teal' },
  { bg: 'hsl(291, 47%, 51%)', name: 'Magenta' },
  { bg: 'hsl(142, 76%, 26%)', name: 'Verde oscuro' },
  { bg: 'hsl(220, 70%, 50%)', name: 'Azul' },
] as const

// ============================================================================
// Utility Functions
// ============================================================================

/** Check if a location has valid coordinates */
export function hasValidCoordinates<T extends { latitude: number | null; longitude: number | null }>(
  location: T
): location is T & { latitude: number; longitude: number } {
  return location.latitude !== null && location.longitude !== null
}

/** Get container-relative point from mouse event */
function getContainerPoint(
  e: React.MouseEvent | React.DragEvent,
  containerRef: React.RefObject<HTMLDivElement | null>
): { x: number; y: number } | null {
  const rect = containerRef.current?.getBoundingClientRect()
  if (!rect) return null
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top,
  }
}

// ============================================================================
// Icon Creation Functions
// ============================================================================

/** Create icon for placing mode (animated pin) */
function createPlacingIcon(count: number): L.DivIcon {
  const size = ICON_SIZE.PLACING
  const html = `
    <div style="
      width: ${size}px;
      height: ${size}px;
      background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%);
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      border: 3px solid white;
      box-shadow: 0 4px 16px rgba(6, 182, 212, 0.5), 0 0 0 4px rgba(6, 182, 212, 0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      animation: pulse 1.5s ease-in-out infinite;
    ">
      <span style="
        transform: rotate(45deg);
        color: white;
        font-size: 14px;
        font-weight: 700;
        font-family: ui-monospace;
      ">${count}</span>
    </div>
  `
  return L.divIcon({
    className: 'route-marker route-marker-placing',
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    html,
  })
}

/** Create icon for selected state (larger with count) */
function createSelectedIcon(count: number, hasCV: boolean): L.DivIcon {
  const size = ICON_SIZE.SELECTED
  const cvRing = hasCV ? `outline: 3px solid ${CV_WARNING_COLOR}; outline-offset: 2px;` : ''
  const html = `
    <div style="
      width: ${size}px;
      height: ${size}px;
      background: linear-gradient(135deg, hsl(18, 87%, 54%) 0%, hsl(18, 87%, 44%) 100%);
      border-radius: 50%;
      border: 2px solid white;
      box-shadow: 0 3px 10px rgba(0,0,0,0.25);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 12px;
      font-weight: 700;
      font-family: ui-monospace;
      ${cvRing}
    ">${count}</div>
  `
  return L.divIcon({
    className: 'route-marker',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html,
  })
}

/** Create icon for default state (minimal dot) */
function createDefaultIcon(routeColor: string, hasCV: boolean, isDimmed: boolean = false): L.DivIcon {
  const size = ICON_SIZE.DEFAULT
  const bgColor = routeColor
  const shadowColor = hasCV ? 'rgba(245, 158, 11, 0.4)' : 'rgba(0,0,0,0.2)'
  const opacity = isDimmed ? 0.3 : 1
  const borderStyle = hasCV ? `border: 2px solid ${CV_WARNING_COLOR};` : 'border: 2px solid white;'

  const html = `
    <div style="
      width: ${size}px;
      height: ${size}px;
      background: ${bgColor};
      border-radius: 50%;
      ${borderStyle}
      box-shadow: 0 2px 6px ${shadowColor};
      transition: opacity 0.2s ease, transform 0.2s ease;
      opacity: ${opacity};
    "></div>
  `
  return L.divIcon({
    className: 'route-marker',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html,
  })
}

/** Create marker icon based on state */
function createMarkerIcon(
  isSelected: boolean,
  hasCV: boolean,
  count: number,
  isPlacing: boolean,
  routeColor: string,
  isDimmed: boolean = false
): L.DivIcon {
  if (isPlacing) return createPlacingIcon(count)
  if (isSelected) return createSelectedIcon(count, hasCV)
  return createDefaultIcon(routeColor, hasCV, isDimmed)
}

interface RouteMapProps {
  locations: MapLocation[]
  selectedIds: Set<string>
  onLocationClick: (id: string) => void
  onSelectMultiple?: (ids: string[]) => void
  onClearSelection?: () => void
  showConnections?: boolean
  className?: string
  onDropLocation?: (locationId: string, lat: number, lng: number) => void
  droppingLocationId?: string | null
  droppingLocationName?: string | null
  // New props for click-to-place workflow
  placingLocationId?: string | null
  placingLocationName?: string | null
  onMapClickToPlace?: (lat: number, lng: number) => void
  onSearchQueryChange?: (query: string) => void
  initialSearchQuery?: string
  // Route hover highlight
  hoveredRouteId?: string | null
  onRouteHover?: (routeId: string | null) => void
}

interface SearchResult {
  display_name: string
  lat: string
  lon: string
}

export function RouteMap({
  locations,
  selectedIds,
  onLocationClick,
  onSelectMultiple,
  onClearSelection,
  showConnections = true,
  className,
  onDropLocation,
  droppingLocationId,
  droppingLocationName,
  placingLocationId,
  placingLocationName,
  onMapClickToPlace,
  onSearchQueryChange,
  initialSearchQuery,
  hoveredRouteId,
  onRouteHover,
}: RouteMapProps) {
  const [mapInstance, setMapInstance] = useState<LeafletMap | null>(null)
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery || '')
  const [searching, setSearching] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Box selection state
  const [isBoxSelecting, setIsBoxSelecting] = useState(false)
  const [boxStart, setBoxStart] = useState<{ x: number; y: number } | null>(null)
  const [boxEnd, setBoxEnd] = useState<{ x: number; y: number } | null>(null)
  const boxRef = useRef<HTMLDivElement>(null)

  // Build route color map from unique routes in locations
  const routeColorMap = useMemo(() => {
    const uniqueRouteNames = [...new Set(locations.map((l) => l.routeName))]
    const map = new Map<string, string>()
    uniqueRouteNames.forEach((routeName, index) => {
      map.set(routeName, ROUTE_COLORS[index % ROUTE_COLORS.length].bg)
    })
    return map
  }, [locations])

  // Get route legend data for display
  const routeLegend = useMemo(() => {
    const uniqueRoutes = new Map<string, { id: string; name: string; color: string }>()
    locations.forEach((loc) => {
      if (!uniqueRoutes.has(loc.routeName)) {
        uniqueRoutes.set(loc.routeName, {
          id: loc.routeId,
          name: loc.routeName,
          color: routeColorMap.get(loc.routeName) || ROUTE_COLORS[0].bg,
        })
      }
    })
    return Array.from(uniqueRoutes.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [locations, routeColorMap])

  // Sync search query when initialSearchQuery changes (location selected)
  useEffect(() => {
    if (initialSearchQuery !== undefined) {
      setSearchQuery(initialSearchQuery)
      // Auto-search when a location is selected
      if (initialSearchQuery && mapInstance) {
        handleSearchWithQuery(initialSearchQuery)
      }
    }
  }, [initialSearchQuery])

  // Fix Leaflet default icons
  useEffect(() => {
    delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: string })
      ._getIconUrl
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: '/leaflet/marker-icon-2x.png',
      iconUrl: '/leaflet/marker-icon.png',
      shadowUrl: '/leaflet/marker-shadow.png',
    })
  }, [])

  // Map center (fallback for initial render)
  const center = useMemo<LatLngExpression>(() => {
    const validLocations = locations.filter(hasValidCoordinates)
    if (validLocations.length === 0) return DEFAULT_CENTER

    const avgLat = validLocations.reduce((sum, l) => sum + l.latitude, 0) / validLocations.length
    const avgLng = validLocations.reduce((sum, l) => sum + l.longitude, 0) / validLocations.length
    return [avgLat, avgLng]
  }, [locations])

  // Fit bounds to show all locations when they change
  useEffect(() => {
    if (!mapInstance) return

    const validLocations = locations.filter(hasValidCoordinates)
    if (validLocations.length === 0) return

    if (validLocations.length === 1) {
      mapInstance.setView(
        [validLocations[0].latitude, validLocations[0].longitude],
        ZOOM.SINGLE_LOCATION
      )
    } else {
      const bounds = L.latLngBounds(
        validLocations.map((l) => [l.latitude, l.longitude] as [number, number])
      )
      mapInstance.fitBounds(bounds, {
        padding: FIT_BOUNDS_PADDING,
        maxZoom: ZOOM.MAX_FIT_BOUNDS,
      })
    }
  }, [mapInstance, locations])

  // Polyline for selected locations
  const polylinePositions = useMemo(() => {
    const selectedLocations = locations.filter(
      (l) => selectedIds.has(l.id) && hasValidCoordinates(l)
    )
    if (selectedLocations.length < 2) return []
    return selectedLocations.map((l) => [l.latitude, l.longitude] as LatLngExpression)
  }, [locations, selectedIds])

  // ============================================================================
  // Box Selection Handlers
  // ============================================================================

  /** Reset box selection state and re-enable map dragging */
  const cleanupBoxSelection = useCallback(() => {
    setIsBoxSelecting(false)
    setBoxStart(null)
    setBoxEnd(null)
    if (mapInstance) mapInstance.dragging.enable()
  }, [mapInstance])

  /** Find locations within the selection box and select them */
  const selectLocationsInBox = useCallback(
    (start: { x: number; y: number }, end: { x: number; y: number }) => {
      if (!mapInstance || !onSelectMultiple) return

      const minX = Math.min(start.x, end.x)
      const maxX = Math.max(start.x, end.x)
      const minY = Math.min(start.y, end.y)
      const maxY = Math.max(start.y, end.y)

      const selectedLocationIds = locations
        .filter(hasValidCoordinates)
        .filter((location) => {
          const point = mapInstance.latLngToContainerPoint([location.latitude, location.longitude])
          return point.x >= minX && point.x <= maxX && point.y >= minY && point.y <= maxY
        })
        .map((location) => location.id)

      if (selectedLocationIds.length > 0) {
        onSelectMultiple(selectedLocationIds)
      }
    },
    [mapInstance, locations, onSelectMultiple]
  )

  // Box selection event handlers
  const handleBoxSelectStart = useCallback(
    (e: React.MouseEvent) => {
      if (!e.shiftKey || !mapInstance || !onSelectMultiple) return

      mapInstance.dragging.disable()
      const point = getContainerPoint(e, containerRef)
      if (!point) return

      setIsBoxSelecting(true)
      setBoxStart(point)
      setBoxEnd(point)
    },
    [mapInstance, onSelectMultiple]
  )

  const handleBoxSelectMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isBoxSelecting || !boxStart) return

      const point = getContainerPoint(e, containerRef)
      if (point) setBoxEnd(point)
    },
    [isBoxSelecting, boxStart]
  )

  const handleBoxSelectEnd = useCallback(() => {
    if (!isBoxSelecting || !boxStart || !boxEnd) {
      cleanupBoxSelection()
      return
    }

    selectLocationsInBox(boxStart, boxEnd)
    cleanupBoxSelection()
  }, [isBoxSelecting, boxStart, boxEnd, selectLocationsInBox, cleanupBoxSelection])

  // Calculate box selection rectangle style
  const boxStyle = useMemo(() => {
    if (!boxStart || !boxEnd) return null

    const left = Math.min(boxStart.x, boxEnd.x)
    const top = Math.min(boxStart.y, boxEnd.y)
    const width = Math.abs(boxEnd.x - boxStart.x)
    const height = Math.abs(boxEnd.y - boxStart.y)

    return { left, top, width, height }
  }, [boxStart, boxEnd])

  // Search location using Nominatim
  const handleSearchWithQuery = async (query: string) => {
    if (!query.trim() || !mapInstance) return

    setSearching(true)
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}, Mexico&limit=1`
      )
      const results: SearchResult[] = await response.json()

      if (results.length > 0) {
        const { lat, lon } = results[0]
        mapInstance.setView([parseFloat(lat), parseFloat(lon)], ZOOM.SEARCH_RESULT)
      }
    } catch (error) {
      console.error('Error searching location:', error)
    } finally {
      setSearching(false)
    }
  }

  const handleSearch = () => handleSearchWithQuery(searchQuery)

  // Handle map click when in placing mode
  const handleMapClick = useCallback(
    (e: L.LeafletMouseEvent) => {
      // If placing a location, assign coordinates
      if (placingLocationId && onMapClickToPlace) {
        onMapClickToPlace(e.latlng.lat, e.latlng.lng)
        return
      }

      // Otherwise, clear selection if there are selected items
      if (selectedIds.size > 0 && onClearSelection) {
        onClearSelection()
      }
    },
    [placingLocationId, onMapClickToPlace, selectedIds.size, onClearSelection]
  )

  // Setup map click handler
  useEffect(() => {
    if (!mapInstance) return

    // Always listen for map clicks
    mapInstance.on('click', handleMapClick)

    // Change cursor to crosshair when placing
    if (placingLocationId) {
      mapInstance.getContainer().style.cursor = 'crosshair'
    } else {
      mapInstance.getContainer().style.cursor = ''
    }

    return () => {
      mapInstance.off('click', handleMapClick)
      mapInstance.getContainer().style.cursor = ''
    }
  }, [mapInstance, placingLocationId, handleMapClick])

  // Handle drag over
  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'copy'
      setIsDragOver(true)
    },
    []
  )

  // Handle drag leave
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  // Handle drop
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)

      if (!mapInstance || !onDropLocation) return

      const locationId = e.dataTransfer.getData('locationId')
      if (!locationId) return

      const point = getContainerPoint(e, containerRef)
      if (!point) return

      const latlng = mapInstance.containerPointToLatLng(L.point(point.x, point.y))
      onDropLocation(locationId, latlng.lat, latlng.lng)
    },
    [mapInstance, onDropLocation]
  )

  return (
    <div className={cn('flex flex-col', className)}>
      {/* Placing Mode Banner */}
      {placingLocationId && (
        <div className="flex-shrink-0 mb-3 p-3 bg-primary/10 border border-primary/30 rounded-lg">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary animate-pulse" />
            <div>
              <p className="font-medium text-sm">
                {locations.some(l => l.id === placingLocationId) ? 'Reposicionando' : 'Colocando'}:{' '}
                <span className="text-primary">{placingLocationName}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                Usa el buscador para encontrar la ubicación, luego haz click en el mapa
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="flex-shrink-0 flex gap-2 mb-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar estado, ciudad o direccion..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              onSearchQueryChange?.(e.target.value)
            }}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className={cn('pl-9', placingLocationId && 'border-primary')}
          />
        </div>
        <Button onClick={handleSearch} disabled={searching || !searchQuery}>
          {searching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            'Buscar'
          )}
        </Button>
      </div>


      {/* Map Container with Drop Zone and Box Selection */}
      <div
        ref={containerRef}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onMouseDown={handleBoxSelectStart}
        onMouseMove={handleBoxSelectMove}
        onMouseUp={handleBoxSelectEnd}
        onMouseLeave={handleBoxSelectEnd}
        className={cn('relative flex-1 min-h-0', isBoxSelecting && 'cursor-crosshair select-none')}
      >
        {/* Box selection rectangle */}
        {isBoxSelecting && boxStyle && (
          <div
            ref={boxRef}
            className="absolute z-[1001] border-2 border-primary bg-primary/20 pointer-events-none"
            style={{
              left: boxStyle.left,
              top: boxStyle.top,
              width: boxStyle.width,
              height: boxStyle.height,
            }}
          />
        )}

        {/* Drop overlay */}
        {isDragOver && (
          <div className="absolute inset-0 z-[1000] bg-primary/20 border-4 border-dashed border-primary rounded-lg flex items-center justify-center pointer-events-none">
            <div className="bg-card p-4 rounded-lg shadow-lg text-center">
              <MapPin className="h-8 w-8 text-primary mx-auto mb-2" />
              <p className="font-medium">
                {droppingLocationName
                  ? `Soltar "${droppingLocationName}" aqui`
                  : 'Soltar localidad aqui'}
              </p>
              <p className="text-sm text-muted-foreground">
                para asignar coordenadas
              </p>
            </div>
          </div>
        )}

        {/* Route Legend Overlay */}
        {routeLegend.length > 1 && (
          <div className="absolute top-3 right-3 z-[1000] bg-card/95 backdrop-blur-sm rounded-lg shadow-lg border p-2 space-y-1">
            {routeLegend.map((route) => {
              const isHovered = hoveredRouteId === route.id
              const locationCount = locations.filter(l => l.routeName === route.name).length
              return (
                <div
                  key={route.id}
                  onMouseEnter={() => onRouteHover?.(route.id)}
                  onMouseLeave={() => onRouteHover?.(null)}
                  className={cn(
                    'flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-all',
                    isHovered ? 'bg-muted' : 'hover:bg-muted/50'
                  )}
                >
                  <div
                    className={cn(
                      'w-3 h-3 rounded-full border-2 border-white shadow-sm transition-transform',
                      isHovered && 'scale-125'
                    )}
                    style={{ backgroundColor: route.color }}
                  />
                  <span className={cn(
                    'text-xs transition-colors',
                    isHovered ? 'text-foreground font-medium' : 'text-muted-foreground'
                  )}>
                    {route.name}
                  </span>
                  <span className="text-xs text-muted-foreground/70 font-mono">
                    ({locationCount})
                  </span>
                </div>
              )
            })}
          </div>
        )}

        <MapContainer
          center={center}
          zoom={ZOOM.DEFAULT}
          style={{ height: '100%', width: '100%' }}
        >
          <MapController onMapReady={setMapInstance} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {locations.filter(hasValidCoordinates).map((location) => {
            const isPlacing = placingLocationId === location.id
            const isSelected = selectedIds.has(location.id)
            const routeColor = routeColorMap.get(location.routeName) || ROUTE_COLORS[0].bg
            // Dim markers from other routes when hovering a specific route
            const isDimmed = hoveredRouteId !== null && location.routeId !== hoveredRouteId
            return (
              <Marker
                key={location.id}
                position={[location.latitude, location.longitude]}
                icon={createMarkerIcon(
                  isSelected,
                  location.clientesEnCV > 0,
                  location.clientesActivos,
                  isPlacing,
                  routeColor,
                  isDimmed
                )}
                draggable={true}
                eventHandlers={{
                  click: () => onLocationClick(location.id),
                  dragend: (e) => {
                    const marker = e.target
                    const position = marker.getLatLng()
                    if (onDropLocation) {
                      onDropLocation(location.id, position.lat, position.lng)
                    }
                  },
                }}
              >
                <Tooltip direction="top" offset={[0, -10]} opacity={1}>
                  <div className="text-xs font-medium">
                    <p>{location.name}</p>
                    <p className="text-muted-foreground">{location.routeName}</p>
                  </div>
                </Tooltip>
                <Popup>
                  <div className="text-sm">
                    <p className="font-semibold">{location.name}</p>
                    <p className="text-xs text-muted-foreground mb-1">{location.routeName}</p>
                    <p>Activos: {location.clientesActivos}</p>
                    {location.clientesEnCV > 0 && (
                      <p className="text-orange-600">
                        CV: {location.clientesEnCV}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      Arrastra para reposicionar
                    </p>
                  </div>
                </Popup>
              </Marker>
            )
          })}

          {showConnections && polylinePositions.length > 1 && (
            <Polyline
              positions={polylinePositions}
              pathOptions={{
                color: 'hsl(18, 87%, 54%)',
                weight: 3,
                dashArray: '8, 8',
              }}
            />
          )}
        </MapContainer>
      </div>
    </div>
  )
}
