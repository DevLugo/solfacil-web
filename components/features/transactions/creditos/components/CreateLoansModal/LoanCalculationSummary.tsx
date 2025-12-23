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
    <div className="p-2.5 rounded-md bg-green-100 dark:bg-green-900/50 border border-green-300 dark:border-green-600 space-y-1">
      {isRenewal && renewalPendingAmount > 0 && (
        <div className="flex justify-between items-center">
          <span className="text-xs font-medium text-green-800 dark:text-green-200">A entregar:</span>
          <span className={`text-base font-bold ${showDebtWarning ? 'text-red-600 dark:text-red-400' : 'text-green-700 dark:text-green-200'}`}>
            {formatCurrency(calculatedAmountGived)}
          </span>
        </div>
      )}
      <div className="flex justify-between items-center">
        <span className="text-xs text-green-700 dark:text-green-300">Pago semanal:</span>
        <span className="text-sm font-semibold text-green-800 dark:text-green-200">{formatCurrency(calculatedWeeklyPayment)}</span>
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
