'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@apollo/client'
import { format, differenceInYears } from 'date-fns'
import { es } from 'date-fns/locale'
import { Cake, FileDown, Phone, MapPin, Route } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { getApiBaseUrl } from '@/lib/constants/api'
import { GET_LEADER_BIRTHDAYS, GET_ROUTES } from '@/graphql/queries/leader'

interface LeaderBirthday {
  id: string
  fullName: string
  birthDate: string | null
  phone: string | null
  locationName: string
  routeId: string
  routeName: string
  daysUntilBirthday: number
}

interface Route {
  id: string
  name: string
}

// Helper to parse UTC date avoiding timezone issues
function parseUTCDate(dateStr: string | null): Date | null {
  if (!dateStr) return null
  const date = new Date(dateStr)
  return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
}

function getAge(birthDate: string | null): number | null {
  const date = parseUTCDate(birthDate)
  if (!date) return null
  return differenceInYears(new Date(), date)
}

function formatBirthday(birthDate: string | null): string {
  const date = parseUTCDate(birthDate)
  if (!date) return 'Sin fecha'
  return format(date, "d 'de' MMMM", { locale: es })
}

export default function CumpleanosLideresPage() {
  const [selectedRouteId, setSelectedRouteId] = useState<string>('all')

  const { data: routesData, loading: routesLoading } = useQuery<{ routes: Route[] }>(GET_ROUTES)
  const routes = routesData?.routes || []

  const { data, loading, error } = useQuery<{ leaderBirthdays: LeaderBirthday[] }>(
    GET_LEADER_BIRTHDAYS,
    {
      variables: {
        routeId: selectedRouteId === 'all' ? null : selectedRouteId,
      },
      fetchPolicy: 'cache-and-network',
    }
  )

  const leaders = data?.leaderBirthdays || []

  const selectedRouteName = useMemo(() => {
    if (selectedRouteId === 'all') return 'Todas las rutas'
    return routes.find((r) => r.id === selectedRouteId)?.name || ''
  }, [selectedRouteId, routes])

  const handleExportPDF = () => {
    const params = new URLSearchParams()
    if (selectedRouteId !== 'all') {
      params.append('routeId', selectedRouteId)
      params.append('routeName', selectedRouteName)
    }

    const url = `${getApiBaseUrl()}/api/export-leader-birthdays-pdf?${params.toString()}`
    window.open(url, '_blank')
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Cake className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Cumpleaños de Líderes</h1>
            <p className="text-muted-foreground text-sm">
              Lista de cumpleaños ordenada por proximidad
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Route className="h-4 w-4 text-muted-foreground" />
              <Select
                value={selectedRouteId}
                onValueChange={setSelectedRouteId}
                disabled={routesLoading}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Seleccionar ruta" />
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
              {!loading && (
                <Badge variant="secondary" className="text-xs">
                  {leaders.length} líder{leaders.length !== 1 ? 'es' : ''}
                </Badge>
              )}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExportPDF}
              disabled={loading || leaders.length === 0}
              className="gap-2"
            >
              <FileDown className="h-4 w-4" />
              Exportar PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="p-8 text-center text-destructive">
              Error al cargar los datos: {error.message}
            </div>
          ) : leaders.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Cake className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p>No hay líderes registrados</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Cumpleaños</TableHead>
                  <TableHead className="text-center">Edad</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>Localidad</TableHead>
                  {selectedRouteId === 'all' && <TableHead>Ruta</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaders.map((leader, index) => {
                  const { daysUntilBirthday } = leader
                  const age = getAge(leader.birthDate)
                  const isToday = daysUntilBirthday === 0
                  const isUpcoming = daysUntilBirthday > 0 && daysUntilBirthday <= 7
                  const noBirthday = !leader.birthDate

                  return (
                    <TableRow
                      key={leader.id}
                      className={cn(
                        isToday && 'bg-success/10',
                        isUpcoming && 'bg-warning/5'
                      )}
                    >
                      <TableCell className="font-medium text-muted-foreground">
                        {index + 1}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{leader.fullName}</span>
                          {isToday && (
                            <Badge className="bg-success text-success-foreground text-[10px] px-1.5">
                              Hoy
                            </Badge>
                          )}
                          {isUpcoming && !isToday && (
                            <Badge variant="outline" className="text-[10px] px-1.5 border-warning text-warning">
                              En {daysUntilBirthday} día{daysUntilBirthday !== 1 ? 's' : ''}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className={cn(noBirthday && 'text-muted-foreground')}>
                        {formatBirthday(leader.birthDate)}
                      </TableCell>
                      <TableCell className="text-center">
                        {age !== null ? (
                          <span>{age}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {leader.phone ? (
                          <span className="flex items-center gap-1 text-sm">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            {leader.phone}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1 text-sm">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          {leader.locationName}
                        </span>
                      </TableCell>
                      {selectedRouteId === 'all' && (
                        <TableCell className="text-sm text-muted-foreground">
                          {leader.routeName}
                        </TableCell>
                      )}
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
