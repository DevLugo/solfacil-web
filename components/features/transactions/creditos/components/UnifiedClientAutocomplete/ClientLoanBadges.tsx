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
      <div className="flex flex-col items-end gap-0.5">
        {/* Location badge */}
        {client.activeLoan.leadLocationName && (
          <Badge variant="outline" className="text-xs font-normal gap-1">
            <MapPin className="h-2.5 w-2.5" />
            {client.activeLoan.leadLocationName}
          </Badge>
        )}
        {/* Debt badge */}
        <Badge
          variant={hasDebt ? 'destructive' : 'outline'}
          className={cn(
            'text-xs font-normal gap-1',
            !hasDebt && successBadgeStyle
          )}
        >
          <DollarSign className="h-2.5 w-2.5" />
          {hasDebt ? `Debe: ${formatCurrency(pendingAmount)}` : 'Sin deuda'}
        </Badge>
      </div>
    )
  }

  // Has active loan but no detailed data (fallback)
  if (client.hasActiveLoans) {
    return (
      <div className="flex flex-col items-end gap-0.5">
        {/* Show client's location if available */}
        {client.locationName && (
          <Badge variant="outline" className="text-xs font-normal gap-1">
            <MapPin className="h-2.5 w-2.5" />
            {client.locationName}
          </Badge>
        )}
        {/* Debt badge */}
        {client.pendingDebtAmount && client.pendingDebtAmount > 0 ? (
          <Badge variant="destructive" className="text-xs font-normal gap-1">
            <DollarSign className="h-2.5 w-2.5" />
            Debe: {formatCurrency(client.pendingDebtAmount)}
          </Badge>
        ) : (
          <Badge variant="outline" className={cn('text-xs font-normal gap-1', successBadgeStyle)}>
            <DollarSign className="h-2.5 w-2.5" />
            Sin deuda
          </Badge>
        )}
      </div>
    )
  }

  // Has completed loans but no active ones
  if (client.loanFinishedCount && client.loanFinishedCount > 0) {
    return (
      <Badge variant="outline" className={cn('text-xs font-normal', successBadgeStyle)}>
        <History className="h-3 w-3 mr-1" />
        {client.loanFinishedCount} completados
      </Badge>
    )
  }

  // New client (no loans)
  return (
    <Badge variant="secondary" className="text-xs font-normal">
      Sin historial
    </Badge>
  )
}
