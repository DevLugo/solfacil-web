'use client'

import { ChevronRight, ShieldCheck } from 'lucide-react'
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

export function LoanCard({ loan, isCollateral = false, onToggleExpand }: LoanCardProps) {
  const progress = loan.totalAmountDue > 0
    ? Math.round((loan.totalPaid / loan.totalAmountDue) * 100)
    : 0

  // Determine status and renewal separately
  const effectiveStatus = mapApiStatus(loan.status)
  const wasRenewed = loan.wasRenewed === true

  // Determine border color based on loan type
  const getBorderClass = () => {
    if (loan.isDeceased) return 'border-l-violet-500'
    if (isCollateral) return 'border-l-warning'
    return 'border-l-success' // Titular siempre tiene borde verde
  }

  return (
    <Card
      className={cn(
        'cursor-pointer hover:bg-muted transition-colors border-l-2',
        getBorderClass(),
        loan.isDeceased && 'bg-violet-500/5',
        isCollateral && !loan.isDeceased && 'bg-warning/5',
        !isCollateral && !loan.isDeceased && 'bg-success/5'
      )}
      onClick={onToggleExpand}
    >
      <div className="p-2.5">
        {/* Row 1: Date, Role badge, Status, Renewed badge, Deceased badge, Progress */}
        <div className="flex items-center gap-2 mb-2 overflow-hidden">
          {isCollateral && (
            <span className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded font-medium bg-warning/20 text-warning border border-warning/40 flex-shrink-0">
              <ShieldCheck className="h-3 w-3" />
              Aval
            </span>
          )}
          <div className="text-xs font-medium flex-shrink-0">{loan.signDateFormatted}</div>
          <StatusBadge variant={statusToBadgeVariant[effectiveStatus]} className="flex-shrink-0">
            {statusLabels[effectiveStatus]}
          </StatusBadge>
          {wasRenewed && (
            <StatusBadge variant="info" className="flex-shrink-0">
              Renovado
            </StatusBadge>
          )}
          {loan.isDeceased && (
            <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-violet-500/20 text-violet-700 dark:text-violet-300 border border-violet-500/40 flex-shrink-0">
              † Fallecido
            </span>
          )}

          {/* Progress Bar - fills remaining space */}
          <div className="flex-1 flex items-center gap-2 min-w-0">
            <div className="flex-1 bg-muted rounded-full h-1.5 min-w-0">
              <div
                className={`h-1.5 rounded-full transition-all ${
                  progress >= 100 ? 'bg-success' : 'bg-primary'
                }`}
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
            <span className="text-[10px] text-muted-foreground w-8 flex-shrink-0">{progress}%</span>
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

        {/* Row 3: Aval info (for loans as client) or Titular info (for loans as collateral) */}
        {isCollateral && loan.clientName && (
          <div className="mt-1.5 pt-1.5 border-t text-xs text-muted-foreground">
            <span>Titular: </span>
            <span className="font-medium text-foreground">{loan.clientName}</span>
          </div>
        )}
        {!isCollateral && loan.avalName && (
          <div className="mt-1.5 pt-1.5 border-t text-xs text-muted-foreground">
            <span>Aval: </span>
            <span className="font-medium text-foreground">{loan.avalName}</span>
          </div>
        )}
      </div>
    </Card>
  )
}
