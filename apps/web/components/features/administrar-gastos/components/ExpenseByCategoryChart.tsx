'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, Cell, LabelList } from 'recharts'
import type { ExpenseByCategory } from '../types'
import { formatCurrency, formatCurrencyCompact } from '../utils'

interface ExpenseByCategoryChartProps {
  data: ExpenseByCategory[]
  loading?: boolean
  onCategoryClick?: (category: string) => void
}

export function ExpenseByCategoryChart({ data, loading, onCategoryClick }: ExpenseByCategoryChartProps) {
  // Take top 10 categories for better visualization
  const chartData = useMemo(() => {
    return data.slice(0, 10).map((item) => ({
      category: item.label,
      categoryKey: item.category,
      total: item.total,
      count: item.count,
      percentage: item.percentage,
      fill: item.color,
    }))
  }, [data])

  const handleBarClick = (data: { categoryKey: string }) => {
    if (onCategoryClick && data.categoryKey) {
      onCategoryClick(data.categoryKey)
    }
  }

  const chartConfig = useMemo(() => {
    const config: ChartConfig = {}
    chartData.forEach((item) => {
      config[item.category] = {
        label: item.category,
        color: item.fill,
      }
    })
    return config
  }, [chartData])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Gastos por Categoria</CardTitle>
          <CardDescription>Ranking de categorias con mayor gasto</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">Cargando...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Gastos por Categoria</CardTitle>
          <CardDescription>Ranking de categorias con mayor gasto</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] flex items-center justify-center text-muted-foreground">
            No hay datos para mostrar
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gastos por Categoria</CardTitle>
        <CardDescription>
          Top {chartData.length} categorias con mayor gasto del mes
          {onCategoryClick && (
            <span className="text-xs ml-1">(click para ver tendencia)</span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[400px] w-full">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 10, right: 80, bottom: 10, left: 10 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              horizontal={true}
              vertical={false}
              className="stroke-muted"
            />
            <XAxis
              type="number"
              tickFormatter={formatCurrencyCompact}
              axisLine={false}
              tickLine={false}
              className="text-xs"
            />
            <YAxis
              type="category"
              dataKey="category"
              width={120}
              axisLine={false}
              tickLine={false}
              className="text-xs"
            />
            <ChartTooltip
              cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }}
              content={
                <ChartTooltipContent
                  formatter={(value, name, props) => {
                    const data = props.payload
                    return (
                      <div className="space-y-1">
                        <div className="font-medium">{formatCurrency(value as number)}</div>
                        <div className="text-xs text-muted-foreground">
                          {data.count} gastos ({data.percentage.toFixed(1)}%)
                        </div>
                      </div>
                    )
                  }}
                />
              }
            />
            <Bar
              dataKey="total"
              radius={[0, 4, 4, 0]}
              maxBarSize={32}
              onClick={(data) => handleBarClick(data)}
              className={onCategoryClick ? 'cursor-pointer' : ''}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.fill}
                  className={onCategoryClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}
                />
              ))}
              <LabelList
                dataKey="total"
                position="right"
                formatter={formatCurrencyCompact}
                className="fill-foreground text-xs font-medium"
              />
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
