'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
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
import { Label } from '@/components/ui/label'
import { CalendarIcon, Search, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'

interface Route {
  id: string
  name: string
}

interface CleanupFilterFormProps {
  routes?: Route[]
  onPreview: (maxSignDate: Date, routeId?: string) => void
  isLoading?: boolean
}

export function CleanupFilterForm({
  routes = [],
  onPreview,
  isLoading = false,
}: CleanupFilterFormProps) {
  const [maxSignDate, setMaxSignDate] = useState<Date | undefined>()
  const [selectedRouteId, setSelectedRouteId] = useState<string>('all')

  const handlePreview = () => {
    if (!maxSignDate) return
    onPreview(maxSignDate, selectedRouteId === 'all' ? undefined : selectedRouteId)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Filtros de Limpieza</CardTitle>
        <CardDescription>
          Selecciona la fecha limite. Todos los prestamos firmados hasta esa fecha seran incluidos en la limpieza.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Fecha Limite de Firma</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !maxSignDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {maxSignDate
                    ? format(maxSignDate, 'PPP', { locale: es })
                    : 'Seleccionar fecha'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={maxSignDate}
                  onSelect={setMaxSignDate}
                  initialFocus
                  locale={es}
                  disabled={(date) => date > new Date()}
                  captionLayout="dropdown"
                  fromYear={2015}
                  toYear={new Date().getFullYear()}
                />
              </PopoverContent>
            </Popover>
            <p className="text-xs text-muted-foreground">
              Prestamos con fecha de firma igual o anterior seran incluidos
            </p>
          </div>

          <div className="space-y-2">
            <Label>Ruta (opcional)</Label>
            <Select value={selectedRouteId} onValueChange={setSelectedRouteId}>
              <SelectTrigger>
                <SelectValue placeholder="Todas las rutas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las rutas</SelectItem>
                {routes.map((route) => (
                  <SelectItem key={route.id} value={route.id}>
                    {route.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Filtrar por ruta especifica (opcional)
            </p>
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            onClick={handlePreview}
            disabled={!maxSignDate || isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Cargando...
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                Ver Preview
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
