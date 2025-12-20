'use client'

import { useMemo } from 'react'
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
import {
  Bar,
  BarChart,
  Line,
  LineChart,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
} from 'recharts'
import { BarChart3 } from 'lucide-react'
import type { WeeklyPortfolioData } from '../hooks'
import { formatWeekLabelWithMonth, formatDateRange } from '../utils'

interface ClientBalanceChartProps {
  weeklyData: WeeklyPortfolioData[]
  periodType: 'WEEKLY' | 'MONTHLY'
}

export function ClientBalanceChart({ weeklyData, periodType }: ClientBalanceChartProps) {
  const chartData = useMemo(() => {
    return weeklyData.map((week) => ({
      label: formatWeekLabelWithMonth(week.weekRange.start),
      fullLabel: formatDateRange(week.weekRange.start, week.weekRange.end),
      clientesActivos: week.clientesActivos,
      clientesEnCV: week.clientesEnCV,
      balance: week.balance,
      // Only show "Pagando" for completed weeks
      alCorriente: week.isCompleted ? week.clientesActivos - week.clientesEnCV : null,
    }))
  }, [weeklyData])

  const clientsChartConfig: ChartConfig = {
    clientesActivos: {
      label: 'Clientes Activos',
      color: 'hsl(var(--chart-2))',
    },
    alCorriente: {
      label: 'Pagando',
      color: 'hsl(var(--chart-4))',
    },
    clientesEnCV: {
      label: 'En CV',
      color: 'hsl(var(--chart-6))',
    },
  }

  const balanceChartConfig: ChartConfig = {
    balance: {
      label: 'Balance',
      color: 'hsl(var(--chart-3))',
    },
  }

  if (weeklyData.length === 0) {
    return (
      <Card>
        <CardHeader className="px-3 sm:px-6 pt-3 sm:pt-6 pb-2 sm:pb-3">
          <CardTitle className="text-base sm:text-lg">Tendencia Semanal</CardTitle>
        </CardHeader>
        <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
          <div className="flex flex-col items-center justify-center py-6 sm:py-12 text-center">
            <BarChart3 className="h-8 w-8 sm:h-12 sm:w-12 text-muted-foreground/50 mb-2 sm:mb-4" />
            <h3 className="text-base sm:text-lg font-semibold">Sin datos semanales</h3>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Selecciona un período mensual
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
      {/* Clientes Activos, Pagando y CV Chart */}
      <Card>
        <CardHeader className="px-3 sm:px-6 pt-3 sm:pt-6 pb-2 sm:pb-3">
          <CardTitle className="text-base sm:text-lg">Estado de Clientes</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Evolución semanal: activos, pagando y CV
          </CardDescription>
        </CardHeader>
        <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
          <ChartContainer config={clientsChartConfig} className="min-h-[180px] sm:min-h-[250px] w-full">
            <BarChart data={chartData}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={(_, payload) => {
                      if (payload && payload[0]) {
                        return (payload[0].payload as { fullLabel: string }).fullLabel
                      }
                      return ''
                    }}
                  />
                }
              />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar
                dataKey="clientesActivos"
                fill="var(--color-clientesActivos)"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="alCorriente"
                fill="var(--color-alCorriente)"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="clientesEnCV"
                fill="var(--color-clientesEnCV)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Balance Trend Chart */}
      <Card>
        <CardHeader className="px-3 sm:px-6 pt-3 sm:pt-6 pb-2 sm:pb-3">
          <CardTitle className="text-base sm:text-lg">Balance de Clientes</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Ganancia/pérdida neta por semana
          </CardDescription>
        </CardHeader>
        <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
          <ChartContainer config={balanceChartConfig} className="min-h-[180px] sm:min-h-[250px] w-full">
            <LineChart data={chartData}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />
              <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={(_, payload) => {
                      if (payload && payload[0]) {
                        return (payload[0].payload as { fullLabel: string }).fullLabel
                      }
                      return ''
                    }}
                  />
                }
              />
              <Line
                type="monotone"
                dataKey="balance"
                stroke="var(--color-balance)"
                strokeWidth={2}
                dot={{ fill: 'var(--color-balance)', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  )
}
