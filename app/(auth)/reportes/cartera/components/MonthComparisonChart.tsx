'use client'

import { useState, useMemo } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Bar,
  BarChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts'
import { TrendingUp, TrendingDown, Minus, CalendarDays, BarChart3, LineChartIcon, RefreshCw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface MonthData {
  label: string // "Dic 2025"
  clientesActivosInicio?: number // Clientes al inicio del mes
  clientesActivos: number // Clientes al final del mes
  alCorrientePromedio: number
  cvPromedio: number
  renovaciones: number
  nuevos: number
  reintegros: number // Clientes que regresan después de pagar completamente
  tasaRenovacion?: number
}

export interface AnnualMonthData {
  month: number // 1-12
  year: number
  label: string // "Ene", "Feb", etc.
  clientesActivos: number
  alCorrientePromedio: number
  cvPromedio: number
  renovaciones: number
  nuevos: number
  reintegros: number
  balance: number
  tasaRenovacion?: number
}

interface MonthComparisonChartProps {
  currentMonth: MonthData
  previousMonth: MonthData | null
  annualData?: AnnualMonthData[]
  loading?: boolean
}

type ViewMode = 'comparison' | 'annual'

const MONTH_NAMES = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
]

export function formatMonthLabel(month: number, year: number): string {
  return `${MONTH_NAMES[month - 1]} ${year}`
}

function calculateChange(current: number, previous: number | undefined): {
  value: number
  percentage: number
  trend: 'up' | 'down' | 'stable'
} {
  if (previous === undefined || previous === 0) {
    return { value: 0, percentage: 0, trend: 'stable' }
  }
  const value = current - previous
  const percentage = ((current - previous) / previous) * 100
  return {
    value,
    percentage,
    trend: value > 0 ? 'up' : value < 0 ? 'down' : 'stable',
  }
}

function TrendIndicator({
  change,
  inverted = false,
}: {
  change: { value: number; percentage: number; trend: 'up' | 'down' | 'stable' }
  inverted?: boolean // For CV, up is bad
}) {
  const isPositive = inverted ? change.trend === 'down' : change.trend === 'up'
  const isNegative = inverted ? change.trend === 'up' : change.trend === 'down'

  if (change.trend === 'stable') {
    return (
      <div className="flex items-center gap-1 text-muted-foreground">
        <Minus className="h-3 w-3" />
        <span className="text-xs">Sin cambio</span>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex items-center gap-1 text-xs',
        isPositive && 'text-green-600 dark:text-green-400',
        isNegative && 'text-red-600 dark:text-red-400'
      )}
    >
      {change.trend === 'up' ? (
        <TrendingUp className="h-3 w-3" />
      ) : (
        <TrendingDown className="h-3 w-3" />
      )}
      <span>
        {change.value > 0 ? '+' : ''}
        {change.value.toFixed(1)} ({Math.abs(change.percentage).toFixed(0)}%)
      </span>
    </div>
  )
}

