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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="route-select">
            Ruta <span className="text-muted-foreground text-xs">(opcional)</span>
          </Label>
          <SearchableSelect
            options={routeOptions}
            value={selectedRouteId || null}
            onValueChange={(value) => onRouteChange(value || '')}
            placeholder="Todas las rutas"
            searchPlaceholder="Buscar ruta..."
            emptyText="No se encontraron rutas"
            disabled={disabled}
            loading={routesLoading}
            className="w-full"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="location-select">
            Localidad <span className="text-muted-foreground text-xs">(opcional)</span>
          </Label>
          <SearchableSelect
            options={locationOptions}
            value={selectedLocationId || null}
            onValueChange={(value) => onLocationChange(value || '')}
            placeholder={selectedRouteId ? 'Todas las localidades de la ruta' : 'Todas las localidades'}
            searchPlaceholder="Buscar localidad..."
            emptyText="No hay localidades disponibles"
            disabled={disabled}
            loading={locationsLoading}
            className="w-full"
          />
        </div>
      </div>

      {!selectedRouteId && !selectedLocationId && (
        <p className="text-sm text-muted-foreground">
          Selecciona una ruta o localidad para ver los préstamos de la semana
        </p>
      )}
    </div>
  )
}
