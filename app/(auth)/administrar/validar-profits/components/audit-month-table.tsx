'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import type { ProfitAuditBucket } from '../queries'

interface Props {
  buckets: ProfitAuditBucket[]
  loading: boolean
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 2,
  }).format(value)
}

function formatMonth(yyyymm: string): string {
  // "2025-07" → "Jul 2025"
  const [year, month] = yyyymm.split('-')
  const date = new Date(Number(year), Number(month) - 1, 1)
  return date.toLocaleDateString('es-MX', { month: 'short', year: 'numeric' })
}

export function AuditMonthTable({ buckets, loading }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Desglose por mes</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mes</TableHead>
                <TableHead className="text-right">Créditos</TableHead>
                <TableHead className="text-right">Profit actual</TableHead>
                <TableHead className="text-right">Profit esperado</TableHead>
                <TableHead className="text-right">Diferencia</TableHead>
                <TableHead className="text-right">Pagos afectados</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && buckets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6}>
                    <Skeleton className="h-24 w-full" />
                  </TableCell>
                </TableRow>
              ) : buckets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No hay inconsistencias en el rango seleccionado
                  </TableCell>
                </TableRow>
              ) : (
                buckets.map((b) => (
                  <TableRow key={b.month}>
                    <TableCell className="font-medium">{formatMonth(b.month)}</TableCell>
                    <TableCell className="text-right">
                      {b.affectedLoansCount.toLocaleString('es-MX')}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(b.currentProfitTotal)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(b.expectedProfitTotal)}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-green-600">
                      {formatCurrency(b.differenceTotal)}
                    </TableCell>
                    <TableCell className="text-right">
                      {b.affectedEntriesCount.toLocaleString('es-MX')}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
