import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Plus, AlertCircle } from 'lucide-react'
import type { LocationFormData, Municipality } from '../types'
import { validateLocationFormData } from '../utils/validation'

interface CreateLocationFormProps {
  locationFormData: LocationFormData
  municipalities: Municipality[]
  routeId: string
  creatingLocation: boolean
  onChange: (field: keyof LocationFormData, value: string) => void
  onSubmit: () => void
}

export function CreateLocationForm({
  locationFormData,
  municipalities,
  routeId,
  creatingLocation,
  onChange,
  onSubmit,
}: CreateLocationFormProps) {
  // Group municipalities by state for better UX
  const municipalitiesByState = municipalities.reduce((acc, municipality) => {
    const stateName = municipality.state.name
    if (!acc[stateName]) {
      acc[stateName] = []
    }
    acc[stateName].push(municipality)
    return acc
  }, {} as Record<string, Municipality[]>)

  // Validation
  const missingFields = validateLocationFormData(locationFormData, routeId)
  const hasErrors = missingFields.length > 0
  const isNameEmpty = !locationFormData.name?.trim()
  const isMunicipalityEmpty = !locationFormData.municipalityId
  const isFormValid = !isNameEmpty && !isMunicipalityEmpty && routeId

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="locationName">
          Nombre de la Localidad <span className="text-destructive">*</span>
        </Label>
        <Input
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
        <Select
          value={locationFormData.municipalityId}
          onValueChange={(value) => onChange('municipalityId', value)}
          disabled={creatingLocation}
        >
          <SelectTrigger
            id="municipalityId"
            className={isMunicipalityEmpty ? 'border-destructive' : ''}
          >
            <SelectValue placeholder="Selecciona un municipio..." />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(municipalitiesByState).map(([stateName, municipalities]) => (
              <div key={stateName}>
                <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
                  {stateName}
                </div>
                {municipalities.map((municipality) => (
                  <SelectItem key={municipality.id} value={municipality.id}>
                    {municipality.name}
                  </SelectItem>
                ))}
              </div>
            ))}
          </SelectContent>
        </Select>
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
        type="button"
        onClick={onSubmit}
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
    </div>
  )
}
