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
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { LocalityCardProps, PaymentSummary, ExpenseSummary } from '../types'

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
  const hasData = hasPayments || hasExpenses

  const groupedPayments = useMemo(
    () => groupPaymentsByAmount(locality.payments),
    [locality.payments]
  )

  const groupedExpenses = useMemo(
    () => groupExpensesBySource(locality.expenses),
    [locality.expenses]
  )

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
              {hasExpenses && ` · ${locality.expenses.length} gastos`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Quick Stats */}
          <div className="hidden sm:flex items-center gap-3 text-right">
            <div>
              <p className="text-xs text-muted-foreground">Efectivo</p>
              <p className="text-sm font-semibold text-green-600">
                {formatCurrency(locality.cashPayments)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Banco</p>
              <p className="text-sm font-semibold text-blue-600">
                {formatCurrency(locality.bankPayments)}
              </p>
            </div>
            <div className="pl-2 border-l">
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-sm font-bold">
                {formatCurrency(locality.totalPayments)}
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
          {/* Summary Cards - Mobile */}
          <div className="grid grid-cols-4 gap-2 py-3 sm:hidden">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Efectivo</p>
              <p className="text-sm font-semibold text-green-600">
                {formatCurrency(locality.cashPayments)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Banco</p>
              <p className="text-sm font-semibold text-blue-600">
                {formatCurrency(locality.bankPayments)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Comisión</p>
              <p className="text-sm font-semibold text-purple-600">
                {formatCurrency(locality.totalCommissions)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-sm font-bold">
                {formatCurrency(locality.totalPayments)}
              </p>
            </div>
          </div>

          {/* Payments List */}
          {hasPayments && groupedPayments.length > 0 && (
            <div className="mt-3">
              <h4 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                <Wallet className="h-3 w-3" />
                Abonos Recibidos
              </h4>
              <div className="bg-background rounded-lg px-3 py-1">
                {groupedPayments.map((group, idx) => (
                  <GroupedPaymentRow key={idx} group={group} />
                ))}
              </div>
              {locality.totalCommissions > 0 && (
                <div className="flex items-center justify-between mt-2 pt-2 border-t text-sm">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <DollarSign className="h-3 w-3" />
                    Comisiones totales
                  </span>
                  <span className="font-semibold text-purple-600">
                    {formatCurrency(locality.totalCommissions)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Expenses List */}
          {hasExpenses && groupedExpenses.length > 0 && (
            <div className="mt-4">
              <h4 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                <Receipt className="h-3 w-3" />
                Gastos
              </h4>
              <div className="bg-background rounded-lg px-3 py-1">
                {groupedExpenses.map((group, idx) => (
                  <GroupedExpenseRow key={idx} group={group} />
                ))}
              </div>
            </div>
          )}

          {/* Balance Footer */}
          <div className="mt-4 pt-3 border-t flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Balance neto</span>
            <span className={cn(
              'text-lg font-bold',
              locality.balance >= 0 ? 'text-green-600' : 'text-red-600'
            )}>
              {formatCurrency(locality.balance)}
            </span>
          </div>
        </div>
      )}
    </Card>
  )
}
