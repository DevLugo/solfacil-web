'use client'

import { useState, useMemo } from 'react'
import {
  ChevronDown,
  ChevronUp,
  Wallet,
  Building2,
  DollarSign,
  Receipt,
  MapPin,
  ArrowDownCircle,
  ArrowUpCircle,
  HandCoins,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { LocalityCardProps, PaymentSummary, ExpenseSummary, LoanGrantedSummary } from '../types'

interface GroupedPayment {
  amount: number
  count: number
  total: number
  method: 'CASH' | 'MONEY_TRANSFER'
}

interface GroupedExpense {
  sourceLabel: string
  amount: number
  count: number
  total: number
}

interface GroupedLoan {
  amount: number
  count: number
  total: number
}

/**
 * Group payments by amount and method
 */
function groupPaymentsByAmount(payments: PaymentSummary[]): GroupedPayment[] {
  const grouped: Record<string, GroupedPayment> = {}

  for (const payment of payments) {
    const key = `${payment.amount}-${payment.paymentMethod}`
    if (!grouped[key]) {
      grouped[key] = {
        amount: payment.amount,
        count: 0,
        total: 0,
        method: payment.paymentMethod,
      }
    }
    grouped[key].count++
    grouped[key].total += payment.amount
  }

  return Object.values(grouped).sort((a, b) => b.total - a.total)
}

/**
 * Group expenses by source and amount
 */
function groupExpensesBySource(expenses: ExpenseSummary[]): GroupedExpense[] {
  const grouped: Record<string, GroupedExpense> = {}

  for (const expense of expenses) {
    const key = `${expense.sourceLabel}-${expense.amount}`
    if (!grouped[key]) {
      grouped[key] = {
        sourceLabel: expense.sourceLabel,
        amount: expense.amount,
        count: 0,
        total: 0,
      }
    }
    grouped[key].count++
    grouped[key].total += expense.amount
  }

  return Object.values(grouped).sort((a, b) => b.total - a.total)
}

/**
 * Group loans by amount
 */
function groupLoansByAmount(loans: LoanGrantedSummary[]): GroupedLoan[] {
  const grouped: Record<string, GroupedLoan> = {}

  for (const loan of loans) {
    const key = `${loan.amount}`
    if (!grouped[key]) {
      grouped[key] = {
        amount: loan.amount,
        count: 0,
        total: 0,
      }
    }
    grouped[key].count++
    grouped[key].total += loan.amount
  }

  return Object.values(grouped).sort((a, b) => b.total - a.total)
}

function GroupedPaymentRow({ group }: { group: GroupedPayment }) {
  const isCash = group.method === 'CASH'

  return (
    <div className="flex items-center justify-between py-2 border-b last:border-0">
      <div className="flex items-center gap-2">
        {isCash ? (
          <Wallet className="h-4 w-4 text-green-600" />
        ) : (
          <Building2 className="h-4 w-4 text-blue-600" />
        )}
        <span className="text-sm">
          <span className="font-medium">{group.count}</span>
          <span className="text-muted-foreground"> pagos de </span>
          <span className="font-medium">{formatCurrency(group.amount)}</span>
        </span>
      </div>
      <span className={cn(
        'text-sm font-semibold',
        isCash ? 'text-green-600' : 'text-blue-600'
      )}>
        {formatCurrency(group.total)}
      </span>
    </div>
  )
}

function GroupedExpenseRow({ group }: { group: GroupedExpense }) {
  return (
    <div className="flex items-center justify-between py-2 border-b last:border-0">
      <div className="flex items-center gap-2">
        <Receipt className="h-4 w-4 text-red-500" />
        <span className="text-sm">
          <span className="font-medium">{group.count}</span>
          <span className="text-muted-foreground"> x </span>
          <span className="font-medium">{group.sourceLabel}</span>
          <span className="text-muted-foreground"> ({formatCurrency(group.amount)})</span>
        </span>
      </div>
      <span className="text-sm font-semibold text-red-600">
        -{formatCurrency(group.total)}
      </span>
    </div>
  )
}

export function LocalityCard({ locality }: LocalityCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const hasPayments = locality.paymentCount > 0
  const hasExpenses = locality.expenses.length > 0
  const hasLoansGranted = locality.loansGrantedCount > 0
  const hasData = hasPayments || hasExpenses || hasLoansGranted

  const groupedPayments = useMemo(
    () => groupPaymentsByAmount(locality.payments),
    [locality.payments]
  )

  const groupedCashPayments = useMemo(
    () => groupPaymentsByAmount(locality.payments.filter(p => p.paymentMethod === 'CASH')),
    [locality.payments]
  )

  const groupedBankPayments = useMemo(
    () => groupPaymentsByAmount(locality.payments.filter(p => p.paymentMethod === 'MONEY_TRANSFER')),
    [locality.payments]
  )

  const groupedExpenses = useMemo(
    () => groupExpensesBySource(locality.expenses),
    [locality.expenses]
  )

  const groupedLoans = useMemo(
    () => groupLoansByAmount(locality.loansGranted),
    [locality.loansGranted]
  )

  // Use balances from API (no calculations in UI)
  const { balanceEfectivo, balanceBanco } = locality

  if (!hasData) {
    return null
  }

  return (
    <Card className="overflow-hidden">
      {/* Header - Collapsible */}
      <Button
        variant="ghost"
        className="w-full px-4 py-3 flex items-center justify-between h-auto hover:bg-muted/50 rounded-none"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center">
            <MapPin className="h-4 w-4 text-primary" />
          </div>
          <div className="text-left">
            <h3 className="text-sm font-semibold">
              {locality.localityName}
              {locality.leaderName && locality.leaderName !== 'Sin líder' && (
                <span className="font-normal text-muted-foreground ml-1.5">
                  ({locality.leaderName})
                </span>
              )}
            </h3>
            <p className="text-xs text-muted-foreground">
              {locality.paymentCount} abonos
              {hasLoansGranted && ` · ${locality.loansGrantedCount} créditos`}
              {hasExpenses && ` · ${locality.expenses.length} gastos`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Quick Stats - Balance Efectivo y Banco */}
          <div className="hidden sm:flex items-center gap-3 text-right">
            <div>
              <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                <Wallet className="h-3 w-3" />
                Efectivo
              </p>
              <p className={cn(
                'text-sm font-semibold',
                balanceEfectivo >= 0 ? 'text-green-600' : 'text-red-600'
              )}>
                {formatCurrency(balanceEfectivo)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                <Building2 className="h-3 w-3" />
                Banco
              </p>
              <p className="text-sm font-semibold text-blue-600">
                {formatCurrency(balanceBanco)}
              </p>
            </div>
          </div>

          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </Button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t bg-muted/20">
          {/* Summary Cards - Mobile and Desktop */}
          <div className="grid grid-cols-2 gap-3 py-3">
            {/* Balance Efectivo Card */}
            <div className="bg-background rounded-lg p-3 border">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Wallet className="h-3 w-3 text-green-600" />
                  Balance Efectivo
                </h4>
                <span className={cn(
                  'text-sm font-bold',
                  balanceEfectivo >= 0 ? 'text-green-600' : 'text-red-600'
                )}>
                  {formatCurrency(balanceEfectivo)}
                </span>
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">+ Cobranza</span>
                  <span className="text-green-600 font-medium">{formatCurrency(locality.cashPayments)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">- Comisión</span>
                  <span className="text-red-600 font-medium">-{formatCurrency(locality.totalCommissions)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">- Colocado</span>
                  <span className="text-red-600 font-medium">-{formatCurrency(locality.totalLoansGranted)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">- Gastos</span>
                  <span className="text-red-600 font-medium">-{formatCurrency(locality.totalExpenses)}</span>
                </div>
              </div>
            </div>

            {/* Balance Banco Card */}
            <div className="bg-background rounded-lg p-3 border">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Building2 className="h-3 w-3 text-blue-600" />
                  Balance Banco
                </h4>
                <span className="text-sm font-bold text-blue-600">
                  {formatCurrency(balanceBanco)}
                </span>
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">+ Abonos Banco</span>
                  <span className="text-blue-600 font-medium">{formatCurrency(locality.bankPayments)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Breakdown */}
          <div className="space-y-4 mt-2">
            {/* Loans Granted (Colocado) */}
            {hasLoansGranted && groupedLoans.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                  <ArrowDownCircle className="h-3 w-3 text-red-500" />
                  Créditos Otorgados (Colocado)
                </h4>
                <div className="bg-background rounded-lg px-3 py-1">
                  {groupedLoans.map((group, idx) => (
                    <div key={idx} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div className="flex items-center gap-2">
                        <HandCoins className="h-4 w-4 text-red-500" />
                        <span className="text-sm">
                          <span className="font-medium">{group.count}</span>
                          <span className="text-muted-foreground"> créditos de </span>
                          <span className="font-medium">{formatCurrency(group.amount)}</span>
                        </span>
                      </div>
                      <span className="text-sm font-semibold text-red-600">
                        -{formatCurrency(group.total)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Cash Payments (Cobranza Efectivo) */}
            {groupedCashPayments.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                  <Wallet className="h-3 w-3 text-green-600" />
                  Cobranza Efectivo
                </h4>
                <div className="bg-background rounded-lg px-3 py-1">
                  {groupedCashPayments.map((group, idx) => (
                    <GroupedPaymentRow key={idx} group={group} />
                  ))}
                </div>
              </div>
            )}

            {/* Bank Payments (Cobranza Banco) */}
            {groupedBankPayments.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                  <Building2 className="h-3 w-3 text-blue-600" />
                  Cobranza Banco
                </h4>
                <div className="bg-background rounded-lg px-3 py-1">
                  {groupedBankPayments.map((group, idx) => (
                    <GroupedPaymentRow key={idx} group={group} />
                  ))}
                </div>
              </div>
            )}

            {/* Commissions - Total + Breakdown */}
            {locality.totalCommissions > 0 && (
              <div className="pt-2 border-t">
                {/* Total de comisiones */}
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="flex items-center gap-1 font-medium">
                    <DollarSign className="h-3 w-3 text-red-500" />
                    Total Comisiones (pago a líder)
                  </span>
                  <span className="font-bold text-red-600">
                    -{formatCurrency(locality.totalCommissions)}
                  </span>
                </div>
                {/* Desglose de comisiones */}
                <div className="bg-background rounded-lg px-3 py-1 space-y-1">
                  {locality.totalPaymentCommissions > 0 && (
                    <div className="flex items-center justify-between py-1 text-xs border-b last:border-0">
                      <span className="text-muted-foreground">Por cobrar abonos</span>
                      <span className="font-medium text-red-600">
                        -{formatCurrency(locality.totalPaymentCommissions)}
                      </span>
                    </div>
                  )}
                  {locality.totalLoansGrantedCommissions > 0 && (
                    <div className="flex items-center justify-between py-1 text-xs border-b last:border-0">
                      <span className="text-muted-foreground">Por otorgar préstamos</span>
                      <span className="font-medium text-red-600">
                        -{formatCurrency(locality.totalLoansGrantedCommissions)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Expenses List */}
            {hasExpenses && groupedExpenses.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                  <Receipt className="h-3 w-3 text-red-500" />
                  Gastos
                </h4>
                <div className="bg-background rounded-lg px-3 py-1">
                  {groupedExpenses.map((group, idx) => (
                    <GroupedExpenseRow key={idx} group={group} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Balance Footer */}
          <div className="mt-4 pt-3 border-t flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Balance Total (Efectivo + Banco)</span>
            <span className={cn(
              'text-lg font-bold',
              (balanceEfectivo + balanceBanco) >= 0 ? 'text-green-600' : 'text-red-600'
            )}>
              {formatCurrency(balanceEfectivo + balanceBanco)}
            </span>
          </div>
        </div>
      )}
    </Card>
  )
}
