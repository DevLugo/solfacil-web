'use client'

import { useState } from 'react'
import { useMutation } from '@apollo/client'
import { useToast } from '@/hooks/use-toast'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CalendarIcon, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { BATCH_UPSERT_HISTORICAL_ASSIGNMENT } from '@/graphql/mutations/locationHistory'

interface Location {
  id: string
  name: string
}

interface BatchAddHistoryModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  locations: Location[]
  routes: Array<{ routeId: string; routeName: string }>
  onSuccess?: () => void
}

export function BatchAddHistoryModal({
  open,
  onOpenChange,
  locations,
  routes,
  onSuccess,
}: BatchAddHistoryModalProps) {
  const { toast } = useToast()
  const [routeId, setRouteId] = useState<string>('')
  const [startDate, setStartDate] = useState<Date>()
  const [endDate, setEndDate] = useState<Date>()
  const [startDateOpen, setStartDateOpen] = useState(false)
  const [endDateOpen, setEndDateOpen] = useState(false)

  const [batchUpsert, { loading }] = useMutation(BATCH_UPSERT_HISTORICAL_ASSIGNMENT, {
    refetchQueries: ['GetRoutesWithStats', 'GetLocationRouteHistory'],
    onCompleted: (data) => {
      const result = data.batchUpsertHistoricalAssignment
      toast({
        title: 'Historial agregado',
        description: `${result.recordsCreated} registros creados, ${result.recordsAdjusted} ajustados, ${result.recordsDeleted} eliminados.`,
      })
      handleClose()
      onSuccess?.()
    },
    onError: (error) => {
      toast({
        title: 'Error al guardar',
        description: error.message || 'No se pudo guardar el registro histórico.',
        variant: 'destructive',
      })
    },
  })

  const handleClose = () => {
    setRouteId('')
    setStartDate(undefined)
    setEndDate(undefined)
    setStartDateOpen(false)
    setEndDateOpen(false)
    onOpenChange(false)
  }

  const handleSave = async () => {
    if (!routeId || !startDate) {
      toast({
        title: 'Campos requeridos',
        description: 'Debes seleccionar una ruta y una fecha de inicio.',
        variant: 'destructive',
      })
      return
    }

    if (!endDate) {
      toast({
        title: 'Fecha fin requerida',
        description: 'Debes seleccionar una fecha fin para registros históricos.',
        variant: 'destructive',
      })
      return
    }

    if (endDate < startDate) {
      toast({
        title: 'Fechas inválidas',
        description: 'La fecha fin debe ser posterior o igual a la fecha inicio.',
        variant: 'destructive',
      })
      return
    }

    await batchUpsert({
      variables: {
        input: {
          locationIds: locations.map((l) => l.id),
          routeId,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
      },
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Agregar Historial en Batch</DialogTitle>
          <DialogDescription>
            Asigna {locations.length} localidades a una ruta con un rango de fechas específico.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Selected Locations Summary */}
          <div className="bg-muted/50 rounded-lg p-3">
            <Label className="text-sm font-medium">Localidades seleccionadas ({locations.length})</Label>
            <div className="mt-2 max-h-24 overflow-y-auto text-sm text-muted-foreground">
              {locations.slice(0, 5).map((loc) => (
                <div key={loc.id}>{loc.name}</div>
              ))}
              {locations.length > 5 && (
                <div className="text-xs mt-1">...y {locations.length - 5} más</div>
              )}
            </div>
          </div>

          {/* Route Selector */}
          <div className="space-y-2">
            <Label htmlFor="route">Ruta *</Label>
            <Select value={routeId} onValueChange={setRouteId}>
              <SelectTrigger id="route">
                <SelectValue placeholder="Selecciona una ruta" />
              </SelectTrigger>
              <SelectContent>
                {routes.map((route) => (
                  <SelectItem key={route.routeId} value={route.routeId}>
                    {route.routeName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Start Date Picker */}
          <div className="space-y-2">
            <Label>Fecha Inicio *</Label>
            <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !startDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, 'PPP', { locale: es }) : 'Selecciona fecha'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={(date) => {
                    setStartDate(date)
                    setStartDateOpen(false)
                  }}
                  initialFocus
                  locale={es}
                  captionLayout="dropdown"
                  fromYear={2015}
                  toYear={new Date().getFullYear() + 1}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* End Date Picker */}
          <div className="space-y-2">
            <Label>Fecha Fin *</Label>
            <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !endDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? format(endDate, 'PPP', { locale: es }) : 'Selecciona fecha'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={(date) => {
                    setEndDate(date)
                    setEndDateOpen(false)
                  }}
                  initialFocus
                  locale={es}
                  captionLayout="dropdown"
                  fromYear={2015}
                  toYear={new Date().getFullYear() + 1}
                  disabled={(date) => startDate ? date < startDate : false}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Info Box */}
          <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
            <p className="font-medium mb-1">¿Cómo funciona?</p>
            <p>
              Se creará un registro histórico para cada localidad seleccionada.
              Los registros existentes que se solapen se ajustan automáticamente.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading || locations.length === 0}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando {locations.length} registros...
              </>
            ) : (
              `Guardar ${locations.length} registros`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
