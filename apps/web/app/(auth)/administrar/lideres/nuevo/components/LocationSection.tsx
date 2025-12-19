import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Plus, X } from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, Loader2 } from 'lucide-react'
import type { LeaderFormData, LocationFormData, Route, Location, Municipality } from '../types'
import { CreateLocationForm } from './CreateLocationForm'

interface LocationSectionProps {
  formData: LeaderFormData
  locationFormData: LocationFormData
  routes: Route[]
  locations: Location[]
  municipalities: Municipality[]
  showLocationForm: boolean
  locationsLoading: boolean
  creatingLocation: boolean
  onFormChange: (field: keyof LeaderFormData, value: string | boolean) => void
  onLocationFormChange: (field: keyof LocationFormData, value: string) => void
  onCreateLocation: () => void
  onToggleLocationForm: (show: boolean) => void
}

export function LocationSection({
  formData,
  locationFormData,
  routes,
  locations,
  municipalities,
  showLocationForm,
  locationsLoading,
  creatingLocation,
  onFormChange,
  onLocationFormChange,
  onCreateLocation,
  onToggleLocationForm,
}: LocationSectionProps) {
  return (
    <div className="space-y-4">
      {/* Route Selection */}
      <div className="space-y-2">
        <Label htmlFor="routeId">
          Ruta <span className="text-destructive">*</span>
        </Label>
        <Select
          value={formData.routeId}
          onValueChange={(value) => onFormChange('routeId', value)}
        >
          <SelectTrigger id="routeId">
            <SelectValue placeholder="Selecciona una ruta..." />
          </SelectTrigger>
          <SelectContent>
            {routes.map((route) => (
              <SelectItem key={route.id} value={route.id}>
                {route.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Location Selection */}
      {formData.routeId && (
        <>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="locationId">
                Localidad <span className="text-destructive">*</span>
              </Label>
              {!showLocationForm && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onToggleLocationForm(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nueva Localidad
                </Button>
              )}
            </div>

            {!showLocationForm && (
              <>
                {locationsLoading ? (
                  <div className="flex items-center justify-center h-10 border rounded-md">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                ) : locations.length === 0 ? (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      No hay localidades disponibles para esta ruta. Crea una nueva localidad.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Select
                    value={formData.locationId}
                    onValueChange={(value) => onFormChange('locationId', value)}
                  >
                    <SelectTrigger id="locationId">
                      <SelectValue placeholder="Selecciona una localidad..." />
                    </SelectTrigger>
                    <SelectContent>
                      {locations.map((location) => (
                        <SelectItem key={location.id} value={location.id}>
                          {location.name} - {location.municipality.name}, {location.municipality.state.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </>
            )}
          </div>

          {/* Create Location Form */}
          {showLocationForm && (
            <>
              <Separator />
              <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold">Crear Nueva Localidad</h4>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onToggleLocationForm(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {!formData.routeId && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Debes seleccionar una ruta primero antes de crear una localidad
                    </AlertDescription>
                  </Alert>
                )}

                <CreateLocationForm
                  locationFormData={locationFormData}
                  municipalities={municipalities}
                  routeId={formData.routeId}
                  creatingLocation={creatingLocation}
                  onChange={onLocationFormChange}
                  onSubmit={onCreateLocation}
                />
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
