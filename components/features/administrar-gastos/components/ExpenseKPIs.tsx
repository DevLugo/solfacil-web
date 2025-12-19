'use client'

import { Card, CardContent } from '@/components/ui/card'
import {
  TrendingUp,
  TrendingDown,
  Minus,
  DollarSign,
  Calculator,
  Calendar,
  Trophy,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatCurrency } from '../utils'
import type { ExpenseKPIsData } from '../types'

interface ExpenseKPIsProps {
  kpis: ExpenseKPIsData
  loading?: boolean
}

function KPICard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendValue,
  trendLabel,
  className,
}: {
  title: string
  value: string
  subtitle?: string
  icon: React.ComponentType<{ className?: string }>
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
  trendLabel?: string
  className?: string
}) {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus
  const trendColor = trend === 'up'
    ? 'text-red-600 dark:text-red-400' // Expenses going up is bad
    : trend === 'down'
      ? 'text-green-600 dark:text-green-400' // Expenses going down is good
      : 'text-muted-foreground'

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
            <p className="text-2xl font-bold tracking-tight">{value}</p>
            {subtitle && (
              <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
            )}
            {trend && trendValue && (
              <div className={cn('flex items-center gap-1 mt-2 text-sm', trendColor)}>
                <TrendIcon className="h-4 w-4" />
                <span className="font-medium">{trendValue}</span>
                {trendLabel && <span className="text-muted-foreground">{trendLabel}</span>}
              </div>
            )}
          </div>
          <div className="p-3 bg-primary/10 rounded-lg">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function ExpenseKPIs({ kpis, loading }: ExpenseKPIsProps) {
  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-3">
                <div className="h-4 w-24 bg-muted rounded" />
                <div className="h-8 w-32 bg-muted rounded" />
                <div className="h-4 w-20 bg-muted rounded" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const trend = kpis.monthOverMonthChange > 0
    ? 'up'
    : kpis.monthOverMonthChange < 0
      ? 'down'
      : 'neutral'

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <KPICard
        title="Total del Mes"
        value={formatCurrency(kpis.totalExpenses)}
        subtitle={`${kpis.totalCount} transacciones`}
        icon={DollarSign}
        trend={trend}
        trendValue={`${kpis.monthOverMonthPercentage > 0 ? '+' : ''}${kpis.monthOverMonthPercentage.toFixed(1)}%`}
        trendLabel="vs mes anterior"
      />

      <KPICard
        title="Promedio por Gasto"
        value={formatCurrency(kpis.averagePerExpense)}
        subtitle={`De ${kpis.totalCount} gastos`}
        icon={Calculator}
      />

      <KPICard
        title="Promedio Diario"
        value={formatCurrency(kpis.dailyAverage)}
        subtitle="Por dia del mes"
        icon={Calendar}
      />

      <KPICard
        title="Categoria Principal"
        value={kpis.topCategory}
        subtitle={`${formatCurrency(kpis.topCategoryAmount)} (${kpis.topCategoryPercentage.toFixed(1)}%)`}
        icon={Trophy}
      />
    </div>
  )
}
