'use client'

import { MapPin, DollarSign, History } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn, formatCurrency } from '@/lib/utils'
import { badgeStyles } from '../../../shared/theme'
import type { UnifiedClientValue } from '../../types'

interface ClientLoanBadgesProps {
  client: UnifiedClientValue
  mode: 'borrower' | 'aval'
}

// Success badge style for "no debt" and "completed" states
const successBadgeStyle = badgeStyles.success

export function ClientLoanBadges({ client, mode }: ClientLoanBadgesProps) {
  if (mode !== 'borrower') return null

  // Client has an active loan - show detailed info
  if (client.activeLoan) {
    const pendingAmount = parseFloat(client.activeLoan.pendingAmountStored || '0')
    const hasDebt = pendingAmount > 0
    return (
      <div className="flex items-center gap-0.5">
        {/* Location badge */}
        {client.activeLoan.leadLocationName && (
          <Badge variant="outline" className="text-[10px] font-normal gap-0.5 py-0 px-1.5 h-4">
            <MapPin className="h-2 w-2" />
            {client.activeLoan.leadLocationName}
          </Badge>
        )}
        {/* Debt badge */}
        <Badge
          variant={hasDebt ? 'destructive' : 'outline'}
          className={cn(
            'text-[10px] font-normal gap-0.5 py-0 px-1.5 h-4',
            !hasDebt && successBadgeStyle
          )}
        >
          <DollarSign className="h-2 w-2" />
          {hasDebt ? formatCurrency(pendingAmount) : 'Sin deuda'}
        </Badge>
      </div>
    )
  }

  // Has active loan but no detailed data (fallback)
  if (client.hasActiveLoans) {
    return (
      <div className="flex items-center gap-0.5">
        {/* Show client's location if available */}
        {client.locationName && (
          <Badge variant="outline" className="text-[10px] font-normal gap-0.5 py-0 px-1.5 h-4">
            <MapPin className="h-2 w-2" />
            {client.locationName}
          </Badge>
        )}
        {/* Debt badge */}
        {client.pendingDebtAmount && client.pendingDebtAmount > 0 ? (
          <Badge variant="destructive" className="text-[10px] font-normal gap-0.5 py-0 px-1.5 h-4">
            <DollarSign className="h-2 w-2" />
            {formatCurrency(client.pendingDebtAmount)}
          </Badge>
        ) : (
          <Badge variant="outline" className={cn('text-[10px] font-normal gap-0.5 py-0 px-1.5 h-4', successBadgeStyle)}>
            <DollarSign className="h-2 w-2" />
            Sin deuda
          </Badge>
        )}
      </div>
    )
  }

  // Has completed loans but no active ones
  if (client.loanFinishedCount && client.loanFinishedCount > 0) {
    return (
      <Badge variant="outline" className={cn('text-[10px] font-normal py-0 px-1.5 h-4', successBadgeStyle)}>
        <History className="h-2 w-2 mr-0.5" />
        Reintegro
      </Badge>
    )
  }

  // New client (no loans)
  return (
    <Badge variant="secondary" className="text-[10px] font-normal py-0 px-1.5 h-4">
      Sin historial
    </Badge>
  )
}
