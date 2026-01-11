'use client'

import { RefreshCw } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface ActiveLoanData {
  totalPaid?: string
}

interface RenewalSummaryInlineProps {
  activeLoan?: ActiveLoanData | null
  renewalPendingAmount: number
}

export function RenewalSummaryInline({ activeLoan, renewalPendingAmount }: RenewalSummaryInlineProps) {
  return (
    <div className="flex items-center gap-2 p-2 rounded-md border border-green-200 bg-green-50/50 dark:border-green-700 dark:bg-green-950/30">
      <RefreshCw className="h-3.5 w-3.5 text-green-600 flex-shrink-0" />
      <div className="flex-1 min-w-0 flex items-center gap-3 text-xs">
        <span className="text-green-700 dark:text-green-400 font-medium">Renovación</span>
        {activeLoan?.totalPaid && (
          <span className="text-muted-foreground">
            Pagado: <span className="text-green-600 font-medium">{formatCurrency(parseFloat(activeLoan.totalPaid))}</span>
          </span>
        )}
        <span className="text-muted-foreground">
          Deuda: <span className="text-red-600 dark:text-red-400 font-medium">{formatCurrency(renewalPendingAmount)}</span>
        </span>
      </div>
    </div>
  )
}
