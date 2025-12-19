'use client'

import { formatCurrency } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { StatCardProps } from '../types'

const gradients: Record<string, string> = {
  blue: 'bg-gradient-to-br from-blue-500 to-blue-600',
  purple: 'bg-gradient-to-br from-purple-500 to-purple-600',
  green: 'bg-gradient-to-br from-green-500 to-green-600',
  teal: 'bg-gradient-to-br from-teal-500 to-teal-600',
}

export function StatCard({ title, value, icon, gradient, subtitle, trend }: StatCardProps) {
  const gradientClass = gradients[gradient] || gradients.blue

  return (
    <Card className="p-4 hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5">
      <div className="flex items-start justify-between mb-3">
        <div
          className={cn(
            'w-10 h-10 rounded-lg flex items-center justify-center transition-transform hover:scale-110',
            gradientClass
          )}
        >
          {icon}
        </div>
        {trend && (
          <div
            className={cn(
              'px-2 py-0.5 rounded-full text-xs font-semibold',
              trend.isPositive
                ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
            )}
          >
            {trend.isPositive ? '↑' : '↓'} {trend.value}
          </div>
        )}
      </div>
      <h3 className="text-xs font-medium text-muted-foreground mb-1">{title}</h3>
      <p className="text-xl font-bold">{formatCurrency(value)}</p>
      {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
    </Card>
  )
}
