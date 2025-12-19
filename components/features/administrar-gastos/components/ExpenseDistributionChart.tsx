'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { Pie, PieChart, Cell, Legend, ResponsiveContainer } from 'recharts'
import type { ExpenseByRoute, ExpenseByAccount } from '../types'
import { CHART_COLORS } from '../constants'
import { formatCurrency } from '../utils'

interface ExpenseDistributionChartProps {
  byRoute: ExpenseByRoute[]
  byAccount: ExpenseByAccount[]
  loading?: boolean
}

function PieChartCard({
  title,
  description,
  data,
  loading,
}: {
  title: string
  description: string
  data: { name: string; value: number; fill: string; percentage: number }[]
  loading?: boolean
}) {
  const chartConfig = useMemo(() => {
    const config: ChartConfig = {}
    data.forEach((item) => {
      config[item.name] = {
        label: item.name,
        color: item.fill,
      }
    })
    return config
  }, [data])

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[250px] flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">Cargando...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[250px] flex items-center justify-center text-muted-foreground">
            No hay datos
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[250px] w-full">
          <PieChart>
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value, name, props) => {
                    const data = props.payload
                    return (
                      <div className="space-y-1">
                        <div className="font-medium">{formatCurrency(value as number)}</div>
                        <div className="text-xs text-muted-foreground">
                          {data.percentage.toFixed(1)}% del total
                        </div>
                      </div>
                    )
                  }}
                />
              }
            />
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={2}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
        <div className="mt-4 space-y-2">
          {data.slice(0, 5).map((item, index) => (
            <div key={index} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: item.fill }}
                />
                <span className="truncate max-w-[120px]">{item.name}</span>
              </div>
              <span className="font-medium">{item.percentage.toFixed(1)}%</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export function ExpenseDistributionChart({ byRoute, byAccount, loading }: ExpenseDistributionChartProps) {
  const routeData = useMemo(() => {
    return byRoute.slice(0, 6).map((item, index) => ({
      name: item.routeName,
      value: item.total,
      fill: CHART_COLORS[index % CHART_COLORS.length],
      percentage: item.percentage,
    }))
  }, [byRoute])

  const accountData = useMemo(() => {
    return byAccount.map((item, index) => ({
      name: item.label,
      value: item.total,
      fill: CHART_COLORS[index % CHART_COLORS.length],
      percentage: item.percentage,
    }))
  }, [byAccount])

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <PieChartCard
        title="Distribucion por Ruta"
        description="Gastos por ruta de operacion"
        data={routeData}
        loading={loading}
      />
      <PieChartCard
        title="Distribucion por Cuenta"
        description="Gastos por tipo de cuenta"
        data={accountData}
        loading={loading}
      />
    </div>
  )
}
