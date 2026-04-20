'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertTriangle, DollarSign, Receipt } from 'lucide-react'
import type { ProfitAuditReport } from '../queries'

interface Props {
  report?: ProfitAuditReport
  loading: boolean
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 2,
  }).format(value)
}

export function AuditSummaryCards({ report, loading }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Créditos con inconsistencia</CardTitle>
          <AlertTriangle className="h-4 w-4 text-amber-500" />
        </CardHeader>
        <CardContent>
          {loading && !report ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            <div className="text-3xl font-bold">
              {(report?.totalLoans ?? 0).toLocaleString('es-MX')}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Profit no reportado</CardTitle>
          <DollarSign className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          {loading && !report ? (
            <Skeleton className="h-8 w-32" />
          ) : (
            <div className="text-3xl font-bold text-green-600">
              {formatCurrency(report?.totalDifference ?? 0)}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Pagos afectados</CardTitle>
          <Receipt className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          {loading && !report ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            <div className="text-3xl font-bold">
              {(report?.totalAffectedEntries ?? 0).toLocaleString('es-MX')}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
