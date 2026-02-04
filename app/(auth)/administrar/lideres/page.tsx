'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@apollo/client'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Users, Phone, MapPin, Route, AlertCircle, UserPlus, Pencil } from 'lucide-react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
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
import { GET_LEADERS, GET_ROUTES } from '@/graphql/queries/leader'
import { EditLeaderDialog } from './components/edit-leader-dialog'

interface LeaderListItem {
  id: string
  fullName: string
  birthDate: string | null
  phone: string | null
  locationName: string | null
  routeId: string | null
  routeName: string | null
  createdAt: string
}

interface RouteItem {
  id: string
  name: string
}

function parseUTCDate(dateStr: string | null): Date | null {
  if (!dateStr) return null
  const date = new Date(dateStr)
  return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
}

function formatBirthday(birthDate: string | null): string {
  const date = parseUTCDate(birthDate)
  if (!date) return '-'
  return format(date, "d 'de' MMMM", { locale: es })
}

export default function LideresPage() {
  const [selectedRouteId, setSelectedRouteId] = useState<string>('all')
  const [editingLeader, setEditingLeader] = useState<LeaderListItem | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)

  const { data: routesData, loading: routesLoading } = useQuery<{ routes: RouteItem[] }>(GET_ROUTES)
  const routes = routesData?.routes || []

  const { data, loading, error, refetch } = useQuery<{ leaders: LeaderListItem[] }>(GET_LEADERS, {
    variables: {
      routeId: selectedRouteId === 'all' ? null : selectedRouteId,
    },
    fetchPolicy: 'cache-and-network',
  })

  const leaders = data?.leaders || []

  const missingDataCount = useMemo(() => {
    return leaders.filter(
      (l) => !l.birthDate || !l.phone || !l.routeName
    ).length
  }, [leaders])

  const handleEdit = (leader: LeaderListItem) => {
    setEditingLeader(leader)
    setEditDialogOpen(true)
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-5xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Lideres</h1>
              <p className="text-muted-foreground text-sm">
                Listado de lideres con sus datos y rutas asignadas
              </p>
            </div>
          </div>
          <Button asChild>
            <Link href="/administrar/lideres/nuevo">
              <UserPlus className="h-4 w-4 mr-2" />
              Nuevo Lider
            </Link>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
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
                  {leaders.length} lider{leaders.length !== 1 ? 'es' : ''}
                </Badge>
              )}
            </div>
            {!loading && missingDataCount > 0 && (
              <Badge variant="destructive" className="text-xs gap-1">
                <AlertCircle className="h-3 w-3" />
                {missingDataCount} con datos faltantes
              </Badge>
            )}
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
              <Users className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p>No hay lideres registrados</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Cumpleanos</TableHead>
                  <TableHead>Telefono</TableHead>
                  <TableHead>Localidad</TableHead>
                  {selectedRouteId === 'all' && <TableHead>Ruta</TableHead>}
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaders.map((leader, index) => {
                  const hasMissingData = !leader.birthDate || !leader.phone || !leader.routeName

                  return (
                    <TableRow
                      key={leader.id}
                      className={cn(hasMissingData && 'bg-destructive/5')}
                    >
                      <TableCell className="font-medium text-muted-foreground">
                        {index + 1}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{leader.fullName}</span>
                          {hasMissingData && (
                            <AlertCircle className="h-3.5 w-3.5 text-destructive" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className={cn(!leader.birthDate && 'text-destructive')}>
                        {leader.birthDate ? formatBirthday(leader.birthDate) : 'Sin fecha'}
                      </TableCell>
                      <TableCell className={cn(!leader.phone && 'text-destructive')}>
                        {leader.phone ? (
                          <span className="flex items-center gap-1 text-sm">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            {leader.phone}
                          </span>
                        ) : (
                          'Sin telefono'
                        )}
                      </TableCell>
                      <TableCell>
                        {leader.locationName ? (
                          <span className="flex items-center gap-1 text-sm">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            {leader.locationName}
                          </span>
                        ) : (
                          <span className="text-destructive">Sin localidad</span>
                        )}
                      </TableCell>
                      {selectedRouteId === 'all' && (
                        <TableCell className={cn(!leader.routeName && 'text-destructive')}>
                          {leader.routeName || 'Sin ruta'}
                        </TableCell>
                      )}
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleEdit(leader)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <EditLeaderDialog
        leader={editingLeader}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSuccess={() => refetch()}
      />
    </div>
  )
}
