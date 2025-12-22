'use client'

import { AlertTriangle } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface LoanCalculationSummaryProps {
  isRenewal: boolean
  renewalPendingAmount: number
  calculatedAmountGived: number
  calculatedWeeklyPayment: number
  requestedAmount: number
}

export function LoanCalculationSummary({
  isRenewal,
  renewalPendingAmount,
  calculatedAmountGived,
  calculatedWeeklyPayment,
  requestedAmount,
}: LoanCalculationSummaryProps) {
  // Warning when the pending debt exceeds or equals the requested amount
  const showDebtWarning = isRenewal && renewalPendingAmount > 0 && calculatedAmountGived <= 0
  const debtExceedsRequest = renewalPendingAmount > requestedAmount

  return (
    <div className="p-2.5 rounded-lg bg-muted/50 space-y-1.5 text-sm">
      {isRenewal && renewalPendingAmount > 0 && (
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">A entregar:</span>
          <span className={`font-semibold ${showDebtWarning ? 'text-destructive' : 'text-primary'}`}>
            {formatCurrency(calculatedAmountGived)}
          </span>
        </div>
      )}
      <div className="flex justify-between items-center">
        <span className="text-muted-foreground">Pago semanal:</span>
        <span className="font-medium">{formatCurrency(calculatedWeeklyPayment)}</span>
      </div>
      {showDebtWarning && (
        <div className="flex items-start gap-2 p-2 mt-2 rounded bg-destructive/10 text-destructive text-xs">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">La deuda anterior excede el monto solicitado</p>
            <p>
              Deuda: {formatCurrency(renewalPendingAmount)} &gt; Solicitado: {formatCurrency(requestedAmount)}
            </p>
            <p className="mt-1">
              {debtExceedsRequest
                ? 'El cliente no recibirá dinero. Considera aumentar el monto solicitado.'
                : 'El cliente recibirá $0. Verifica que esto sea correcto.'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
