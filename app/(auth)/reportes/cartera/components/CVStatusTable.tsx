'use client'

import { useMemo, useState } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Search,
  UserX,
  UserCheck,
  AlertTriangle,
  Clock,
  MapPin,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ActiveClientStatus, CVStatus } from '../hooks'
import { formatCurrency } from '../utils'

interface CVStatusTableProps {
  clients: ActiveClientStatus[]
  loading?: boolean
}

type SortField = 'clientName' | 'pendingAmount' | 'daysSinceLastPayment' | 'routeName'
type SortDirection = 'asc' | 'desc'

function CVStatusBadge({ status }: { status: CVStatus }) {
  if (status === 'EN_CV') {
    return (
      <Badge className="bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-400 border-red-300 dark:border-red-800">
        <UserX className="h-3 w-3 mr-1" />
        En CV
      </Badge>
    )
  }
  if (status === 'AL_CORRIENTE') {
    return (
      <Badge className="bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-400 border-green-300 dark:border-green-800">
        <UserCheck className="h-3 w-3 mr-1" />
        Al Corriente
      </Badge>
    )
  }
  return (
    <Badge variant="secondary">
      Excluido
    </Badge>
  )
}

function DaysSinceBadge({ days }: { days: number | null }) {
  if (days === null) {
    return <span className="text-muted-foreground text-sm">Sin pagos</span>
  }

  const isWarning = days > 7
  const isDanger = days > 14

  return (
    <div className={cn(
      'flex items-center gap-1 text-sm',
      isDanger
        ? 'text-red-600 dark:text-red-400'
        : isWarning
          ? 'text-amber-600 dark:text-amber-400'
          : 'text-muted-foreground'
    )}>
      <Clock className="h-3 w-3" />
      {days} días
    </div>
  )
}

function TableSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-3">
          <Skeleton className="h-4 w-[200px]" />
          <Skeleton className="h-4 w-[100px]" />
          <Skeleton className="h-6 w-[80px]" />
          <Skeleton className="h-4 w-[80px]" />
          <Skeleton className="h-4 w-[120px]" />
        </div>
      ))}
    </div>
  )
}

export function CVStatusTable({ clients, loading }: CVStatusTableProps) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<CVStatus | 'ALL'>('ALL')
  const [routeFilter, setRouteFilter] = useState<string>('ALL')
  const [sortField, setSortField] = useState<SortField>('daysSinceLastPayment')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  // Get unique routes for filter
  const routes = useMemo(() => {
    const routeSet = new Set(clients.map((c) => c.routeName))
    return Array.from(routeSet).sort()
  }, [clients])

  // Filter and sort clients
  const filteredClients = useMemo(() => {
    let result = [...clients]

    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase()
      result = result.filter((c) =>
        c.clientName.toLowerCase().includes(searchLower)
      )
    }

    // Apply status filter
    if (statusFilter !== 'ALL') {
      result = result.filter((c) => c.cvStatus === statusFilter)
    }

    // Apply route filter
    if (routeFilter !== 'ALL') {
      result = result.filter((c) => c.routeName === routeFilter)
    }

    // Apply sorting
    result.sort((a, b) => {
      let comparison = 0
      switch (sortField) {
        case 'clientName':
          comparison = a.clientName.localeCompare(b.clientName)
          break
        case 'pendingAmount':
          comparison = a.pendingAmount - b.pendingAmount
          break
        case 'daysSinceLastPayment': {
          const daysA = a.daysSinceLastPayment ?? 999
          const daysB = b.daysSinceLastPayment ?? 999
          comparison = daysA - daysB
          break
        }
        case 'routeName':
          comparison = a.routeName.localeCompare(b.routeName)
          break
      }
      return sortDirection === 'asc' ? comparison : -comparison
    })

    return result
  }, [clients, search, statusFilter, routeFilter, sortField, sortDirection])

  // Stats
  const stats = useMemo(() => {
    const total = filteredClients.length
    const enCV = filteredClients.filter((c) => c.cvStatus === 'EN_CV').length
    const alCorriente = filteredClients.filter((c) => c.cvStatus === 'AL_CORRIENTE').length
    return { total, enCV, alCorriente }
  }, [filteredClients])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null
    return sortDirection === 'asc' ? (
      <ChevronUp className="h-4 w-4" />
    ) : (
      <ChevronDown className="h-4 w-4" />
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-lg">Detalle de Clientes</CardTitle>
            <CardDescription>
              {stats.total} clientes ({stats.enCV} en CV, {stats.alCorriente} al corriente)
            </CardDescription>
          </div>
          {stats.enCV > 0 && (
            <Badge variant="destructive" className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              {stats.enCV} en Cartera Vencida
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as CVStatus | 'ALL')}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos</SelectItem>
              <SelectItem value="EN_CV">En CV</SelectItem>
              <SelectItem value="AL_CORRIENTE">Al Corriente</SelectItem>
            </SelectContent>
          </Select>
          <Select value={routeFilter} onValueChange={setRouteFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Ruta" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todas</SelectItem>
              {routes.map((route) => (
                <SelectItem key={route} value={route}>
                  {route}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        {loading ? (
          <TableSkeleton />
        ) : filteredClients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Search className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold">No se encontraron clientes</h3>
            <p className="text-sm text-muted-foreground">
              Intenta ajustar los filtros de búsqueda
            </p>
          </div>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 font-semibold"
                      onClick={() => handleSort('clientName')}
                    >
                      Cliente
                      <SortIcon field="clientName" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 font-semibold"
                      onClick={() => handleSort('pendingAmount')}
                    >
                      Saldo
                      <SortIcon field="pendingAmount" />
                    </Button>
                  </TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 font-semibold"
                      onClick={() => handleSort('daysSinceLastPayment')}
                    >
                      Último Pago
                      <SortIcon field="daysSinceLastPayment" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 font-semibold"
                      onClick={() => handleSort('routeName')}
                    >
                      <MapPin className="h-3 w-3 mr-1" />
                      Ruta
                      <SortIcon field="routeName" />
                    </Button>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClients.map((client) => (
                  <TableRow key={client.loanId}>
                    <TableCell className="font-medium">
                      {client.clientName}
                    </TableCell>
                    <TableCell className="font-mono">
                      {formatCurrency(client.pendingAmount)}
                    </TableCell>
                    <TableCell>
                      <CVStatusBadge status={client.cvStatus} />
                    </TableCell>
                    <TableCell>
                      <DaysSinceBadge days={client.daysSinceLastPayment} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {client.routeName}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
