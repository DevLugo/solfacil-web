import { useMemo, useState, useEffect } from 'react'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Plus, X, Check, ChevronsUpDown, AlertCircle, Loader2 } from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import type {
  LeaderFormData,
  LocationFormData,
  Route,
  Location,
  Municipality,
  State,
} from '../types'
import { CreateLocationForm } from './CreateLocationForm'

interface LocationSectionProps {
  formData: LeaderFormData
  locationFormData: LocationFormData
  routes: Route[]
  locations: Location[]
  municipalities: Municipality[]
  states: State[]
  showLocationForm: boolean
  locationsLoading: boolean
  creatingLocation: boolean
  creatingMunicipality: boolean
  onFormChange: (field: keyof LeaderFormData, value: string | boolean) => void
  onLocationFormChange: (field: keyof LocationFormData, value: string) => void
  onCreateLocation: () => void
  onCreateMunicipality: (name: string, stateId: string) => Promise<{ id: string; name: string } | null>
  onToggleLocationForm: (show: boolean) => void
  onPrefillLocationName?: (name: string) => void
}

export function LocationSection({
  formData,
  locationFormData,
  routes,
  locations,
  municipalities,
  states,
  showLocationForm,
  locationsLoading,
  creatingLocation,
  creatingMunicipality,
  onFormChange,
  onLocationFormChange,
  onCreateLocation,
  onCreateMunicipality,
  onToggleLocationForm,
  onPrefillLocationName,
}: LocationSectionProps) {
  const [locationPopoverOpen, setLocationPopoverOpen] = useState(false)
  const [locationSearch, setLocationSearch] = useState('')

  const normalized = (s: string) => s.toLowerCase().trim()

  const hasExactLocationMatch = useMemo(() => {
    if (!locationSearch.trim()) return true
    return locations.some(l => normalized(l.name) === normalized(locationSearch))
  }, [locations, locationSearch])

  const selectedLocation = useMemo(
    () => locations.find(l => l.id === formData.locationId),
    [locations, formData.locationId],
  )

  // If location was chosen externally and then cleared, keep search in sync
  useEffect(() => {
    if (!formData.locationId) {
      setLocationSearch('')
    }
  }, [formData.locationId])

  const handleStartCreateLocation = () => {
    const prefill = locationSearch.trim()
    if (prefill && onPrefillLocationName) {
      onPrefillLocationName(prefill)
    }
    onToggleLocationForm(true)
    setLocationPopoverOpen(false)
  }

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
                ) : (
                  <Popover open={locationPopoverOpen} onOpenChange={setLocationPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        role="combobox"
                        aria-expanded={locationPopoverOpen}
                        className="w-full justify-between font-normal"
                      >
                        {selectedLocation ? (
                          <span className="truncate">
                            {selectedLocation.name}
                            <span className="text-muted-foreground ml-1">
                              · {selectedLocation.municipality.name}
                            </span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground">
                            {locations.length === 0
                              ? 'Escribe el nombre para crear una localidad...'
                              : 'Selecciona o crea una localidad...'}
                          </span>
                        )}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                      <Command>
                        <CommandInput
                          placeholder="Buscar localidad..."
                          value={locationSearch}
                          onValueChange={setLocationSearch}
                        />
                        <CommandList>
                          <CommandEmpty>
                            {locationSearch.trim() ? (
                              <button
                                type="button"
                                className="mx-auto my-2 flex items-center gap-2 rounded-md border border-dashed px-3 py-2 text-sm hover:bg-muted"
                                onClick={handleStartCreateLocation}
                              >
                                <Plus className="h-4 w-4" />
                                Crear localidad «{locationSearch.trim()}»
                              </button>
                            ) : (
                              <span className="py-3 block text-sm text-muted-foreground">
                                Escribe para buscar o crear una localidad
                              </span>
                            )}
                          </CommandEmpty>
                          {locations.length > 0 && (
                            <CommandGroup heading="Localidades">
                              {locations.map((location) => (
                                <CommandItem
                                  key={location.id}
                                  value={`${location.name} ${location.municipality.name} ${location.municipality.state.name}`}
                                  onSelect={() => {
                                    onFormChange('locationId', location.id)
                                    setLocationPopoverOpen(false)
                                    setLocationSearch('')
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      'mr-2 h-4 w-4',
                                      formData.locationId === location.id ? 'opacity-100' : 'opacity-0',
                                    )}
                                  />
                                  <span className="truncate">
                                    {location.name}
                                    <span className="text-muted-foreground ml-1">
                                      · {location.municipality.name}, {location.municipality.state.name}
                                    </span>
                                  </span>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          )}
                          {locationSearch.trim() && !hasExactLocationMatch && locations.length > 0 && (
                            <>
                              <CommandSeparator />
                              <CommandGroup>
                                <CommandItem
                                  value={`__create__${locationSearch}`}
                                  onSelect={handleStartCreateLocation}
                                >
                                  <Plus className="mr-2 h-4 w-4" />
                                  Crear localidad «{locationSearch.trim()}»
                                </CommandItem>
                              </CommandGroup>
                            </>
                          )}
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                )}
                {!locationsLoading && locations.length === 0 && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      No hay localidades disponibles para esta ruta. Crea una nueva localidad.
                    </AlertDescription>
                  </Alert>
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
                  states={states}
                  routeId={formData.routeId}
                  creatingLocation={creatingLocation}
                  creatingMunicipality={creatingMunicipality}
                  onChange={onLocationFormChange}
                  onSubmit={onCreateLocation}
                  onCreateMunicipality={onCreateMunicipality}
                />
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
