'use client'

import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import {
  MapPin,
  Users,
  UserPlus,
  RefreshCw,
  UserMinus,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import type {
  LocalityBreakdownDetail,
  LocalityClientDetail,
  ClientCategory,
} from '../hooks'
import { useLocalityClients } from '../hooks'
import { formatCurrency, formatDateWithYear } from '../utils'

interface LocalityDetailModalProps {
  locality: LocalityBreakdownDetail | null
  year: number
  month: number
  weekNumber?: number
  onClose: () => void
}

const CATEGORY_CONFIG: Record<
  ClientCategory,
  { label: string; icon: typeof Users; color: string; bgColor: string }
> = {
  NUEVO: {
    label: 'Nuevos',
    icon: UserPlus,
    color: 'text-green-700 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-950/30',
  },
  RENOVADO: {
    label: 'Renovados',
    icon: RefreshCw,
    color: 'text-blue-700 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-950/30',
  },
  REINTEGRO: {
    label: 'Reintegros',
    icon: RefreshCw,
    color: 'text-purple-700 dark:text-purple-400',
    bgColor: 'bg-purple-100 dark:bg-purple-950/30',
  },
  ACTIVO: {
    label: 'Activos',
    icon: Users,
    color: 'text-gray-700 dark:text-gray-400',
    bgColor: 'bg-gray-100 dark:bg-gray-950/30',
  },
  FINALIZADO: {
    label: 'Finalizados',
    icon: UserMinus,
    color: 'text-gray-700 dark:text-gray-400',
    bgColor: 'bg-gray-100 dark:bg-gray-950/30',
  },
  EN_CV: {
    label: 'En CV',
    icon: AlertCircle,
    color: 'text-red-700 dark:text-red-400',
    bgColor: 'bg-red-100 dark:bg-red-950/30',
  },
}

function ClientRow({ client }: { client: LocalityClientDetail }) {
  const categoryConfig = CATEGORY_CONFIG[client.category]
  const CategoryIcon = categoryConfig.icon

  return (
    <TableRow>
      <TableCell>
        <div>
          <p className="font-medium">{client.clientName}</p>
          <p className="text-xs text-muted-foreground">{client.clientCode}</p>
        </div>
      </TableCell>
      <TableCell className="text-right">{formatCurrency(client.amountGived)}</TableCell>
      <TableCell className="text-right">{formatCurrency(client.pendingAmount)}</TableCell>
      <TableCell>
        <Badge
          variant="outline"
          className={cn(
            categoryConfig.bgColor,
            categoryConfig.color,
            'border-0'
          )}
        >
          <CategoryIcon className="h-3 w-3 mr-1" />
          {categoryConfig.label}
        </Badge>
      </TableCell>
      <TableCell>
        <Badge
          variant={client.cvStatus === 'EN_CV' ? 'destructive' : 'secondary'}
          className={cn(
            client.cvStatus === 'AL_CORRIENTE' &&
              'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400'
          )}
        >
          {client.cvStatus === 'EN_CV' ? 'En CV' : 'Al Corriente'}
        </Badge>
      </TableCell>
      <TableCell className="text-center">
        {client.daysSinceLastPayment !== null ? (
          <span
            className={cn(
              'font-medium',
              client.daysSinceLastPayment > 14
                ? 'text-red-600'
                : client.daysSinceLastPayment > 7
                  ? 'text-yellow-600'
                  : 'text-green-600'
            )}
          >
            {client.daysSinceLastPayment}d
          </span>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">{client.loanType}</TableCell>
    </TableRow>
  )
}

function TableSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  )
}

export function LocalityDetailModal({
  locality,
  year,
  month,
  weekNumber,
  onClose,
}: LocalityDetailModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<ClientCategory | 'ALL'>('ALL')
  const { clients, stats, loading, getClients } = useLocalityClients()

  // Fetch clients and reset filter when locality or weekNumber changes
  useEffect(() => {
    if (locality) {
      setSelectedCategory('ALL') // Reset filter when locality changes
      getClients({
        localityId: locality.localityId,
        year,
        month,
        weekNumber, // Pass the specific week number if provided
      })
    }
  }, [locality, year, month, weekNumber, getClients])

  // Filter clients by category
  const filteredClients =
    selectedCategory === 'ALL'
      ? clients
      : clients.filter((c) => c.category === selectedCategory)

  return (
    <Dialog open={!!locality} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            {locality?.localityName}
          </DialogTitle>
          <DialogDescription>
            {locality?.routeName && locality.routeName !== locality.localityName && (
              <span>Ruta: {locality.routeName} &bull; </span>
            )}
            {stats.total} clientes en el período
          </DialogDescription>
        </DialogHeader>

        {/* Category Filters */}
        <div className="flex flex-wrap gap-2 py-2">
          <Button
            variant={selectedCategory === 'ALL' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory('ALL')}
          >
            <Users className="h-4 w-4 mr-1" />
            Todos ({stats.total})
          </Button>
          {(Object.keys(CATEGORY_CONFIG) as ClientCategory[]).map((category) => {
            const config = CATEGORY_CONFIG[category]
            const count = stats.byCategory[category]
            if (count === 0) return null
            const Icon = config.icon
            return (
              <Button
                key={category}
                variant={selectedCategory === category ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(category)}
                className={cn(
                  selectedCategory !== category && config.color
                )}
              >
                <Icon className="h-4 w-4 mr-1" />
                {config.label} ({count})
              </Button>
            )
          })}
        </div>

        {/* Clients Table */}
        <div className="flex-1 overflow-auto min-h-0">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold">Sin clientes</h3>
              <p className="text-sm text-muted-foreground">
                No hay clientes en esta categoría
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead className="text-right">Pendiente</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-center">Días s/pago</TableHead>
                  <TableHead>Tipo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClients.map((client) => (
                  <ClientRow key={client.loanId} client={client} />
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Summary Footer */}
        {!loading && filteredClients.length > 0 && (
          <div className="border-t pt-3 flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Mostrando {filteredClients.length} de {stats.total} clientes
            </span>
            <div className="flex items-center gap-4">
              <span>
                Total Pendiente:{' '}
                <span className="font-medium text-foreground">
                  {formatCurrency(
                    filteredClients.reduce((sum, c) => sum + c.pendingAmount, 0)
                  )}
                </span>
              </span>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
