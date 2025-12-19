'use client'

import { useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { formatCurrency, formatDate, generatePaymentChronology } from '../utils'
import { paymentLegendItems, coverageRowStyles } from '../constants'
import type { LoanHistoryDetail, PaymentChronologyItem } from '../types'

interface PaymentHistoryModalProps {
  loan: LoanHistoryDetail
  isOpen: boolean
  onClose: () => void
}

export function PaymentHistoryModal({ loan, isOpen, onClose }: PaymentHistoryModalProps) {
  // Generate payment chronology with week-by-week analysis
  const chronology = useMemo((): PaymentChronologyItem[] => {
    return generatePaymentChronology({
      signDate: loan.signDate,
      finishedDate: loan.finishedDate,
      status: loan.status,
      wasRenewed: loan.wasRenewed,
      amountGived: loan.amountRequested,
      profitAmount: loan.interestAmount,
      totalAmountDue: loan.totalAmountDue,
      weekDuration: loan.weekDuration,
      payments: loan.payments.map((p) => ({
        id: p.id,
        receivedAt: p.receivedAt,
        receivedAtFormatted: p.receivedAtFormatted,
        amount: p.amount,
        paymentMethod: p.paymentMethod,
        balanceBeforePayment: p.balanceBeforePayment,
        balanceAfterPayment: p.balanceAfterPayment,
        paymentNumber: p.paymentNumber,
      })),
    })
  }, [loan])

  // Calculate expected weekly payment
  const expectedWeekly = loan.weekDuration > 0 ? loan.totalAmountDue / loan.weekDuration : 0

  // Get row styles based on coverage type and payment count
  const getRowStyles = (item: PaymentChronologyItem): string => {
    // Priority 1: Multiple payments in the same week (2 or more)
    if (item.type === 'PAYMENT' && item.description.includes('/')) {
      const match = item.description.match(/\((\d+)\/(\d+)\)/)
      if (match) {
        const total = parseInt(match[2], 10)
        if (total >= 2) {
          return 'bg-info/5 border-l-4 border-l-info'
        }
      }
    }

    // Priority 2: NO_PAYMENT items - use coverage type directly
    if (item.type === 'NO_PAYMENT') {
      if (item.coverageType) {
        return coverageRowStyles[item.coverageType] || ''
      }
      return 'bg-destructive/5 border-l-4 border-l-destructive' // Default: MISS
    }

    // Priority 3: PAYMENT items - check weeklyPaid for overpaid
    if (item.type === 'PAYMENT' && item.weeklyPaid !== undefined && item.weeklyExpected) {
      // Overpaid: weeklyPaid >= expectedWeekly × 1.5
      if (item.weeklyPaid >= item.weeklyExpected * 1.5) {
        return 'bg-success/5 border-l-4 border-l-success'
      }
    }

    // Priority 4: Use coverage type for styling
    if (item.coverageType) {
      // FULL coverage: normal payment (no special style)
      if (item.coverageType === 'FULL') {
        return '' // Normal full payment (no special style)
      }
      // Other coverage types use their styles
      return coverageRowStyles[item.coverageType] || ''
    }

    // Fallback: Calculate based on amount if no coverage type or weeklyPaid
    if (item.type === 'PAYMENT' && item.amount && expectedWeekly > 0) {
      if (item.amount >= expectedWeekly * 1.5) {
        return 'bg-success/5 border-l-4 border-l-success' // Overpaid
      }
      if (item.amount >= expectedWeekly) {
        return '' // Normal full payment
      }
      if (item.amount > 0) {
        return 'bg-warning/5 border-l-4 border-l-warning' // Partial
      }
    }

    // Default: Missed payment
    return 'bg-destructive/5 border-l-4 border-l-destructive'
  }

  // Get badge text for multiple payments in same week
  const getBadgeText = (item: PaymentChronologyItem): string | null => {
    if (item.type === 'PAYMENT' && item.description.includes('/')) {
      // Extract count from description like "Pago #1 (1/2)" or "Pago #2 (2/2)"
      const match = item.description.match(/\((\d+)\/(\d+)\)/)
      if (match) {
        const total = parseInt(match[2], 10)
        return total >= 2 ? `${total}x` : null
      }
    }
    return null
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] p-0 overflow-hidden flex flex-col">
        <DialogHeader className="p-4 pb-2 border-b bg-muted/30 flex-shrink-0">
          <DialogTitle className="text-base">
            Historial de Pagos
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            {loan.signDateFormatted} • {loan.weekDuration} semanas
          </p>
        </DialogHeader>

        <ScrollArea className="flex-1 overflow-auto">
          <div className="p-3 md:p-4">
            {/* Loan Summary - Match outside cards style */}
            <div className="grid grid-cols-4 gap-1.5 mb-3">
              <div className="flex items-center gap-1.5 p-2 rounded-lg bg-muted/50">
                <div className="min-w-0">
                  <div className="text-xs font-bold text-success truncate">{formatCurrency(loan.amountRequested)}</div>
                  <div className="text-[10px] text-muted-foreground">prestado</div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 p-2 rounded-lg bg-muted/50">
                <div className="min-w-0">
                  <div className="text-xs font-bold truncate">{formatCurrency(loan.totalAmountDue)}</div>
                  <div className="text-[10px] text-muted-foreground">total</div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 p-2 rounded-lg bg-muted/50">
                <div className="min-w-0">
                  <div className="text-xs font-bold text-success truncate">{formatCurrency(loan.totalPaid)}</div>
                  <div className="text-[10px] text-muted-foreground">pagado</div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 p-2 rounded-lg bg-muted/50">
                <div className="min-w-0">
                  <div className={cn(
                    'text-xs font-bold truncate',
                    loan.pendingDebt > 0 ? 'text-destructive' : 'text-success'
                  )}>
                    {formatCurrency(loan.pendingDebt)}
                  </div>
                  <div className="text-[10px] text-muted-foreground">debe</div>
                </div>
              </div>
            </div>

            {/* Legend - Compact inline */}
            <div className="flex flex-wrap gap-1.5 mb-3 text-[9px]">
              {paymentLegendItems.map((item) => (
                <span key={item.label} className={cn('px-1.5 py-0.5 rounded', item.style)}>
                  {item.label}
                </span>
              ))}
            </div>

            {/* Payment Table - Compact for mobile */}
            <div className="border rounded-lg overflow-hidden">
              <Table className="text-xs">
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-8 px-2 py-1.5 text-xs">#</TableHead>
                    <TableHead className="px-2 py-1.5 text-xs">Fecha</TableHead>
                    <TableHead className="text-right px-2 py-1.5 text-xs">Pagado</TableHead>
                    <TableHead className="text-right px-2 py-1.5 text-xs">Deuda</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {chronology.map((item, idx) => {
                    const badgeText = getBadgeText(item)
                    const isNoPayment = item.type === 'NO_PAYMENT'

                    return (
                      <TableRow
                        key={item.id}
                        className={cn(getRowStyles(item), 'text-xs')}
                      >
                        <TableCell className="font-medium text-muted-foreground px-2 py-1.5">
                          {item.paymentNumber || item.weekIndex || idx + 1}
                        </TableCell>
                        <TableCell className="px-2 py-1.5">
                          <div className="flex items-center gap-1">
                            <span className="whitespace-nowrap">{item.dateFormatted}</span>
                            {badgeText && (
                              <span className="text-[8px] font-bold text-info">{badgeText}</span>
                            )}
                          </div>
                          {isNoPayment && (
                            <div className="text-[10px] text-muted-foreground mt-0.5">
                              {item.description}
                              {item.weekCount && item.weekCount > 1 && (
                                <span className="ml-1 text-[9px] opacity-75">
                                  ({item.weekCount} semanas)
                                </span>
                              )}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right px-2 py-1.5 font-medium">
                          {isNoPayment ? (
                            <span className="text-muted-foreground italic">-</span>
                          ) : (
                            formatCurrency(item.amount || 0)
                          )}
                        </TableCell>
                        <TableCell className="text-right px-2 py-1.5 font-medium">
                          {item.balanceAfter !== undefined ? (
                            <span
                              className={cn(
                                item.balanceAfter === 0
                                  ? 'text-success'
                                  : 'text-destructive'
                              )}
                            >
                              {formatCurrency(item.balanceAfter)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Empty state if no payments */}
            {chronology.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                Sin pagos registrados
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
