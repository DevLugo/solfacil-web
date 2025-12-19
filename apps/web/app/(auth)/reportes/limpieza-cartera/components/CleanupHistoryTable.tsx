'use client'

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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { History, FileStack, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { PortfolioCleanup } from '../hooks'

interface CleanupHistoryTableProps {
  cleanups: PortfolioCleanup[]
  isLoading?: boolean
  onEdit?: (cleanup: PortfolioCleanup) => void
  onDelete?: (cleanup: PortfolioCleanup) => void
}

function formatCurrency(value: string | number): string {
  const num = typeof value === 'string' ? parseFloat(value) : value
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(num)
}

export function CleanupHistoryTable({
  cleanups,
  isLoading = false,
  onEdit,
  onDelete,
}: CleanupHistoryTableProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Historial de Limpiezas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            Cargando historial...
          </div>
        </CardContent>
      </Card>
    )
  }

  if (cleanups.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Historial de Limpiezas
          </CardTitle>
          <CardDescription>
            No se han realizado limpiezas de cartera
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <FileStack className="h-12 w-12 mb-2 opacity-50" />
            <p>No hay limpiezas registradas</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Historial de Limpiezas
        </CardTitle>
        <CardDescription>
          {cleanups.length} limpieza{cleanups.length !== 1 ? 's' : ''} registrada{cleanups.length !== 1 ? 's' : ''}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Fecha Efectiva</TableHead>
                <TableHead>Fecha Limite</TableHead>
                <TableHead>Ruta</TableHead>
                <TableHead className="text-right">Prestamos</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                <TableHead>Ejecutado Por</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cleanups.map((cleanup) => (
                <TableRow key={cleanup.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{cleanup.name}</p>
                      {cleanup.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {cleanup.description}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {format(new Date(cleanup.cleanupDate), 'dd/MM/yyyy', { locale: es })}
                  </TableCell>
                  <TableCell>
                    {cleanup.toDate
                      ? format(new Date(cleanup.toDate), 'dd/MM/yyyy', { locale: es })
                      : '-'}
                  </TableCell>
                  <TableCell>
                    {cleanup.route ? (
                      <Badge variant="outline">{cleanup.route.name}</Badge>
                    ) : (
                      <Badge variant="secondary">Todas</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {cleanup.excludedLoansCount.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(cleanup.excludedAmount)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {cleanup.executedBy?.email || '-'}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Acciones</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit?.(cleanup)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onDelete?.(cleanup)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
