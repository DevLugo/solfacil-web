'use client'

import { type LucideIcon, ChevronRight } from 'lucide-react'
import { cn, formatCurrency, formatNumber } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

interface KPICardProps {
  title: string
  value: number | string
  icon: LucideIcon
  deltaVsPreviousWeek?: number
  previousWeekLabel?: string
  variant?: 'default' | 'success' | 'danger' | 'warning'
  format?: 'number' | 'currency' | 'percent'
  subtitle?: string
  onViewMore?: () => void
  viewMoreLabel?: string
}

function formatValue(value: number | string, format: 'number' | 'currency' | 'percent' = 'number'): string {
  if (typeof value === 'string') return value

  const formatters = {
    currency: () => formatCurrency(value),
    percent: () => `${value.toFixed(1)}%`,
    number: () => formatNumber(value),
  }

  return formatters[format]()
}

export function KPICard({
  title,
  value,
  icon: Icon,
  deltaVsPreviousWeek,
  previousWeekLabel = 'sem. anterior',
  variant = 'default',
  format = 'number',
  subtitle,
  onViewMore,
  viewMoreLabel = 'Ver más',
}: KPICardProps) {
  const variantClasses = {
    default: 'bg-card border-border',
    success: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800',
    danger: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800',
    warning: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800',
  }

  const iconClasses = {
    default: 'text-muted-foreground',
    success: 'text-emerald-600 dark:text-emerald-400',
    danger: 'text-red-600 dark:text-red-400',
    warning: 'text-amber-600 dark:text-amber-400',
  }

  return (
    <div className={cn('rounded-xl border p-4 transition-all hover:shadow-md', variantClasses[variant])}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-muted-foreground">{title}</span>
        <Icon className={cn('h-5 w-5', iconClasses[variant])} />
      </div>

      <div className="space-y-2">
        <div className="text-3xl font-bold tracking-tight">
          {formatValue(value, format)}
        </div>

        {subtitle && (
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        )}

        {deltaVsPreviousWeek !== undefined && deltaVsPreviousWeek !== 0 && (
          <Badge
            variant="outline"
            className={cn(
              'text-xs font-medium',
              deltaVsPreviousWeek > 0
                ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700'
                : 'bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-400 border-red-300 dark:border-red-700'
            )}
          >
            {deltaVsPreviousWeek > 0 ? '+' : ''}{deltaVsPreviousWeek} vs {previousWeekLabel}
          </Badge>
        )}

        {onViewMore && (
          <button
            onClick={onViewMore}
            className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium mt-1 transition-colors"
          >
            {viewMoreLabel}
            <ChevronRight className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  )
}
