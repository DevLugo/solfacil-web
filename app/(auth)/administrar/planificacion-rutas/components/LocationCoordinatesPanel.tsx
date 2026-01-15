'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  MapPin,
  Check,
  X,
  Edit2,
  AlertCircle,
  Loader2,
  Navigation,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { LocationForPlanning } from '../hooks/useRoutePlanning'

// ============================================================================
// Constants
// ============================================================================

const COORDINATE_BOUNDS = {
  latitude: { min: -90, max: 90 },
  longitude: { min: -180, max: 180 },
} as const

// ============================================================================
// Utility Functions
// ============================================================================

/** Check if a location has valid coordinates */
const hasValidCoordinates = (location: LocationForPlanning): boolean =>
  location.latitude !== null && location.longitude !== null

/** Validate coordinate values */
function validateCoordinates(lat: string, lng: string): { isValid: boolean; error?: string } {
  const latNum = parseFloat(lat)
  const lngNum = parseFloat(lng)

  if (isNaN(latNum) || isNaN(lngNum)) {
    return { isValid: false, error: 'Coordenadas inválidas' }
  }
  if (latNum < COORDINATE_BOUNDS.latitude.min || latNum > COORDINATE_BOUNDS.latitude.max) {
    return { isValid: false, error: 'Latitud debe estar entre -90 y 90' }
  }
  if (lngNum < COORDINATE_BOUNDS.longitude.min || lngNum > COORDINATE_BOUNDS.longitude.max) {
    return { isValid: false, error: 'Longitud debe estar entre -180 y 180' }
  }
  return { isValid: true }
}

// ============================================================================
// Component Props
// ============================================================================

interface LocationCoordinatesPanelProps {
  locations: LocationForPlanning[]
  editingLocationId: string | null
  updatingCoordinates: boolean
  onStartEditing: (locationId: string) => void
  onCancelEditing: () => void
  onSaveCoordinates: (locationId: string, lat: number, lng: number) => Promise<void>
  placingLocationId?: string | null
  onSelectForPlacing?: (locationId: string, locationName: string) => void
  onCancelPlacing?: () => void
}

