'use client'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from '@/components/ui/chart'
import {
  Bar,
  BarChart,
  Line,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts'
import { Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { WeeklyChartDataPoint, WeeklyComparisonData } from './types'

// Utility function to format currency without decimals
function formatCurrencyNoDecimals(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '$0'
  const numValue = typeof value === 'string' ? parseFloat(value) : value
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(numValue)
}

const monthNames = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const chartConfig: ChartConfig = {
  cobranza: {
    label: 'Cobranza',
    color: 'hsl(var(--chart-1))',
  },
  clientesPagaron: {
    label: 'Clientes que pagaron',
    color: 'hsl(var(--chart-3))',
  },
}

interface WeeklyActivityChartProps {
  data: WeeklyChartDataPoint[]
  comparison?: WeeklyComparisonData | null
}

export function WeeklyActivityChart({ data, comparison }: WeeklyActivityChartProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base sm:text-lg flex items-center gap-2">
          <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" />
          Actividad Semanal
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">Cobranza y pagos por semana</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <ChartContainer config={chartConfig} className="min-h-[180px] sm:min-h-[250px] w-full">
            <ComposedChart data={data} margin={{ left: 0, right: 40 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="week"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />
              <YAxis
                yAxisId="left"
                tickLine={false}
                axisLine={false}
                tickMargin={4}
                tickFormatter={(value) =>
                  value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value
                }
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tickLine={false}
                axisLine={false}
                tickMargin={4}
                domain={[0, 'auto']}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value, name) => {
                      if (name === 'cobranza') {
                        return [formatCurrencyNoDecimals(value as number), 'Cobranza']
                      }
                      return [value, 'Clientes que pagaron']
                    }}
                  />
                }
              />
              <Bar
                yAxisId="left"
                dataKey="cobranza"
                fill="var(--color-cobranza)"
                radius={[4, 4, 0, 0]}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="clientesPagaron"
                stroke="var(--color-clientesPagaron)"
                strokeWidth={3}
                dot={{ fill: 'var(--color-clientesPagaron)', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
              />
              <ChartLegend content={<ChartLegendContent />} />
            </ComposedChart>
          </ChartContainer>
        ) : (
          <div className="flex flex-col items-center justify-center h-[120px] sm:h-[180px] text-muted-foreground">
            <Calendar className="h-8 w-8 sm:h-12 sm:w-12 mb-2 sm:mb-4 opacity-50" />
            <p className="text-sm">Sin datos semanales</p>
          </div>
        )}

        {/* Weekly Comparison Summary */}
        {comparison && (
          <WeeklyComparisonSummary comparison={comparison} />
        )}
      </CardContent>
    </Card>
  )
}

// Sub-component for comparison summary
function WeeklyComparisonSummary({ comparison }: { comparison: WeeklyComparisonData }) {
  return (
    <div className="mt-4 pt-4 border-t">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold">
          Promedio Semanal ({comparison.currentWeeksCount} semana{comparison.currentWeeksCount !== 1 ? 's' : ''} completada{comparison.currentWeeksCount !== 1 ? 's' : ''})
        </h4>
        <Badge variant="outline" className="text-xs">
          vs {monthNames[comparison.prevMonthLabel - 1]}
        </Badge>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:gap-4">
        {/* Cobranza Promedio */}
        <div className="rounded-lg border p-2 sm:p-3 bg-muted/30">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
            <span className="text-[10px] sm:text-xs text-muted-foreground">Cobranza/Sem</span>
            {comparison.avgCobranzaChange !== 0 && (
              <Badge
                variant="outline"
                className={cn(
                  'text-[10px] sm:text-xs whitespace-nowrap self-start sm:self-auto',
                  comparison.avgCobranzaChange > 0
                    ? 'bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-400'
                    : 'bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-400'
                )}
              >
                {comparison.avgCobranzaChange > 0 ? '+' : ''}
                {comparison.avgCobranzaChange.toFixed(1)}%
              </Badge>
            )}
          </div>
          <p className="text-sm sm:text-lg font-bold mt-1">
            {formatCurrencyNoDecimals(comparison.currentAvgCobranza)}
          </p>
          <p className="text-[10px] sm:text-xs text-muted-foreground hidden sm:block">
            Anterior: {formatCurrencyNoDecimals(comparison.prevAvgCobranza)}
          </p>
        </div>

        {/* Clientes Promedio */}
        <div className="rounded-lg border p-2 sm:p-3 bg-muted/30">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
            <span className="text-[10px] sm:text-xs text-muted-foreground">Clientes/Sem</span>
            {comparison.avgClientesChange !== 0 && (
              <Badge
                variant="outline"
                className={cn(
                  'text-[10px] sm:text-xs whitespace-nowrap self-start sm:self-auto',
                  comparison.avgClientesChange > 0
                    ? 'bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-400'
                    : 'bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-400'
                )}
              >
                {comparison.avgClientesChange > 0 ? '+' : ''}
                {comparison.avgClientesChange.toFixed(1)}%
              </Badge>
            )}
          </div>
          <p className="text-sm sm:text-lg font-bold mt-1">
            {comparison.currentAvgClientes.toFixed(0)}
          </p>
          <p className="text-[10px] sm:text-xs text-muted-foreground hidden sm:block">
            Anterior: {comparison.prevAvgClientes.toFixed(0)}
          </p>
        </div>
      </div>

      {/* Monthly Totals Comparison */}
      <div className="mt-3 pt-3 border-t">
        <h4 className="text-xs font-medium text-muted-foreground mb-2">
          Acumulado del mes (semanas completadas)
        </h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex justify-between items-center">
            <span className="text-sm">Cobranza</span>
            <span className="text-sm font-bold">{formatCurrencyNoDecimals(comparison.currentTotalCobranza)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm">Pagos</span>
            <span className="text-sm font-bold">{comparison.currentTotalClientes}</span>
          </div>
        </div>
        <div className="mt-1 text-xs text-muted-foreground">
          {monthNames[comparison.prevMonthLabel - 1]} completo: {formatCurrencyNoDecimals(comparison.prevTotalCobranza)} / {comparison.prevTotalClientes} pagos
        </div>
      </div>
    </div>
  )
}