// Mini Sparkline Chart Component
function Sparkline({
  data,
  dataKey,
  color,
  height = 40,
  inverted = false,
}: {
  data: Array<{ label: string; value: number }>
  dataKey: string
  color: string
  height?: number
  inverted?: boolean // For CV, lower is better (green)
}) {
  if (!data || data.length < 2) return null

  const values = data.map((d) => d.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const lastValue = values[values.length - 1]
  const firstValue = values[0]
  const isUp = lastValue > firstValue

  // Determine gradient color based on trend
  const gradientId = `gradient-${dataKey}-${Math.random().toString(36).substr(2, 9)}`
  const trendColor = inverted
    ? (isUp ? 'rgb(239, 68, 68)' : 'rgb(34, 197, 94)')  // red if up, green if down
    : (isUp ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)')  // green if up, red if down

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={color} stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

// Comparison View Component - Compact KPI-focused design with sparklines
function ComparisonView({
  currentMonth,
  previousMonth,
  changes,
  annualData,
}: {
  currentMonth: MonthData
  previousMonth: MonthData | null
  changes: {
    activos: ReturnType<typeof calculateChange>
    alCorriente: ReturnType<typeof calculateChange>
    cv: ReturnType<typeof calculateChange>
    renovaciones: ReturnType<typeof calculateChange>
    nuevos: ReturnType<typeof calculateChange>
    reintegros: ReturnType<typeof calculateChange>
    tasaRenovacion: ReturnType<typeof calculateChange>
  } | null
  annualData?: AnnualMonthData[]
}) {
  // Prepare sparkline data for each metric
  const sparklineData = useMemo(() => {
    if (!annualData || annualData.length < 2) return null
    return {
      activos: annualData.map((d) => ({ label: d.label, value: d.clientesActivos })),
      alCorriente: annualData.map((d) => ({ label: d.label, value: d.alCorrientePromedio })),
      cv: annualData.map((d) => ({ label: d.label, value: d.cvPromedio })),
      renovaciones: annualData.map((d) => ({ label: d.label, value: d.renovaciones })),
      nuevos: annualData.map((d) => ({ label: d.label, value: d.nuevos })),
      reintegros: annualData.map((d) => ({ label: d.label, value: d.reintegros })),
      tasaRenovacion: annualData.map((d) => ({ label: d.label, value: (d.tasaRenovacion ?? 0) * 100 })),
    }
  }, [annualData])

  const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`

  return (
    <div className="grid gap-2 sm:gap-3 grid-cols-2 lg:grid-cols-3">
      {/* Clientes Activos - Mostrando Inicio y Final del mes */}
      <div className="rounded-lg border bg-muted/30 p-3 sm:p-4">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">Clientes Activos</p>
          <Badge variant="outline" className="text-[10px] sm:text-xs shrink-0">Total</Badge>
        </div>
        <div className="flex items-end justify-between gap-2 sm:gap-4">
          <div className="min-w-0">
            {/* Mostrar inicio y final del mes si son diferentes */}
            <div className="flex items-baseline gap-2">
              {typeof currentMonth.clientesActivosInicio === 'number' &&
               currentMonth.clientesActivosInicio !== currentMonth.clientesActivos && (
                <>
                  <p className="text-xl sm:text-3xl font-bold">
                    {currentMonth.clientesActivosInicio}
                  </p>
                  <span className="text-xl sm:text-3xl text-muted-foreground">→</span>
                </>
              )}
              <p className="text-xl sm:text-3xl font-bold">{currentMonth.clientesActivos}</p>
            </div>
            {typeof currentMonth.clientesActivosInicio === 'number' &&
             currentMonth.clientesActivosInicio !== currentMonth.clientesActivos && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Inicio → Final del mes
              </p>
            )}
            {previousMonth && changes && (
              <div className="mt-1 flex flex-wrap items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                <span className="text-muted-foreground hidden sm:inline">{previousMonth.label}: {previousMonth.clientesActivos}</span>
                <TrendIndicator change={changes.activos} />
              </div>
            )}
          </div>
          {sparklineData && (
            <div className="w-16 sm:w-24 flex-shrink-0 hidden sm:block">
              <Sparkline data={sparklineData.activos} dataKey="activos" color="hsl(var(--primary))" height={48} />
            </div>
          )}
        </div>
      </div>

      {/* Al Corriente */}
      <div className="rounded-lg border bg-green-50/50 dark:bg-green-950/20 border-green-200 dark:border-green-900 p-3 sm:p-4">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">Al Corriente</p>
          <Badge variant="outline" className="text-[10px] sm:text-xs bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400 border-green-300 shrink-0">
            Prom
          </Badge>
        </div>
        <div className="flex items-end justify-between gap-2 sm:gap-4">
          <div className="min-w-0">
            <p className="text-xl sm:text-3xl font-bold text-green-600 dark:text-green-400">
              {(currentMonth.alCorrientePromedio ?? 0).toFixed(1)}
            </p>
            {previousMonth && changes && (
              <div className="mt-1 flex flex-wrap items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                <span className="text-muted-foreground hidden sm:inline">{previousMonth.label}: {(previousMonth.alCorrientePromedio ?? 0).toFixed(1)}</span>
                <TrendIndicator change={changes.alCorriente} />
              </div>
            )}
          </div>
          {sparklineData && (
            <div className="w-16 sm:w-24 flex-shrink-0 hidden sm:block">
              <Sparkline data={sparklineData.alCorriente} dataKey="alCorriente" color="rgb(34, 197, 94)" height={48} />
            </div>
          )}
        </div>
      </div>

      {/* En CV */}
      <div className="rounded-lg border bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-900 p-3 sm:p-4">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">Cartera Vencida</p>
          <Badge variant="outline" className="text-[10px] sm:text-xs bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-400 border-red-300 shrink-0">
            Prom
          </Badge>
        </div>
        <div className="flex items-end justify-between gap-2 sm:gap-4">
          <div className="min-w-0">
            <p className="text-xl sm:text-3xl font-bold text-red-600 dark:text-red-400">
              {(currentMonth.cvPromedio ?? 0).toFixed(1)}
            </p>
            {previousMonth && changes && (
              <div className="mt-1 flex flex-wrap items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                <span className="text-muted-foreground hidden sm:inline">{previousMonth.label}: {(previousMonth.cvPromedio ?? 0).toFixed(1)}</span>
                <TrendIndicator change={changes.cv} inverted />
              </div>
            )}
          </div>
          {sparklineData && (
            <div className="w-16 sm:w-24 flex-shrink-0 hidden sm:block">
              <Sparkline data={sparklineData.cv} dataKey="cv" color="rgb(239, 68, 68)" height={48} inverted />
            </div>
          )}
        </div>
      </div>

      {/* Renovaciones */}
      <div className="rounded-lg border bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900 p-3 sm:p-4">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">Renovaciones</p>
          <Badge variant="outline" className="text-[10px] sm:text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400 border-blue-300 shrink-0">
            Total
          </Badge>
        </div>
        <div className="flex items-end justify-between gap-2 sm:gap-4">
          <div className="min-w-0">
            <p className="text-xl sm:text-3xl font-bold text-blue-600 dark:text-blue-400">{currentMonth.renovaciones}</p>
            {previousMonth && changes && (
              <div className="mt-1 flex flex-wrap items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                <span className="text-muted-foreground hidden sm:inline">{previousMonth.label}: {previousMonth.renovaciones}</span>
                <TrendIndicator change={changes.renovaciones} />
              </div>
            )}
          </div>
          {sparklineData && (
            <div className="w-16 sm:w-24 flex-shrink-0 hidden sm:block">
              <Sparkline data={sparklineData.renovaciones} dataKey="renovaciones" color="rgb(59, 130, 246)" height={48} />
            </div>
          )}
        </div>
      </div>

      {/* Clientes Nuevos */}
      <div className="rounded-lg border bg-purple-50/50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-900 p-3 sm:p-4">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">Nuevos</p>
          <Badge variant="outline" className="text-[10px] sm:text-xs bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-400 border-purple-300 shrink-0">
            Total
          </Badge>
        </div>
        <div className="flex items-end justify-between gap-2 sm:gap-4">
          <div className="min-w-0">
            <p className="text-xl sm:text-3xl font-bold text-purple-600 dark:text-purple-400">{currentMonth.nuevos}</p>
            {previousMonth && changes && (
              <div className="mt-1 flex flex-wrap items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                <span className="text-muted-foreground hidden sm:inline">{previousMonth.label}: {previousMonth.nuevos}</span>
                <TrendIndicator change={changes.nuevos} />
              </div>
            )}
          </div>
          {sparklineData && (
            <div className="w-16 sm:w-24 flex-shrink-0 hidden sm:block">
              <Sparkline data={sparklineData.nuevos} dataKey="nuevos" color="rgb(147, 51, 234)" height={48} />
            </div>
          )}
        </div>
      </div>

      {/* Reintegros - Clientes que regresan después de pagar */}
      <div className="rounded-lg border bg-teal-50/50 dark:bg-teal-950/20 border-teal-200 dark:border-teal-900 p-3 sm:p-4">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">Reintegros</p>
          <Badge variant="outline" className="text-[10px] sm:text-xs bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-400 border-teal-300 shrink-0">
            Total
          </Badge>
        </div>
        <div className="flex items-end justify-between gap-2 sm:gap-4">
          <div className="min-w-0">
            <p className="text-xl sm:text-3xl font-bold text-teal-600 dark:text-teal-400">{currentMonth.reintegros}</p>
            {previousMonth && changes && (
              <div className="mt-1 flex flex-wrap items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                <span className="text-muted-foreground hidden sm:inline">{previousMonth.label}: {previousMonth.reintegros}</span>
                <TrendIndicator change={changes.reintegros} />
              </div>
            )}
          </div>
          {sparklineData && (
            <div className="w-16 sm:w-24 flex-shrink-0 hidden sm:block">
              <Sparkline data={sparklineData.reintegros} dataKey="reintegros" color="rgb(20, 184, 166)" height={48} />
            </div>
          )}
        </div>
      </div>

      {/* Tasa de Renovación */}
      <div className="rounded-lg border bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900 p-3 sm:p-4">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">Tasa Renov.</p>
          <Badge variant="outline" className="text-[10px] sm:text-xs bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400 border-amber-300 shrink-0">
            %
          </Badge>
        </div>
        <div className="flex items-end justify-between gap-2 sm:gap-4">
          <div className="min-w-0">
            <p className="text-xl sm:text-3xl font-bold text-amber-600 dark:text-amber-400">
              {formatPercent(currentMonth.tasaRenovacion ?? 0)}
            </p>
            {previousMonth && changes && (
              <div className="mt-1 flex flex-wrap items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                <span className="text-muted-foreground hidden sm:inline">{previousMonth.label}: {formatPercent(previousMonth.tasaRenovacion ?? 0)}</span>
                <TrendIndicator change={changes.tasaRenovacion} />
              </div>
            )}
          </div>
          {sparklineData && sparklineData.tasaRenovacion.some((d) => d.value > 0) && (
            <div className="w-16 sm:w-24 flex-shrink-0 hidden sm:block">
              <Sparkline data={sparklineData.tasaRenovacion} dataKey="tasaRenovacion" color="rgb(245, 158, 11)" height={48} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Metric options for the annual trends view
type AnnualMetric = 'cartera' | 'crecimiento' | 'balance'

const ANNUAL_METRIC_CONFIG: Record<AnnualMetric, {
  label: string
  description: string
  chartConfig: ChartConfig
  dataKeys: string[]
}> = {
  cartera: {
    label: 'Cartera',
    description: 'Clientes activos y CV promedio',
    chartConfig: {
      clientesActivos: {
        label: 'Activos',
        color: 'hsl(var(--chart-1))',
      },
      cvPromedio: {
        label: 'CV (Prom.)',
        color: 'hsl(var(--chart-6))',
      },
    },
    dataKeys: ['clientesActivos', 'cvPromedio'],
  },
  crecimiento: {
    label: 'Crecimiento',
    description: 'Nuevos clientes y renovaciones',
    chartConfig: {
      nuevos: {
        label: 'Nuevos',
        color: 'hsl(var(--chart-4))',
      },
      renovaciones: {
        label: 'Renovaciones',
        color: 'hsl(var(--chart-3))',
      },
    },
    dataKeys: ['nuevos', 'renovaciones'],
  },
  balance: {
    label: 'Balance',
    description: 'Balance neto mensual',
    chartConfig: {
      balance: {
        label: 'Balance',
        color: 'hsl(var(--chart-2))',
      },
    },
    dataKeys: ['balance'],
  },
}

// Annual Trends View Component
function AnnualTrendsView({
  annualData,
}: {
  annualData: AnnualMonthData[]
  currentMonth: MonthData
}) {
  const [selectedMetric, setSelectedMetric] = useState<AnnualMetric>('cartera')
  const metricConfig = ANNUAL_METRIC_CONFIG[selectedMetric]

  // Calculate year-over-year changes
  const firstMonth = annualData[0]
  const lastMonth = annualData[annualData.length - 1]

  const yearStats = useMemo(() => {
    if (!firstMonth || !lastMonth) return null

    return {
      activos: {
        start: firstMonth.clientesActivos,
        end: lastMonth.clientesActivos,
        change: lastMonth.clientesActivos - firstMonth.clientesActivos,
      },
      cv: {
        start: firstMonth.cvPromedio,
        end: lastMonth.cvPromedio,
        change: lastMonth.cvPromedio - firstMonth.cvPromedio,
      },
      totalNuevos: annualData.reduce((sum, d) => sum + d.nuevos, 0),
      totalRenovaciones: annualData.reduce((sum, d) => sum + d.renovaciones, 0),
      balanceTotal: annualData.reduce((sum, d) => sum + d.balance, 0),
    }
  }, [annualData, firstMonth, lastMonth])

  return (
    <div className="space-y-4">
      {/* Year Summary Stats */}
      {yearStats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg border p-3 bg-muted/30">
            <p className="text-xs text-muted-foreground">Activos</p>
            <p className="text-lg font-bold">{yearStats.activos.end}</p>
            <p className={cn(
              'text-xs',
              yearStats.activos.change > 0 ? 'text-green-600' : yearStats.activos.change < 0 ? 'text-red-600' : 'text-muted-foreground'
            )}>
              {yearStats.activos.change > 0 ? '+' : ''}{yearStats.activos.change} vs inicio
            </p>
          </div>
          <div className="rounded-lg border p-3 bg-red-50 dark:bg-red-950/20">
            <p className="text-xs text-muted-foreground">CV Prom.</p>
            <p className="text-lg font-bold text-red-600">{yearStats.cv.end.toFixed(1)}</p>
            <p className={cn(
              'text-xs',
              yearStats.cv.change < 0 ? 'text-green-600' : yearStats.cv.change > 0 ? 'text-red-600' : 'text-muted-foreground'
            )}>
              {yearStats.cv.change > 0 ? '+' : ''}{yearStats.cv.change.toFixed(1)} vs inicio
            </p>
          </div>
          <div className="rounded-lg border p-3 bg-blue-50 dark:bg-blue-950/20">
            <p className="text-xs text-muted-foreground">Nuevos (año)</p>
            <p className="text-lg font-bold text-blue-600">{yearStats.totalNuevos}</p>
            <p className="text-xs text-muted-foreground">
              ~{(yearStats.totalNuevos / annualData.length).toFixed(0)}/mes
            </p>
          </div>
          <div className={cn(
            'rounded-lg border p-3',
            yearStats.balanceTotal >= 0 ? 'bg-green-50 dark:bg-green-950/20' : 'bg-red-50 dark:bg-red-950/20'
          )}>
            <p className="text-xs text-muted-foreground">Balance (año)</p>
            <p className={cn(
              'text-lg font-bold',
              yearStats.balanceTotal >= 0 ? 'text-green-600' : 'text-red-600'
            )}>
              {yearStats.balanceTotal > 0 ? '+' : ''}{yearStats.balanceTotal}
            </p>
            <p className="text-xs text-muted-foreground">
              clientes neto
            </p>
          </div>
        </div>
      )}

      {/* Metric Selector */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Ver:</span>
        <div className="flex gap-1">
          {(Object.keys(ANNUAL_METRIC_CONFIG) as AnnualMetric[]).map((metric) => (
            <button
              key={metric}
              onClick={() => setSelectedMetric(metric)}
              className={cn(
                'px-3 py-1.5 text-sm rounded-md transition-colors',
                selectedMetric === metric
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/80'
              )}
            >
              {ANNUAL_METRIC_CONFIG[metric].label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Chart */}
      <div>
        <p className="text-xs text-muted-foreground mb-2">
          {metricConfig.description}
        </p>
        <ChartContainer config={metricConfig.chartConfig} className="min-h-[180px] sm:min-h-[220px] w-full">
          <BarChart data={annualData} margin={{ left: -10, right: 10 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              fontSize={12}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={4}
              fontSize={11}
              width={40}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => `${value} ${annualData[0]?.year || ''}`}
                />
              }
            />
            <ChartLegend content={<ChartLegendContent />} />
            {metricConfig.dataKeys.map((key, index) => (
              <Bar
                key={key}
                dataKey={key}
                fill={`var(--color-${key})`}
                radius={[4, 4, 0, 0]}
                barSize={metricConfig.dataKeys.length === 1 ? 32 : 16}
              />
            ))}
          </BarChart>
        </ChartContainer>
      </div>

      {/* Monthly Table Summary */}
      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Mes</th>
              <th className="px-3 py-2 text-right font-medium">Activos</th>
              <th className="px-3 py-2 text-right font-medium">CV</th>
              <th className="px-3 py-2 text-right font-medium">Nuevos</th>
              <th className="px-3 py-2 text-right font-medium">Balance</th>
            </tr>
          </thead>
          <tbody>
            {annualData.map((d, i) => (
              <tr key={d.month} className={i % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                <td className="px-3 py-2 font-medium">{d.label}</td>
                <td className="px-3 py-2 text-right">{d.clientesActivos}</td>
                <td className="px-3 py-2 text-right text-red-600">{d.cvPromedio.toFixed(1)}</td>
                <td className="px-3 py-2 text-right text-blue-600">{d.nuevos}</td>
                <td className={cn(
                  'px-3 py-2 text-right font-medium',
                  d.balance > 0 ? 'text-green-600' : d.balance < 0 ? 'text-red-600' : ''
                )}>
                  {d.balance > 0 ? '+' : ''}{d.balance}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function MonthComparisonChart({
  currentMonth,
  previousMonth,
  annualData,
  loading = false,
}: MonthComparisonChartProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('comparison')

  // Calculate changes for summary badges
  const changes = useMemo(() => {
    if (!previousMonth) return null
    return {
      activos: calculateChange(currentMonth.clientesActivos ?? 0, previousMonth.clientesActivos),
      alCorriente: calculateChange(currentMonth.alCorrientePromedio ?? 0, previousMonth.alCorrientePromedio),
      cv: calculateChange(currentMonth.cvPromedio ?? 0, previousMonth.cvPromedio),
      renovaciones: calculateChange(currentMonth.renovaciones ?? 0, previousMonth.renovaciones),
      nuevos: calculateChange(currentMonth.nuevos ?? 0, previousMonth.nuevos),
      reintegros: calculateChange(currentMonth.reintegros ?? 0, previousMonth.reintegros ?? 0),
      tasaRenovacion: calculateChange((currentMonth.tasaRenovacion ?? 0) * 100, (previousMonth.tasaRenovacion ?? 0) * 100),
    }
  }, [currentMonth, previousMonth])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Análisis Mensual
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="rounded-lg border bg-muted/30 p-4 animate-pulse">
                <div className="flex justify-between mb-2">
                  <div className="h-4 bg-muted rounded w-24" />
                  <div className="h-4 bg-muted rounded w-12" />
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <div className="h-8 bg-muted rounded w-20 mb-2" />
                    <div className="h-3 bg-muted rounded w-28" />
                  </div>
                  <div className="h-12 w-24 bg-muted rounded" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  const hasAnnualData = annualData && annualData.length > 1

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              Análisis Mensual
            </CardTitle>
            <CardDescription>
              {viewMode === 'comparison'
                ? `${currentMonth.label} vs ${previousMonth?.label ?? 'Sin datos anteriores'}`
                : `Tendencias del año ${annualData?.[0]?.year ?? ''}`}
            </CardDescription>
          </div>

          {/* View Toggle */}
          {hasAnnualData && (
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
              <TabsList>
                <TabsTrigger value="comparison" className="flex items-center gap-1.5">
                  <BarChart3 className="h-4 w-4" />
                  <span className="hidden sm:inline">Comparación</span>
                </TabsTrigger>
                <TabsTrigger value="annual" className="flex items-center gap-1.5">
                  <LineChartIcon className="h-4 w-4" />
                  <span className="hidden sm:inline">Tendencias</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {viewMode === 'comparison' ? (
          <ComparisonView
            currentMonth={currentMonth}
            previousMonth={previousMonth}
            changes={changes}
            annualData={annualData}
          />
        ) : hasAnnualData ? (
          <AnnualTrendsView annualData={annualData!} currentMonth={currentMonth} />
        ) : (
          <div className="flex flex-col items-center justify-center py-6 sm:py-12 text-center">
            <LineChartIcon className="h-8 w-8 sm:h-12 sm:w-12 text-muted-foreground/50 mb-2 sm:mb-4" />
            <h3 className="text-base sm:text-lg font-semibold">Sin datos anuales</h3>
            <p className="text-xs sm:text-sm text-muted-foreground">
              No hay suficientes datos para mostrar tendencias
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
