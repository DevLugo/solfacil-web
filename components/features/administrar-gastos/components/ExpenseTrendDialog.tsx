'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { TrendingUp, TrendingDown, Minus, ArrowUp, ArrowDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CategoryTrendData, TrendChartData } from '../types'
import { formatCurrency } from '../utils'

interface ExpenseTrendDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  categoryData: CategoryTrendData | null
  loading?: boolean
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ value: number; payload: TrendChartData }>
  label?: string
}) {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border bg-background p-3 shadow-md">
        <p className="font-medium">{payload[0]?.payload?.monthLabel}</p>
        <p className="text-lg font-bold" style={{ color: 'hsl(var(--primary))' }}>
          {formatCurrency(payload[0]?.value || 0)}
        </p>
      </div>
    )
  }
  return null
}

export function ExpenseTrendDialog({
  open,
  onOpenChange,
  categoryData,
  loading,
}: ExpenseTrendDialogProps) {
  if (!categoryData && !loading) return null

  const getTrendIcon = () => {
    if (!categoryData) return <Minus className="h-5 w-5" />
    if (categoryData.changePercentage > 5) return <TrendingUp className="h-5 w-5 text-red-500" />
    if (categoryData.changePercentage < -5) return <TrendingDown className="h-5 w-5 text-green-500" />
    return <Minus className="h-5 w-5 text-muted-foreground" />
  }

  const getTrendLabel = () => {
    if (!categoryData) return 'Sin cambio'
    if (categoryData.changePercentage > 5) return 'Incremento'
    if (categoryData.changePercentage < -5) return 'Reduccion'
    return 'Estable'
  }

  // Calculate average for reference line
  const average = categoryData
    ? categoryData.trend.reduce((sum, d) => sum + d.total, 0) / categoryData.trend.length
    : 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: categoryData?.color }}
            />
            {categoryData?.label || 'Cargando...'}
          </DialogTitle>
          <DialogDescription>
            Tendencia de gastos en los ultimos 6 meses
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
            </div>
            <Skeleton className="h-64" />
          </div>
        ) : categoryData ? (
          <div className="space-y-6">
            {/* Comparison Cards */}
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground mb-1">Mes Actual</p>
                  <p className="text-2xl font-bold">{formatCurrency(categoryData.currentMonth)}</p>
                  <div className="flex items-center gap-1 mt-2">
                    {categoryData.change > 0 ? (
                      <ArrowUp className="h-4 w-4 text-red-500" />
                    ) : categoryData.change < 0 ? (
                      <ArrowDown className="h-4 w-4 text-green-500" />
                    ) : (
                      <Minus className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span
                      className={cn(
                        'text-sm font-medium',
                        categoryData.change > 0
                          ? 'text-red-500'
                          : categoryData.change < 0
                            ? 'text-green-500'
                            : 'text-muted-foreground'
                      )}
                    >
                      {categoryData.change > 0 ? '+' : ''}
                      {formatCurrency(categoryData.change)}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground mb-1">Mes Anterior</p>
                  <p className="text-2xl font-bold">{formatCurrency(categoryData.previousMonth)}</p>
                  <div className="flex items-center gap-2 mt-2">
                    {getTrendIcon()}
                    <Badge
                      variant="secondary"
                      className={cn(
                        categoryData.changePercentage > 5
                          ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400'
                          : categoryData.changePercentage < -5
                            ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400'
                            : ''
                      )}
                    >
                      {categoryData.changePercentage > 0 ? '+' : ''}
                      {categoryData.changePercentage.toFixed(1)}%
                    </Badge>
                    <span className="text-sm text-muted-foreground">{getTrendLabel()}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Trend Chart */}
            <Card>
              <CardContent className="p-4">
                <p className="text-sm font-medium mb-4">Evolucion Mensual</p>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={categoryData.trend}
                      margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                          <stop
                            offset="5%"
                            stopColor={categoryData.color}
                            stopOpacity={0.3}
                          />
                          <stop
                            offset="95%"
                            stopColor={categoryData.color}
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis
                        dataKey="monthLabel"
                        tick={{ fontSize: 12 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        tickFormatter={(value) =>
                          new Intl.NumberFormat('es-MX', {
                            notation: 'compact',
                            compactDisplay: 'short',
                          }).format(value)
                        }
                        tick={{ fontSize: 12 }}
                        tickLine={false}
                        axisLine={false}
                        width={60}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <ReferenceLine
                        y={average}
                        stroke="hsl(var(--muted-foreground))"
                        strokeDasharray="5 5"
                        label={{
                          value: 'Promedio',
                          position: 'right',
                          fontSize: 11,
                          fill: 'hsl(var(--muted-foreground))',
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="total"
                        stroke={categoryData.color}
                        strokeWidth={2}
                        fill="url(#colorTotal)"
                        dot={{ fill: categoryData.color, strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, strokeWidth: 2 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-sm text-muted-foreground">Promedio Mensual</p>
                <p className="text-lg font-semibold">{formatCurrency(average)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Maximo</p>
                <p className="text-lg font-semibold">
                  {formatCurrency(Math.max(...categoryData.trend.map((d) => d.total)))}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Minimo</p>
                <p className="text-lg font-semibold">
                  {formatCurrency(Math.min(...categoryData.trend.filter((d) => d.total > 0).map((d) => d.total)) || 0)}
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
