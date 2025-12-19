'use client'

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, FileStack, DollarSign, CheckCircle2 } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { CleanupPreview as CleanupPreviewType } from '../hooks'

interface CleanupPreviewProps {
  preview: CleanupPreviewType
  onCancel: () => void
  onConfirm: () => void
}

function formatCurrency(value: string | number): string {
  const num = typeof value === 'string' ? parseFloat(value) : value
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(num)
}

export function CleanupPreview({
  preview,
  onCancel,
  onConfirm,
}: CleanupPreviewProps) {
  return (
    <Card className="border-amber-200 dark:border-amber-800">
      <CardHeader className="bg-amber-50 dark:bg-amber-950/30">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
          <CardTitle>Vista Previa de Limpieza</CardTitle>
        </div>
        <CardDescription>
          Revisa los datos antes de confirmar la limpieza
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        {/* KPIs */}
        <div className="grid gap-4 md:grid-cols-2 mb-6">
          <div className="flex items-center gap-4 rounded-lg border p-4">
            <div className="rounded-full bg-blue-100 dark:bg-blue-900/30 p-3">
              <FileStack className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total de Prestamos</p>
              <p className="text-2xl font-bold">{preview.totalLoans.toLocaleString()}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-lg border p-4">
            <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-3">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Monto Total Pendiente</p>
              <p className="text-2xl font-bold">{formatCurrency(preview.totalPendingAmount)}</p>
            </div>
          </div>
        </div>

        {/* Sample loans table */}
        {preview.sampleLoans.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">
              Muestra de prestamos (primeros {preview.sampleLoans.length})
            </h4>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Codigo</TableHead>
                    <TableHead>Fecha Firma</TableHead>
                    <TableHead>Ruta</TableHead>
                    <TableHead className="text-right">Monto Pendiente</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.sampleLoans.map((loan) => (
                    <TableRow key={loan.id}>
                      <TableCell className="font-medium">{loan.clientName}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{loan.clientCode}</Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(loan.signDate), 'dd/MM/yyyy', { locale: es })}
                      </TableCell>
                      <TableCell>{loan.routeName}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(loan.pendingAmount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {preview.totalLoans > preview.sampleLoans.length && (
              <p className="text-xs text-muted-foreground text-center">
                ... y {preview.totalLoans - preview.sampleLoans.length} prestamos mas
              </p>
            )}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between bg-muted/30">
        <Button variant="outline" onClick={onCancel}>
          Modificar Filtros
        </Button>
        <Button onClick={onConfirm}>
          <CheckCircle2 className="mr-2 h-4 w-4" />
          Proceder con Limpieza
        </Button>
      </CardFooter>
    </Card>
  )
}
