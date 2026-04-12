'use client'

import { RefreshCw, AlertTriangle, CheckCircle2, AlertCircle, XCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, cn } from '@/lib/utils'
import type { CapturaClient, CapturaLoanType } from './types'
import type { MatchConfidence } from '@/lib/fuzzy-match'

interface Props {
  matchedClient: CapturaClient
  requestedAmount: number
  matchConfidence: MatchConfidence
  selectedLoanType?: CapturaLoanType | null
  sameSessionPayment?: number
}

const CONFIDENCE_STYLES: Record<string, { bg: string; text: string; icon: React.ReactNode; label: string }> = {
  HIGH: {
    bg: 'bg-green-100 border-green-300 dark:bg-green-900/50 dark:border-green-700',
    text: 'text-green-700 dark:text-green-300',
    icon: <CheckCircle2 className="h-3 w-3" />,
    label: 'Exacto',
  },
  MEDIUM: {
    bg: 'bg-yellow-100 border-yellow-300 dark:bg-yellow-900/50 dark:border-yellow-700',
    text: 'text-yellow-700 dark:text-yellow-300',
    icon: <AlertCircle className="h-3 w-3" />,
    label: 'Probable',
  },
  LOW: {
    bg: 'bg-red-100 border-red-300 dark:bg-red-900/50 dark:border-red-700',
    text: 'text-red-700 dark:text-red-300',
    icon: <XCircle className="h-3 w-3" />,
    label: 'Verificar',
  },
}

export function CapturaRenewalSummary({ matchedClient, requestedAmount, matchConfidence, selectedLoanType, sameSessionPayment = 0 }: Props) {
  const pendingBalanceRaw = matchedClient.pendingBalance || 0
  const pendingBalance = pendingBalanceRaw - sameSessionPayment
  // Use selected loantype if available, fallback to matchedClient data
  const rate = selectedLoanType ? parseFloat(selectedLoanType.rate) || 0 : (matchedClient.rate || 0)
  const weekDuration = selectedLoanType ? selectedLoanType.weekDuration : (matchedClient.weekDuration || 14)

  const profitAmount = requestedAmount * rate
  const totalDebt = requestedAmount + profitAmount
  const amountGived = requestedAmount - pendingBalance
  const weeklyPayment = weekDuration > 0 ? totalDebt / weekDuration : 0

  const showDebtWarning = pendingBalance > 0 && amountGived <= 0
  const confStyle = CONFIDENCE_STYLES[matchConfidence] || CONFIDENCE_STYLES.LOW

  return (
    <div className="space-y-1.5">
      {/* Renewal info card */}
      <div className="flex items-center gap-2 p-2 rounded-md border border-green-200 bg-green-50/50 dark:border-green-700 dark:bg-green-950/30">
        <RefreshCw className="h-3.5 w-3.5 text-green-600 flex-shrink-0" />
        <div className="flex-1 min-w-0 flex items-center gap-3 text-xs flex-wrap">
          <span className="text-green-700 dark:text-green-400 font-medium">Renovacion</span>
          <Badge variant="outline" className={cn('h-5 px-1.5 text-[10px] gap-0.5', confStyle.bg, confStyle.text)}>
            {confStyle.icon}
            {confStyle.label}
          </Badge>
          {matchedClient.totalPaid != null && (
            <span className="text-muted-foreground">
              Pagado: <span className="text-green-600 font-medium">{formatCurrency(matchedClient.totalPaid)}</span>
            </span>
          )}
          <span className="text-muted-foreground">
            Deuda: <span className="text-red-600 dark:text-red-400 font-medium">{formatCurrency(pendingBalance)}</span>
            {sameSessionPayment > 0 && (
              <span className="text-green-600 dark:text-green-400 ml-1 text-[10px]">
                ({formatCurrency(pendingBalanceRaw)} - {formatCurrency(sameSessionPayment)} abono)
              </span>
            )}
          </span>
        </div>
      </div>

      {/* Calculation summary */}
      <div className="p-2 rounded-md bg-green-100/60 dark:bg-green-900/30 border border-green-200 dark:border-green-700 flex items-center gap-4 text-xs flex-wrap">
        {pendingBalance > 0 && (
          <div className="flex items-center gap-1">
            <span className="text-green-700 dark:text-green-300 font-medium">A entregar:</span>
            <span className={cn('font-bold', showDebtWarning ? 'text-red-600 dark:text-red-400' : 'text-green-700 dark:text-green-200')}>
              {formatCurrency(amountGived)}
            </span>
          </div>
        )}
        <div className="flex items-center gap-1">
          <span className="text-green-700 dark:text-green-300">Semanal:</span>
          <span className="font-semibold text-green-800 dark:text-green-200">{formatCurrency(weeklyPayment)}</span>
        </div>
        {selectedLoanType && (
          <span className="text-muted-foreground">{selectedLoanType.name}</span>
        )}
        {!selectedLoanType && matchedClient.loantypeName && (
          <span className="text-muted-foreground">{matchedClient.loantypeName}</span>
        )}
      </div>

      {/* Debt warning */}
      {showDebtWarning && (
        <div className="flex items-start gap-2 p-2 rounded bg-destructive/10 text-destructive text-xs">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">La deuda anterior excede el monto solicitado</p>
            <p>
              Deuda: {formatCurrency(pendingBalance)} &gt; Solicitado: {formatCurrency(requestedAmount)}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
