'use client'

import { formatCurrency } from '@/lib/utils'

interface LoanCalculationSummaryProps {
  isRenewal: boolean
  renewalPendingAmount: number
  calculatedAmountGived: number
  calculatedWeeklyPayment: number
}

export function LoanCalculationSummary({
  isRenewal,
  renewalPendingAmount,
  calculatedAmountGived,
  calculatedWeeklyPayment,
}: LoanCalculationSummaryProps) {
  return (
    <div className="p-2.5 rounded-lg bg-muted/50 space-y-1.5 text-sm">
      {isRenewal && renewalPendingAmount > 0 && (
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">A entregar:</span>
          <span className="font-semibold text-primary">{formatCurrency(calculatedAmountGived)}</span>
        </div>
      )}
      <div className="flex justify-between items-center">
        <span className="text-muted-foreground">Pago semanal:</span>
        <span className="font-medium">{formatCurrency(calculatedWeeklyPayment)}</span>
      </div>
    </div>
  )
}
