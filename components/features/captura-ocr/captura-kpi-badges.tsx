'use client'

import { Users, Check, Ban, AlertCircle, Wallet, Building2, DollarSign } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, cn } from '@/lib/utils'
import type { CapturaPaymentRowState } from './captura-payment-row'
import type { CapturaClient } from './types'

interface Props {
  clients: CapturaClient[]
  paymentStates: Map<number, CapturaPaymentRowState>
}

export function CapturaKPIBadges({ clients, paymentStates }: Props) {
  let withPayment = 0
  let faltasCount = 0
  let exceptionsCount = 0
  let cashTotal = 0
  let bankTotal = 0
  let commissionTotal = 0

  clients.forEach((client) => {
    const state = paymentStates.get(client.pos)
    if (!state) return

    if (state.marca === 'FALTA') {
      faltasCount++
    } else if (state.marca !== 'REGULAR') {
      exceptionsCount++
      // Exceptions still have payments
      if (state.paymentMethod === 'CASH') cashTotal += state.montoPagado
      else bankTotal += state.montoPagado
      commissionTotal += state.comision
    } else {
      withPayment++
      if (state.paymentMethod === 'CASH') cashTotal += state.montoPagado
      else bankTotal += state.montoPagado
      commissionTotal += state.comision
    }
  })

  const grandTotal = cashTotal + bankTotal
  const badgeBase = 'gap-1 text-xs tabular-nums cursor-default'

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {/* Total clients */}
      <Badge variant="outline" className={cn(badgeBase)}>
        <Users className="h-3 w-3" />
        {clients.length}
      </Badge>

      {/* With payment */}
      <Badge variant="outline" className={cn(badgeBase, 'bg-success/10 text-success border-success/20')}>
        <Check className="h-3 w-3" />
        {withPayment}
      </Badge>

      {/* Faltas */}
      <Badge variant="outline" className={cn(badgeBase, 'bg-destructive/10 text-destructive border-destructive/20')}>
        <Ban className="h-3 w-3" />
        {faltasCount}
      </Badge>

      {/* Exceptions */}
      {exceptionsCount > 0 && (
        <Badge variant="outline" className={cn(badgeBase, 'bg-warning/10 text-warning border-warning/20')}>
          <AlertCircle className="h-3 w-3" />
          {exceptionsCount}
        </Badge>
      )}

      <span className="text-muted-foreground text-xs">|</span>

      {/* Cash total */}
      <Badge variant="outline" className={cn(badgeBase, 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/50 dark:text-green-400 dark:border-green-800')}>
        <Wallet className="h-3 w-3" />
        {formatCurrency(cashTotal)}
      </Badge>

      {/* Bank total */}
      <Badge variant="outline" className={cn(badgeBase, 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-800')}>
        <Building2 className="h-3 w-3" />
        {formatCurrency(bankTotal)}
      </Badge>

      {/* Grand total */}
      <Badge variant="outline" className={cn(badgeBase, 'font-bold')}>
        {formatCurrency(grandTotal)}
      </Badge>

      {/* Commission */}
      <Badge variant="outline" className={cn(badgeBase, 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20')}>
        <DollarSign className="h-3 w-3" />
        {formatCurrency(commissionTotal)}
      </Badge>
    </div>
  )
}
