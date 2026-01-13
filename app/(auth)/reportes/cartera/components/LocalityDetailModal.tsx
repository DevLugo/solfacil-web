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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  MapPin,
  Users,
  UserPlus,
  RefreshCw,
  UserMinus,
  AlertCircle,
  Loader2,
  LogOut,
} from 'lucide-react'
import type {
  LocalityBreakdownDetail,
  LocalityClientDetail,
  ClientCategory,
  FinishedClientDetail,
} from '../hooks'
import { useLocalityClients, useFinishedClients } from '../hooks'
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

  // Calculate payment percentage for color coding
  const paymentPercentage = client.expectedWeekly > 0
    ? (client.paidThisWeek / client.expectedWeekly) * 100
    : 100

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
        <div className="flex flex-col items-end">
          <span
            className={cn(
              'font-medium text-sm',
              paymentPercentage >= 100
                ? 'text-green-600 dark:text-green-400'
                : paymentPercentage >= 50
                  ? 'text-yellow-600 dark:text-yellow-400'
                  : 'text-red-600 dark:text-red-400'
            )}
          >
            {formatCurrency(client.paidThisWeek)}
          </span>
          <span className="text-xs text-muted-foreground">
            / {formatCurrency(client.expectedWeekly)}
          </span>
        </div>
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

function FinishedClientRow({ client }: { client: FinishedClientDetail }) {
  return (
    <TableRow>
      <TableCell>
        <div>
          <p className="font-medium">{client.clientName}</p>
          <p className="text-xs text-muted-foreground">{client.clientCode}</p>
        </div>
      </TableCell>
      <TableCell className="text-right">{formatCurrency(client.amountGived)}</TableCell>
      <TableCell className="text-right">{formatCurrency(client.totalPaid)}</TableCell>
      <TableCell className="text-sm">
        {formatDateWithYear(client.finishedDate)}
      </TableCell>
      <TableCell>
        {client.hadPendingDebt ? (
          <Badge variant="outline" className="bg-yellow-100 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-400 border-0">
            Con deuda
          </Badge>
        ) : (
          <Badge variant="outline" className="bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400 border-0">
            Pagó todo
          </Badge>
        )}
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">{client.loanType}</TableCell>
    </TableRow>
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
  const [activeTab, setActiveTab] = useState<'active' | 'finished'>('active')
  const { clients, stats, loading, getClients } = useLocalityClients()
  const {
    clients: finishedClients,
    loading: finishedLoading,
    getClients: getFinishedClients
  } = useFinishedClients()

  // Fetch clients and reset filter when locality or weekNumber changes
  useEffect(() => {
    if (locality) {
      setSelectedCategory('ALL') // Reset filter when locality changes
      setActiveTab('active') // Reset to active tab
      getClients({
        localityId: locality.localityId,
        year,
        month,
        weekNumber,
      })
      getFinishedClients({
        localityId: locality.localityId,
        year,
        month,
        weekNumber,
      })
    }
  }, [locality, year, month, weekNumber, getClients, getFinishedClients])

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
            {stats.total} clientes activos, {finishedClients.length} finalizados sin renovar
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'active' | 'finished')} className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="active" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Activos ({stats.total})
            </TabsTrigger>
            <TabsTrigger value="finished" className="flex items-center gap-2">
              <LogOut className="h-4 w-4" />
              Finalizados sin renovar ({finishedClients.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="flex-1 flex flex-col min-h-0 mt-4">
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
                      <TableHead className="text-right">Pagado / Esperado</TableHead>
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
          </TabsContent>

          <TabsContent value="finished" className="flex-1 flex flex-col min-h-0 mt-4">
            <p className="text-sm text-muted-foreground mb-4">
              Clientes que terminaron de pagar en este período y no renovaron (salen del portafolio)
            </p>

            {/* Finished Clients Table */}
            <div className="flex-1 overflow-auto min-h-0">
              {finishedLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : finishedClients.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <LogOut className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-semibold">Sin finalizados</h3>
                  <p className="text-sm text-muted-foreground">
                    No hay clientes que hayan terminado sin renovar en este período
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead className="text-right">Monto Otorgado</TableHead>
                      <TableHead className="text-right">Total Pagado</TableHead>
                      <TableHead>Fecha Fin</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Tipo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {finishedClients.map((client) => (
                      <FinishedClientRow key={client.loanId} client={client} />
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
