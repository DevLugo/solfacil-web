'use client'

import { RefreshCw, AlertTriangle, CheckCircle2, AlertCircle, XCircle, Globe, MapPin } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, cn } from '@/lib/utils'
import type { CapturaClient, CapturaLoanType } from './types'
import type { MatchConfidence } from '@/lib/fuzzy-match'

export interface GlobalRenewalInfo {
  fullName: string
  clientCode?: string
  /** Pendiente del préstamo anterior (snapshot al momento de seleccionar). */
  previousLoanPending: number
  /** Opcional: totalPaid del préstamo anterior (si estaba disponible en la búsqueda). */
  previousLoanTotalPaid?: number
  /** Rate/semanas del loantype seleccionado (se leen del selectedLoanType si no vienen). */
  rate?: number
  weekDuration?: number
  loantypeName?: string
  /** Nombre de la localidad origen cuando el cliente es de otra ruta/localidad. */
  sourceLocationName?: string
  /** Si es true, marca visualmente "Renovación FINISHED" (préstamo ya pagado). */
  isFinishedLoanRenewal?: boolean
}

interface Props {
  requestedAmount: number
  matchConfidence: MatchConfidence
  selectedLoanType?: CapturaLoanType | null
  /** Solo aplica al modo "match local" (se resta al pending). */
  sameSessionPayment?: number
  /** Modo A: match local — client viene de clientsList de la localidad. */
  matchedClient?: CapturaClient | null
  /** Modo B: selección global — client viene de searchBorrowers (otra localidad / FINISHED). */
  globalInfo?: GlobalRenewalInfo | null
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

export function CapturaRenewalSummary({
  matchedClient,
  globalInfo,
  requestedAmount,
  matchConfidence,
  selectedLoanType,
  sameSessionPayment = 0,
}: Props) {
  const isGlobalMode = !matchedClient && !!globalInfo
  const confStyle = CONFIDENCE_STYLES[matchConfidence] || CONFIDENCE_STYLES.LOW

  // Resolver valores desde el modo activo (local o global)
  const pendingBalanceRaw = isGlobalMode
    ? (globalInfo?.previousLoanPending ?? 0)
    : (matchedClient?.pendingBalance ?? 0)
  const pendingBalance = isGlobalMode
    ? pendingBalanceRaw  // en modo global no aplicamos sameSessionPayment
    : pendingBalanceRaw - sameSessionPayment

  const totalPaidPrevious = isGlobalMode
    ? globalInfo?.previousLoanTotalPaid
    : matchedClient?.totalPaid

  const rate = selectedLoanType
    ? parseFloat(selectedLoanType.rate) || 0
    : (isGlobalMode ? (globalInfo?.rate ?? 0) : (matchedClient?.rate ?? 0))
  const weekDuration = selectedLoanType
    ? selectedLoanType.weekDuration
    : (isGlobalMode ? (globalInfo?.weekDuration ?? 14) : (matchedClient?.weekDuration ?? 14))
  const loantypeName = selectedLoanType?.name
    || (isGlobalMode ? globalInfo?.loantypeName : matchedClient?.loantypeName)

  const profitAmount = requestedAmount * rate
  const totalDebt = requestedAmount + profitAmount
  const amountGived = requestedAmount - pendingBalance
  const weeklyPayment = weekDuration > 0 ? totalDebt / weekDuration : 0

  const showDebtWarning = pendingBalance > 0 && amountGived <= 0

  // Estilo del card: púrpura si viene de global, verde si match local
  const cardBg = isGlobalMode
    ? 'border-purple-200 bg-purple-50/50 dark:border-purple-700 dark:bg-purple-950/30'
    : 'border-green-200 bg-green-50/50 dark:border-green-700 dark:bg-green-950/30'
  const calcBg = isGlobalMode
    ? 'bg-purple-100/60 dark:bg-purple-900/30 border-purple-200 dark:border-purple-700'
    : 'bg-green-100/60 dark:bg-green-900/30 border-green-200 dark:border-green-700'
  const accentIconColor = isGlobalMode
    ? 'text-purple-600 dark:text-purple-400'
    : 'text-green-600 dark:text-green-400'
  const accentLabelColor = isGlobalMode
    ? 'text-purple-700 dark:text-purple-300'
    : 'text-green-700 dark:text-green-400'
  const Icon = isGlobalMode ? Globe : RefreshCw

  return (
    <div className="space-y-1.5">
      {/* Renewal info card */}
      <div className={cn('flex items-center gap-2 p-2 rounded-md border', cardBg)}>
        <Icon className={cn('h-3.5 w-3.5 flex-shrink-0', accentIconColor)} />
        <div className="flex-1 min-w-0 flex items-center gap-3 text-xs flex-wrap">
          <span className={cn('font-medium', accentLabelColor)}>
            {isGlobalMode
              ? (globalInfo?.isFinishedLoanRenewal ? 'Renovacion (FINISHED)' : 'Cliente existente')
              : 'Renovacion'}
          </span>
          {isGlobalMode && globalInfo?.clientCode && (
            <span className="font-mono text-[10px] text-muted-foreground">{globalInfo.clientCode}</span>
          )}
          <Badge variant="outline" className={cn('h-5 px-1.5 text-[10px] gap-0.5', confStyle.bg, confStyle.text)}>
            {confStyle.icon}
            {confStyle.label}
          </Badge>
          {isGlobalMode && globalInfo?.sourceLocationName && (
            <Badge variant="outline" className="h-5 px-1.5 text-[10px] gap-0.5 border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
              <MapPin className="h-3 w-3" />
              {globalInfo.sourceLocationName}
            </Badge>
          )}
          {totalPaidPrevious != null && (
            <span className="text-muted-foreground">
              Pagado: <span className="text-green-600 font-medium">{formatCurrency(totalPaidPrevious)}</span>
            </span>
          )}
          <span className="text-muted-foreground">
            Deuda: <span className="text-red-600 dark:text-red-400 font-medium">{formatCurrency(pendingBalance)}</span>
            {!isGlobalMode && sameSessionPayment > 0 && (
              <span className="text-green-600 dark:text-green-400 ml-1 text-[10px]">
                ({formatCurrency(pendingBalanceRaw)} - {formatCurrency(sameSessionPayment)} abono)
              </span>
            )}
          </span>
        </div>
      </div>

      {/* Calculation summary */}
      <div className={cn('p-2 rounded-md border flex items-center gap-4 text-xs flex-wrap', calcBg)}>
        {pendingBalance > 0 && (
          <div className="flex items-center gap-1">
            <span className={cn('font-medium', accentLabelColor)}>A entregar:</span>
            <span className={cn('font-bold', showDebtWarning ? 'text-red-600 dark:text-red-400' : accentLabelColor)}>
              {formatCurrency(amountGived)}
            </span>
          </div>
        )}
        <div className="flex items-center gap-1">
          <span className={accentLabelColor}>Semanal:</span>
          <span className={cn('font-semibold', accentLabelColor)}>{formatCurrency(weeklyPayment)}</span>
        </div>
        {loantypeName && (
          <span className="text-muted-foreground">{loantypeName}</span>
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
