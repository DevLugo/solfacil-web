import { useMemo, useRef, useState, useEffect } from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { Loader2, Plus, AlertCircle, Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { LocationFormData, Municipality, State } from '../types'
import { validateLocationFormData } from '../utils/validation'

interface CreateLocationFormProps {
  locationFormData: LocationFormData
  municipalities: Municipality[]
  states: State[]
  routeId: string
  creatingLocation: boolean
  creatingMunicipality: boolean
  onChange: (field: keyof LocationFormData, value: string) => void
  onSubmit: () => void
  onCreateMunicipality: (name: string, stateId: string) => Promise<{ id: string; name: string } | null>
  autofocus?: boolean
}

export function CreateLocationForm({
  locationFormData,
  municipalities,
  states,
  routeId,
  creatingLocation,
  creatingMunicipality,
  onChange,
  onSubmit,
  onCreateMunicipality,
  autofocus = true,
}: CreateLocationFormProps) {
  const nameInputRef = useRef<HTMLInputElement>(null)
  const [comboboxOpen, setComboboxOpen] = useState(false)
  const [search, setSearch] = useState('')

  // Mini-dialog state for creating municipality
  const [createMunicipalityDialogOpen, setCreateMunicipalityDialogOpen] = useState(false)
  const [pendingMunicipalityName, setPendingMunicipalityName] = useState('')
  const [pendingStateId, setPendingStateId] = useState('')

  useEffect(() => {
    if (autofocus) {
      nameInputRef.current?.focus()
    }
  }, [autofocus])

  // Group municipalities by state for better UX
  const municipalitiesByState = useMemo(() => {
    return municipalities.reduce((acc, municipality) => {
      const stateName = municipality.state.name
      if (!acc[stateName]) acc[stateName] = []
      acc[stateName].push(municipality)
      return acc
    }, {} as Record<string, Municipality[]>)
  }, [municipalities])

  const normalized = (s: string) => s.toLowerCase().trim()
  const hasExactMatch = useMemo(() => {
    if (!search.trim()) return true
    return municipalities.some(m => normalized(m.name) === normalized(search))
  }, [municipalities, search])

  const selectedMunicipality = useMemo(() => {
    return municipalities.find(m => m.id === locationFormData.municipalityId)
  }, [municipalities, locationFormData.municipalityId])

  // Validation
  const missingFields = validateLocationFormData(locationFormData, routeId)
  const hasErrors = missingFields.length > 0
  const isNameEmpty = !locationFormData.name?.trim()
  const isMunicipalityEmpty = !locationFormData.municipalityId
  const isFormValid = !isNameEmpty && !isMunicipalityEmpty && routeId

  const openCreateMunicipalityDialog = () => {
    setPendingMunicipalityName(search.trim())
    setPendingStateId(states[0]?.id ?? '')
    setCreateMunicipalityDialogOpen(true)
    setComboboxOpen(false)
  }

  const confirmCreateMunicipality = async () => {
    const created = await onCreateMunicipality(pendingMunicipalityName, pendingStateId)
    if (created) {
      onChange('municipalityId', created.id)
      setCreateMunicipalityDialogOpen(false)
      setPendingMunicipalityName('')
      setPendingStateId('')
      setSearch('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
      if (isFormValid && !creatingLocation) {
        e.preventDefault()
        onSubmit()
      }
    }
  }

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); if (isFormValid) onSubmit() }}
      onKeyDown={handleKeyDown}
      className="space-y-4"
    >
      <div className="space-y-2">
        <Label htmlFor="locationName">
          Nombre de la Localidad <span className="text-destructive">*</span>
        </Label>
        <Input
          ref={nameInputRef}
          id="locationName"
          type="text"
          placeholder="Ej: Santa María del Oro"
          value={locationFormData.name}
          onChange={(e) => onChange('name', e.target.value)}
          disabled={creatingLocation}
          required
          className={isNameEmpty ? 'border-destructive' : ''}
        />
        {isNameEmpty && (
          <p className="text-xs text-destructive font-medium">⚠ Este campo es requerido</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="municipalityId">
          Municipio <span className="text-destructive">*</span>
        </Label>
        <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              role="combobox"
              aria-expanded={comboboxOpen}
              className={cn(
                'w-full justify-between font-normal',
                isMunicipalityEmpty && 'border-destructive',
              )}
              disabled={creatingLocation}
            >
              {selectedMunicipality ? (
                <span className="truncate">
                  {selectedMunicipality.name}
                  <span className="text-muted-foreground ml-1">
                    · {selectedMunicipality.state.name}
                  </span>
                </span>
              ) : (
                <span className="text-muted-foreground">Selecciona o crea un municipio...</span>
              )}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
            <Command>
              <CommandInput
                placeholder="Buscar municipio..."
                value={search}
                onValueChange={setSearch}
              />
              <CommandList>
                <CommandEmpty>
                  {search.trim() ? (
                    <button
                      type="button"
                      className="mx-auto my-2 flex items-center gap-2 rounded-md border border-dashed px-3 py-2 text-sm hover:bg-muted"
                      onClick={openCreateMunicipalityDialog}
                    >
                      <Plus className="h-4 w-4" />
                      Crear municipio «{search.trim()}»
                    </button>
                  ) : (
                    <span className="py-3 block text-sm text-muted-foreground">
                      Escribe para buscar o crear un municipio
                    </span>
                  )}
                </CommandEmpty>
                {Object.entries(municipalitiesByState).map(([stateName, items]) => (
                  <CommandGroup key={stateName} heading={stateName}>
                    {items.map((municipality) => (
                      <CommandItem
                        key={municipality.id}
                        value={`${municipality.name} ${municipality.state.name}`}
                        onSelect={() => {
                          onChange('municipalityId', municipality.id)
                          setComboboxOpen(false)
                          setSearch('')
                        }}
                      >
                        <Check
                          className={cn(
                            'mr-2 h-4 w-4',
                            locationFormData.municipalityId === municipality.id
                              ? 'opacity-100'
                              : 'opacity-0',
                          )}
                        />
                        {municipality.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                ))}
                {search.trim() && !hasExactMatch && (
                  <>
                    <CommandSeparator />
                    <CommandGroup>
                      <CommandItem
                        value={`__create__${search}`}
                        onSelect={openCreateMunicipalityDialog}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Crear municipio «{search.trim()}»
                      </CommandItem>
                    </CommandGroup>
                  </>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        {isMunicipalityEmpty && (
          <p className="text-xs text-destructive font-medium">⚠ Este campo es requerido</p>
        )}
      </div>

      {hasErrors && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <p className="font-semibold mb-1">Completa los siguientes campos obligatorios:</p>
            <ul className="list-disc list-inside space-y-0.5">
              {missingFields.map((field) => (
                <li key={field}>{field}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <Button
        type="submit"
        disabled={!isFormValid || creatingLocation}
        className="w-full"
      >
        {creatingLocation ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Creando Localidad...
          </>
        ) : (
          <>
            <Plus className="h-4 w-4 mr-2" />
            Crear Localidad
          </>
        )}
      </Button>

      <Dialog open={createMunicipalityDialogOpen} onOpenChange={setCreateMunicipalityDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear municipio</DialogTitle>
            <DialogDescription>
              Selecciona el estado al que pertenece «{pendingMunicipalityName}».
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="newMunicipalityName">Nombre del municipio</Label>
              <Input
                id="newMunicipalityName"
                value={pendingMunicipalityName}
                onChange={(e) => setPendingMunicipalityName(e.target.value)}
                disabled={creatingMunicipality}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stateId">Estado</Label>
              <Select
                value={pendingStateId}
                onValueChange={setPendingStateId}
                disabled={creatingMunicipality}
              >
                <SelectTrigger id="stateId">
                  <SelectValue placeholder="Selecciona un estado..." />
                </SelectTrigger>
                <SelectContent>
                  {states.map((state) => (
                    <SelectItem key={state.id} value={state.id}>
                      {state.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setCreateMunicipalityDialogOpen(false)}
              disabled={creatingMunicipality}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={confirmCreateMunicipality}
              disabled={
                !pendingMunicipalityName.trim() ||
                !pendingStateId ||
                creatingMunicipality
              }
            >
              {creatingMunicipality ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creando...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Crear
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  )
}
