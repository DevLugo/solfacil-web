import { useQuery } from '@apollo/client'
import { Label } from '@/components/ui/label'
import { SearchableSelect } from '@/components/ui/searchable-select'
import type { SearchableSelectOption } from '@/components/ui/searchable-select'
import { GET_ROUTES } from '@/graphql/queries/leader'

interface LocationFilterProps {
  selectedRouteId: string
  selectedLocationId: string
  locations: Array<{ id: string; name: string }>
  onRouteChange: (routeId: string) => void
  onLocationChange: (locationId: string) => void
  locationsLoading?: boolean
  disabled?: boolean
}

/**
 * Component for filtering loans by route and location
 * Route selection triggers location fetch
 */
export function LocationFilter({
  selectedRouteId,
  selectedLocationId,
  locations,
  onRouteChange,
  onLocationChange,
  locationsLoading,
  disabled,
}: LocationFilterProps) {
  const { data: routesData, loading: routesLoading } = useQuery(GET_ROUTES)
  const routes = routesData?.routes || []

  const routeOptions: SearchableSelectOption[] = routes.map((route: { id: string; name: string }) => ({
    value: route.id,
    label: route.name,
  }))

  const locationOptions: SearchableSelectOption[] = locations.map((location) => ({
    value: location.id,
    label: location.name,
  }))

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="route-select">
          Ruta <span className="text-destructive">*</span>
        </Label>
        <SearchableSelect
          options={routeOptions}
          value={selectedRouteId || null}
          onValueChange={(value) => onRouteChange(value || '')}
          placeholder="Selecciona una ruta..."
          searchPlaceholder="Buscar ruta..."
          emptyText="No se encontraron rutas"
          disabled={disabled}
          loading={routesLoading}
          className="w-full"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="location-select">
          Localidad <span className="text-destructive">*</span>
        </Label>
        <SearchableSelect
          options={locationOptions}
          value={selectedLocationId || null}
          onValueChange={(value) => onLocationChange(value || '')}
          placeholder={selectedRouteId ? 'Selecciona una localidad...' : 'Primero selecciona una ruta'}
          searchPlaceholder="Buscar localidad..."
          emptyText={selectedRouteId ? 'No hay localidades disponibles' : 'Primero selecciona una ruta'}
          disabled={disabled || !selectedRouteId}
          loading={locationsLoading}
          className="w-full"
        />
      </div>

      {!selectedRouteId && (
        <p className="text-sm text-muted-foreground">
          Selecciona una ruta para ver las localidades disponibles
        </p>
      )}

      {selectedRouteId && !selectedLocationId && locations.length > 0 && (
        <p className="text-sm text-muted-foreground">
          Selecciona una localidad para ver los préstamos de la semana
        </p>
      )}
    </div>
  )
}
