'use client'

import { useMemo } from 'react'
import { ShieldCheck } from 'lucide-react'
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
  isCollateral?: boolean
}

export function PaymentHistoryModal({ loan, isOpen, onClose, isCollateral = false }: PaymentHistoryModalProps) {
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

  // Helper to extract payment count from description like "Pago #1 (1/2)"
  const extractPaymentCount = (description: string): number | null => {
    if (!description.includes('/')) return null
    const match = description.match(/\((\d+)\/(\d+)\)/)
    return match ? parseInt(match[2], 10) : null
  }

  // Get row styles based on coverage type and payment count
  const getRowStyles = (item: PaymentChronologyItem): string => {
    // Priority 1: Multiple payments in same week
    const paymentCount = extractPaymentCount(item.description)
    if (item.type === 'PAYMENT' && paymentCount && paymentCount >= 2) {
      return 'bg-info/5 border-l-4 border-l-info'
    }

    // Priority 2: NO_PAYMENT items
    if (item.type === 'NO_PAYMENT') {
      return item.coverageType
        ? coverageRowStyles[item.coverageType] || ''
        : 'bg-destructive/5 border-l-4 border-l-destructive'
    }

    // Priority 3: Overpaid (weeklyPaid >= expectedWeekly × 1.5)
    if (item.weeklyPaid !== undefined && item.weeklyExpected &&
        item.weeklyPaid >= item.weeklyExpected * 1.5) {
      return 'bg-success/5 border-l-4 border-l-success'
    }

    // Priority 4: Use coverage type for PAYMENT items
    if (item.coverageType === 'FULL') return ''
    if (item.coverageType) return coverageRowStyles[item.coverageType] || ''

    // Fallback: Calculate based on amount
    if (item.amount && expectedWeekly > 0) {
      if (item.amount >= expectedWeekly * 1.5) return 'bg-success/5 border-l-4 border-l-success'
      if (item.amount >= expectedWeekly) return ''
      if (item.amount > 0) return 'bg-warning/5 border-l-4 border-l-warning'
    }

    return 'bg-destructive/5 border-l-4 border-l-destructive'
  }

  // Get badge text for multiple payments in same week
  const getBadgeText = (item: PaymentChronologyItem): string | null => {
    const count = extractPaymentCount(item.description)
    return count && count >= 2 ? `${count}x` : null
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] p-0 overflow-hidden flex flex-col">
        <DialogHeader className="p-4 pb-2 border-b bg-muted/30 flex-shrink-0">
          <DialogTitle className="text-base flex items-center gap-2">
            Historial de Pagos
            {isCollateral && (
              <span className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded font-medium bg-warning/20 text-warning border border-warning/40">
                <ShieldCheck className="h-3 w-3" />
                Como Aval
              </span>
            )}
          </DialogTitle>
          <div className="text-xs text-muted-foreground">
            {isCollateral && loan.clientName && (
              <p className="font-medium text-foreground mb-0.5">
                Titular: {loan.clientName}
              </p>
            )}
            <p>{loan.signDateFormatted} • {loan.weekDuration} semanas</p>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 overflow-auto">
          <div className="p-3 md:p-4">
            {/* Loan Summary */}
            <div className="grid grid-cols-4 gap-1.5 mb-2">
              <div className="flex items-center gap-1.5 p-2 rounded-lg bg-muted/50">
                <div className="min-w-0">
                  <div className="text-xs font-bold text-success truncate">{formatCurrency(loan.amountRequested)}</div>
                  <div className="text-[10px] text-muted-foreground">prestado</div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 p-2 rounded-lg bg-muted/50">
                <div className="min-w-0">
                  <div className="text-xs font-bold truncate">{formatCurrency(loan.totalAmountDue)}</div>
                  <div className="text-[10px] text-muted-foreground">deuda</div>
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

            {/* Interest rate and weeks info */}
            <div className="flex items-center justify-center gap-3 text-[10px] text-muted-foreground mb-3">
              <span>Interés: <span className="font-medium text-foreground">{Math.round(loan.rate * 100)}%</span></span>
              <span>•</span>
              <span><span className="font-medium text-foreground">{loan.weekDuration}</span> semanas</span>
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
                          {item.weekIndex === 0 ? '0' : (item.paymentNumber || item.weekIndex || idx + 1)}
                        </TableCell>
                        <TableCell className="px-2 py-1.5">
                          <div className="flex items-center gap-1">
                            <span className="whitespace-nowrap">{item.dateFormatted}</span>
                            {badgeText && (
                              <span className="text-[8px] font-bold text-info">{badgeText}</span>
                            )}
                          </div>
                          {item.weekIndex === 0 && item.type === 'PAYMENT' && (
                            <div className="text-[10px] text-success mt-0.5">
                              Adelanto
                            </div>
                          )}
                          {isNoPayment && (
                            <div className="text-[10px] text-muted-foreground mt-0.5">
                              {item.coverageType === 'COVERED_BY_SURPLUS' ? 'Cubierto' : 'Falta'}
                              {item.weekCount && item.weekCount > 1 && (
                                <span className="ml-1 text-[9px] opacity-75">
                                  ({item.weekCount} sem.)
                                </span>
                              )}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right px-2 py-1.5 font-medium">
                          {isNoPayment ? (
                            item.surplusBefore && Number(item.surplusBefore) > 0 ? (
                              <span className="text-info text-[10px]">
                                +{formatCurrency(item.surplusBefore)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground italic">-</span>
                            )
                          ) : (
                            <>
                              <span>{formatCurrency(item.amount || 0)}</span>
                              {item.surplusAfter !== undefined && Number(item.surplusAfter) > 0 && (
                                <div className="text-[9px] text-info font-normal">
                                  +{formatCurrency(item.surplusAfter)}
                                </div>
                              )}
                            </>
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
