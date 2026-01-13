'use client'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { DollarSign, Receipt, Users, Skull } from 'lucide-react'
import type { RecoveredDeadDebtData } from './types'

// Utility function to format currency without decimals
function formatCurrencyNoDecimals(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '$0'
  const numValue = typeof value === 'string' ? parseFloat(value) : value
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(numValue)
}

interface RecoveredDeadDebtCardProps {
  data: RecoveredDeadDebtData
  onViewDetail?: () => void
}

export function RecoveredDeadDebtCard({ data, onViewDetail }: RecoveredDeadDebtCardProps) {
  // Don't render if no data
  if (!data || (data.summary.paymentsCount === 0 && data.summary.loansCount === 0)) {
    return null
  }

  return (
    <Card className="border-green-200 dark:border-green-900 bg-green-50/50 dark:bg-green-950/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Skull className="h-5 w-5 text-green-600 dark:text-green-400" />
          Cartera Muerta Recuperada
        </CardTitle>
        <CardDescription>
          Pagos recibidos de creditos previamente marcados como cartera muerta.{' '}
          {onViewDetail && (
            <button
              onClick={onViewDetail}
              className="text-primary hover:underline font-medium"
            >
              Ver detalle
            </button>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 cursor-pointer"
          onClick={onViewDetail}
        >
          {/* Monto Recuperado */}
          <div className="rounded-lg border bg-white dark:bg-background p-4 transition-colors hover:bg-muted/50">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
              <span className="text-sm font-medium text-muted-foreground">Monto Recuperado</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-green-600 dark:text-green-400">
              {formatCurrencyNoDecimals(data.summary.totalRecovered)}
            </p>
          </div>

          {/* Pagos Recibidos */}
          <div className="rounded-lg border bg-white dark:bg-background p-4 transition-colors hover:bg-muted/50">
            <div className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-green-600 dark:text-green-400" />
              <span className="text-sm font-medium text-muted-foreground">Pagos Recibidos</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              {data.summary.paymentsCount}
            </p>
          </div>

          {/* Creditos */}
          <div className="rounded-lg border bg-white dark:bg-background p-4 transition-colors hover:bg-muted/50">
            <div className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-green-600 dark:text-green-400" />
              <span className="text-sm font-medium text-muted-foreground">Creditos</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              {data.summary.loansCount}
            </p>
            <p className="text-xs text-muted-foreground">Con pagos este mes</p>
          </div>

          {/* Clientes */}
          <div className="rounded-lg border bg-white dark:bg-background p-4 transition-colors hover:bg-muted/50">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-green-600 dark:text-green-400" />
              <span className="text-sm font-medium text-muted-foreground">Clientes</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              {data.summary.clientsCount}
            </p>
            <p className="text-xs text-muted-foreground">Que pagaron cartera muerta</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
