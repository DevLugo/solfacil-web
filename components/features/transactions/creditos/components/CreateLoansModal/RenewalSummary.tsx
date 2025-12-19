'use client'

import { RefreshCw } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import type { ActiveLoanData } from '../../types'

interface RenewalSummaryProps {
  activeLoan: ActiveLoanData
  pendingAmount: number
}

export function RenewalSummary({ activeLoan, pendingAmount }: RenewalSummaryProps) {
  return (
    <div className="flex items-center gap-3 p-2.5 rounded-lg border border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/30">
      <RefreshCw className="h-4 w-4 text-green-600 flex-shrink-0" />
      <div className="flex-1 min-w-0 flex items-center gap-4 text-sm">
        <span className="text-green-700 dark:text-green-400 font-medium">Renovación</span>
        <span className="text-muted-foreground">
          Pagado: <span className="text-green-600">{formatCurrency(parseFloat(activeLoan.totalPaid || '0'))}</span>
        </span>
        <span className="text-muted-foreground">
          Deuda: <span className="text-destructive font-medium">{formatCurrency(pendingAmount)}</span>
        </span>
      </div>
    </div>
  )
}
