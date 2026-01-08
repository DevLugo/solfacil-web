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
import { ADD_LOCATION_ROUTE_HISTORY } from '@/graphql/mutations/locationHistory'
import { GET_LOCATION_ROUTE_HISTORY } from '@/graphql/queries/locationHistory'

interface AddHistoryModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  locationId: string
  locationName: string
  routes: Array<{ routeId: string; routeName: string }>
}

export function AddHistoryModal({
  open,
  onOpenChange,
  locationId,
  locationName,
  routes,
}: AddHistoryModalProps) {
  const { toast } = useToast()
  const [routeId, setRouteId] = useState<string>('')
  const [startDate, setStartDate] = useState<Date>()
  const [endDate, setEndDate] = useState<Date>()
  const [startDateOpen, setStartDateOpen] = useState(false)
  const [endDateOpen, setEndDateOpen] = useState(false)

  const [addHistory, { loading }] = useMutation(ADD_LOCATION_ROUTE_HISTORY, {
    refetchQueries: [
      {
        query: GET_LOCATION_ROUTE_HISTORY,
        variables: { locationId },
      },
    ],
    onCompleted: () => {
      toast({
        title: 'Historial agregado',
        description: 'El registro histórico se ha guardado correctamente.',
      })
      handleClose()
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

    await addHistory({
      variables: {
        input: {
          locationId,
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
          <DialogTitle>Agregar Registro Histórico</DialogTitle>
          <DialogDescription>
            Asigna {locationName} a una ruta con un rango de fechas específico.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
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
              Los registros existentes que se solapen con el nuevo se ajustan automáticamente.
              Si un registro queda completamente dentro del nuevo período, será eliminado.
            </p>
            <p className="mt-2 text-xs">
              <strong>Ejemplo:</strong> Si existe RUTA_1B del 2020 al 2025 y agregas
              RUTA_X del 2020 al 2024, RUTA_1B se ajustará para empezar en 2024.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              'Guardar'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