export function LocationCoordinatesPanel({
  locations,
  editingLocationId,
  updatingCoordinates,
  onStartEditing,
  onCancelEditing,
  onSaveCoordinates,
  placingLocationId,
  onSelectForPlacing,
  onCancelPlacing,
}: LocationCoordinatesPanelProps) {
  const [editLat, setEditLat] = useState('')
  const [editLng, setEditLng] = useState('')

  const locationsWithCoords = locations.filter(hasValidCoordinates)
  const locationsWithoutCoords = locations.filter((l) => !hasValidCoordinates(l))

  const handleStartEdit = (location: LocationForPlanning) => {
    setEditLat(location.latitude?.toString() ?? '')
    setEditLng(location.longitude?.toString() ?? '')
    onStartEditing(location.locationId)
  }

  const handleSave = async (locationId: string) => {
    const validation = validateCoordinates(editLat, editLng)
    if (!validation.isValid) return

    await onSaveCoordinates(locationId, parseFloat(editLat), parseFloat(editLng))
  }

  const handleCancel = () => {
    setEditLat('')
    setEditLng('')
    onCancelEditing()
  }

  return (
    <Card>
      <CardHeader className="pb-3 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Navigation className="h-4 w-4 text-primary" />
            <CardTitle className="text-base font-medium">
              Coordenadas de Localidades
            </CardTitle>
          </div>
          <Badge variant="outline" className="font-mono text-xs">
            {locationsWithCoords.length} de {locations.length} con GPS
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <ScrollArea className="h-[400px]">
          {/* Locations without coordinates first */}
          {locationsWithoutCoords.length > 0 && (
            <div className="p-3 border-b bg-warning/5">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-4 w-4 text-warning" />
                <span className="text-sm font-medium text-warning">
                  Sin coordenadas ({locationsWithoutCoords.length})
                </span>
              </div>
              <div className="space-y-2">
                {locationsWithoutCoords.map((location) => (
                  <LocationRow
                    key={location.locationId}
                    location={location}
                    isEditing={editingLocationId === location.locationId}
                    isPlacing={placingLocationId === location.locationId}
                    editLat={editLat}
                    editLng={editLng}
                    onEditLatChange={setEditLat}
                    onEditLngChange={setEditLng}
                    onStartEdit={() => handleStartEdit(location)}
                    onSave={() => handleSave(location.locationId)}
                    onCancel={handleCancel}
                    isUpdating={updatingCoordinates}
                    onSelectForPlacing={() => onSelectForPlacing?.(location.locationId, location.locationName)}
                    onCancelPlacing={onCancelPlacing}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Locations with coordinates */}
          {locationsWithCoords.length > 0 && (
            <div className="p-3">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="h-4 w-4 text-success" />
                <span className="text-sm font-medium text-muted-foreground">
                  Con coordenadas ({locationsWithCoords.length})
                </span>
              </div>
              <div className="space-y-2">
                {locationsWithCoords.map((location) => (
                  <LocationRow
                    key={location.locationId}
                    location={location}
                    isEditing={editingLocationId === location.locationId}
                    isPlacing={placingLocationId === location.locationId}
                    editLat={editLat}
                    editLng={editLng}
                    onEditLatChange={setEditLat}
                    onEditLngChange={setEditLng}
                    onStartEdit={() => handleStartEdit(location)}
                    onSave={() => handleSave(location.locationId)}
                    onCancel={handleCancel}
                    isUpdating={updatingCoordinates}
                    onSelectForPlacing={() => onSelectForPlacing?.(location.locationId, location.locationName)}
                    onCancelPlacing={onCancelPlacing}
                  />
                ))}
              </div>
            </div>
          )}

          {locations.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <MapPin className="h-8 w-8 text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">
                No hay localidades en esta ruta
              </p>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// LocationRow Sub-Components (separated by state for clarity)
// ============================================================================

interface LocationRowProps {
  location: LocationForPlanning
  isEditing: boolean
  isPlacing: boolean
  editLat: string
  editLng: string
  onEditLatChange: (value: string) => void
  onEditLngChange: (value: string) => void
  onStartEdit: () => void
  onSave: () => void
  onCancel: () => void
  isUpdating: boolean
  onSelectForPlacing?: () => void
  onCancelPlacing?: () => void
}

/** Editing state - shows coordinate input form */
function LocationRowEditing({
  location,
  editLat,
  editLng,
  onEditLatChange,
  onEditLngChange,
  onSave,
  onCancel,
  isUpdating,
}: Pick<LocationRowProps, 'location' | 'editLat' | 'editLng' | 'onEditLatChange' | 'onEditLngChange' | 'onSave' | 'onCancel' | 'isUpdating'>) {
  return (
    <div className="p-3 bg-card rounded-lg border-2 border-primary shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium text-sm">{location.locationName}</span>
        {isUpdating && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
      </div>
      <div className="grid grid-cols-2 gap-2 mb-2">
        <div>
          <label className="text-xs text-muted-foreground">Latitud</label>
          <Input
            type="number"
            step="any"
            placeholder="-90 a 90"
            value={editLat}
            onChange={(e) => onEditLatChange(e.target.value)}
            className="h-8 text-sm"
            disabled={isUpdating}
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Longitud</label>
          <Input
            type="number"
            step="any"
            placeholder="-180 a 180"
            value={editLng}
            onChange={(e) => onEditLngChange(e.target.value)}
            className="h-8 text-sm"
            disabled={isUpdating}
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={onSave}
          disabled={isUpdating || !editLat || !editLng}
          className="flex-1"
        >
          <Check className="h-3 w-3 mr-1" />
          Guardar
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel} disabled={isUpdating}>
          <X className="h-3 w-3" />
        </Button>
      </div>
    </div>
  )
}

/** Placing state - waiting for map click */
function LocationRowPlacing({
  location,
  onCancelPlacing,
}: Pick<LocationRowProps, 'location' | 'onCancelPlacing'>) {
  const hasCoords = hasValidCoordinates(location)
  return (
    <div className="p-3 rounded-lg border-2 border-primary bg-primary/5 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" />
          <div>
            <p className="text-sm font-medium">{location.locationName}</p>
            <p className="text-xs text-primary">
              {hasCoords ? 'Busca en el mapa y click para reposicionar' : 'Click en el mapa para colocar'}
            </p>
          </div>
        </div>
        <Button size="sm" variant="ghost" onClick={onCancelPlacing}>
          <X className="h-3 w-3" />
        </Button>
      </div>
    </div>
  )
}

/** Default state - shows location info with action buttons */
function LocationRowDefault({
  location,
  onStartEdit,
  onSelectForPlacing,
}: Pick<LocationRowProps, 'location' | 'onStartEdit' | 'onSelectForPlacing'>) {
  const hasCoords = hasValidCoordinates(location)
  return (
    <div
      onClick={onSelectForPlacing}
      className={cn(
        'flex items-center justify-between p-2 rounded-lg border bg-card transition-colors group cursor-pointer',
        hasCoords
          ? 'hover:bg-muted/50 hover:border-primary/30'
          : 'border-warning/30 hover:bg-primary/5 hover:border-primary/50'
      )}
    >
      <div className="flex items-center gap-2 min-w-0">
        <MapPin className={cn('h-4 w-4 shrink-0', hasCoords ? 'text-success' : 'text-warning')} />
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{location.locationName}</p>
          {hasCoords && (
            <p className="text-xs text-muted-foreground font-mono group-hover:hidden">
              {location.latitude?.toFixed(4)}, {location.longitude?.toFixed(4)}
            </p>
          )}
          <p className={cn('text-xs', hasCoords ? 'hidden group-hover:block text-primary' : 'text-warning')}>
            Click para {hasCoords ? 'buscar y reposicionar' : 'colocar en mapa'}
          </p>
        </div>
      </div>
      <Button
        size="sm"
        variant="ghost"
        onClick={(e) => {
          e.stopPropagation()
          onStartEdit()
        }}
        className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
        title="Editar coordenadas manualmente"
      >
        <Edit2 className="h-3 w-3" />
      </Button>
    </div>
  )
}

/** Main LocationRow - delegates to state-specific sub-components */
function LocationRow(props: LocationRowProps) {
  const { isEditing, isPlacing } = props

  if (isEditing) {
    return <LocationRowEditing {...props} />
  }
  if (isPlacing) {
    return <LocationRowPlacing {...props} />
  }
  return <LocationRowDefault {...props} />
}
