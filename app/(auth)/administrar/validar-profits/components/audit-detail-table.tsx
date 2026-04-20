'use client'

import * as React from 'react'
import { useQuery } from '@apollo/client'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Skeleton } from '@/components/ui/skeleton'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { PROFIT_AUDIT_LOANS, ProfitAuditLoan, ProfitInconsistencyType } from '../queries'

interface Props {
  fromDate: Date
  toDate: Date
  routeId: string | undefined
}

const PAGE_SIZE = 50

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 2,
  }).format(value)
}

function getBadgeVariant(
  type: ProfitInconsistencyType,
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (type) {
    case 'HEADER_ONLY':
      return 'secondary'
    case 'ENTRIES_ONLY':
      return 'outline'
    case 'BOTH':
      return 'destructive'
  }
}

export function AuditDetailTable({ fromDate, toDate, routeId }: Props) {
  const [page, setPage] = React.useState(0)
  const [typeFilter, setTypeFilter] = React.useState<ProfitInconsistencyType | 'ALL'>('ALL')

  // Reset page on filter change
  React.useEffect(() => {
    setPage(0)
  }, [fromDate, toDate, routeId, typeFilter])

  const { data, loading } = useQuery<{ profitAuditLoans: ProfitAuditLoan[] }>(
    PROFIT_AUDIT_LOANS,
    {
      variables: {
        fromDate: fromDate.toISOString(),
        toDate: toDate.toISOString(),
        routeId: routeId ?? null,
        inconsistencyType: typeFilter === 'ALL' ? null : typeFilter,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      },
      fetchPolicy: 'cache-and-network',
    },
  )

  const loans = data?.profitAuditLoans ?? []
  const canGoPrev = page > 0
  const canGoNext = loans.length === PAGE_SIZE

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <CardTitle className="text-base">Detalle de créditos con inconsistencia</CardTitle>
          <div className="w-56">
            <Select
              value={typeFilter}
              onValueChange={(v) => setTypeFilter(v as ProfitInconsistencyType | 'ALL')}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos los tipos</SelectItem>
                <SelectItem value="HEADER_ONLY">Solo header</SelectItem>
                <SelectItem value="ENTRIES_ONLY">Solo entries</SelectItem>
                <SelectItem value="BOTH">Ambos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead className="text-right">Solicitado</TableHead>
                <TableHead className="text-right">Rate</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Profit actual</TableHead>
                <TableHead className="text-right">Profit esperado</TableHead>
                <TableHead className="text-right">Diferencia</TableHead>
                <TableHead className="text-right">Pagos</TableHead>
                <TableHead>Inconsistencia</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && loans.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10}>
                    <Skeleton className="h-24 w-full" />
                  </TableCell>
                </TableRow>
              ) : loans.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                    Sin resultados
                  </TableCell>
                </TableRow>
              ) : (
                loans.map((loan) => (
                  <TableRow key={loan.loanId}>
                    <TableCell className="font-medium">{loan.clientName ?? '—'}</TableCell>
                    <TableCell>
                      {format(new Date(loan.signDate), 'dd/MM/yyyy', { locale: es })}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(loan.requestedAmount)}
                    </TableCell>
                    <TableCell className="text-right">
                      {(loan.rate * 100).toFixed(0)}%
                    </TableCell>
                    <TableCell>
                      {loan.isRenewal ? (
                        <Badge variant="secondary">Renovación</Badge>
                      ) : (
                        <Badge variant="outline">Nuevo</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(loan.currentProfit)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(loan.expectedProfit)}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-green-600">
                      {formatCurrency(loan.difference)}
                    </TableCell>
                    <TableCell className="text-right">{loan.affectedEntriesCount}</TableCell>
                    <TableCell>
                      <Badge variant={getBadgeVariant(loan.inconsistencyType)}>
                        {loan.inconsistencyType}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-muted-foreground">
            Página {page + 1} · {loans.length} registros
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={!canGoPrev || loading}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={!canGoNext || loading}
            >
              Siguiente
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
