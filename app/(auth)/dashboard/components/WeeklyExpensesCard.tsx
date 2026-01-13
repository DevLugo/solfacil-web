'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Receipt, Fuel, Users, Plane, MoreHorizontal } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'

interface ExpenseCategory {
  key: string
  label: string
  icon: React.ElementType
  amount: number
  previousAmount?: number
}

interface WeeklyExpensesCardProps {
  totalExpenses: number
  previousTotalExpenses?: number
  categories: {
    gasolina: number
    nomina: number
    viaticos: number
    otros: number
  }
  previousCategories?: {
    gasolina: number
    nomina: number
    viaticos: number
    otros: number
  }
}

function calculatePercentChange(current: number, previous: number): number | null {
  if (previous === 0) return null
  return ((current - previous) / previous) * 100
}

export function WeeklyExpensesCard({
  totalExpenses,
  previousTotalExpenses,
  categories,
  previousCategories,
}: WeeklyExpensesCardProps) {
  const expenseCategories: ExpenseCategory[] = [
    { key: 'gasolina', label: 'Gasolina', icon: Fuel, amount: categories.gasolina, previousAmount: previousCategories?.gasolina },
    { key: 'nomina', label: 'Nomina', icon: Users, amount: categories.nomina, previousAmount: previousCategories?.nomina },
    { key: 'viaticos', label: 'Viaticos', icon: Plane, amount: categories.viaticos, previousAmount: previousCategories?.viaticos },
    { key: 'otros', label: 'Otros', icon: MoreHorizontal, amount: categories.otros, previousAmount: previousCategories?.otros },
  ]

  const totalPercentChange = previousTotalExpenses
    ? calculatePercentChange(totalExpenses, previousTotalExpenses)
    : null

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Gastos de la Semana
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold">{formatCurrency(totalExpenses)}</span>
            {totalPercentChange !== null && (
              <Badge
                variant="outline"
                className={cn(
                  'text-xs',
                  totalPercentChange > 0
                    ? 'bg-red-100 text-red-700 border-red-300'
                    : totalPercentChange < 0
                    ? 'bg-emerald-100 text-emerald-700 border-emerald-300'
                    : ''
                )}
              >
                {totalPercentChange > 0 ? '+' : ''}{totalPercentChange.toFixed(0)}%
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {expenseCategories.map((category) => {
            const percentChange = category.previousAmount
              ? calculatePercentChange(category.amount, category.previousAmount)
              : null

            return (
              <div
                key={category.key}
                className="p-3 rounded-lg bg-muted/50 border"
              >
                <div className="flex items-center gap-2 mb-2">
                  <category.icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{category.label}</span>
                </div>
                <p className="text-lg font-bold">{formatCurrency(category.amount)}</p>
                {percentChange !== null && percentChange !== 0 && (
                  <Badge
                    variant="outline"
                    className={cn(
                      'mt-1 text-xs',
                      percentChange > 0
                        ? 'bg-red-100 text-red-700 border-red-300'
                        : 'bg-emerald-100 text-emerald-700 border-emerald-300'
                    )}
                  >
                    {percentChange > 0 ? '+' : ''}{percentChange.toFixed(0)}%
                  </Badge>
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
