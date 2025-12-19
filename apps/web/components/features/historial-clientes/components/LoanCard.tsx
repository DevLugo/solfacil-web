'use client'

import { ChevronRight } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { StatusBadge } from './StatusBadge'
import { formatCurrency } from '../utils'
import { mapApiStatus, statusToBadgeVariant, statusLabels } from '../constants'
import type { LoanHistoryDetail } from '../types'

interface LoanCardProps {
  loan: LoanHistoryDetail
  isExpanded: boolean
  onToggleExpand: () => void
  isCollateral?: boolean
}

export function LoanCard({ loan, onToggleExpand }: LoanCardProps) {
  const progress = loan.totalAmountDue > 0
    ? Math.round((loan.totalPaid / loan.totalAmountDue) * 100)
    : 0

  // Use centralized status logic from constants
  const effectiveStatus = mapApiStatus(loan.status, loan.wasRenewed)
  const isActive = effectiveStatus === 'active'

  return (
    <Card
      className={cn(
        'cursor-pointer hover:bg-muted transition-colors border-l-2',
        isActive ? 'border-l-success' : 'border-l-transparent'
      )}
      onClick={onToggleExpand}
    >
      <div className="p-2.5">
        {/* Row 1: Date, Status, Progress */}
        <div className="flex items-center gap-2 mb-2">
          <div className="text-xs font-medium">{loan.signDateFormatted}</div>
          <StatusBadge variant={statusToBadgeVariant[effectiveStatus]}>
            {statusLabels[effectiveStatus]}
          </StatusBadge>

          {/* Progress Bar - fills remaining space */}
          <div className="flex-1 flex items-center gap-2">
            <div className="flex-1 bg-muted rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full transition-all ${
                  progress >= 100 ? 'bg-success' : 'bg-primary'
                }`}
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
            <span className="text-[10px] text-muted-foreground w-8">{progress}%</span>
          </div>

          <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        </div>

        {/* Row 2: Amounts */}
        <div className="flex items-center justify-between text-xs">
          <div>
            <span className="text-muted-foreground">Prestado </span>
            <span className="font-semibold">{formatCurrency(loan.amountRequested)}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Pagado </span>
            <span className="font-semibold text-success">{formatCurrency(loan.totalPaid)}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Debe </span>
            <span className={cn(
              'font-semibold',
              loan.pendingDebt > 0 ? 'text-destructive' : 'text-success'
            )}>
              {formatCurrency(loan.pendingDebt)}
            </span>
          </div>
        </div>
      </div>
    </Card>
  )
}
