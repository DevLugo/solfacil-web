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
  Users,
  UserCheck,
  UserX,
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Info,
} from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { cn } from '@/lib/utils'
import type { PortfolioSummary, RenovationKPIs, Trend } from '../hooks'

interface PortfolioSummaryCardProps {
  summary: PortfolioSummary
  renovationKPIs: RenovationKPIs
}

function TrendIcon({ trend, className }: { trend: Trend; className?: string }) {
  if (trend === 'UP') {
    return <TrendingUp className={cn('h-4 w-4 text-green-600 dark:text-green-400', className)} />
  }
  if (trend === 'DOWN') {
    return <TrendingDown className={cn('h-4 w-4 text-red-600 dark:text-red-400', className)} />
  }
  return <Minus className={cn('h-4 w-4 text-muted-foreground', className)} />
}

type ValueType = 'promedio' | 'total' | 'porcentaje'

function ValueTypeBadge({ type }: { type: ValueType }) {
  const config = {
    promedio: { label: 'PROM', className: 'bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400' },
    total: { label: 'TOTAL', className: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400' },
    porcentaje: { label: '%', className: 'bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-400' },
  }

  return (
    <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 h-4 font-medium', config[type].className)}>
      {config[type].label}
    </Badge>
  )
}

function StatCard({
  title,
  value,
  icon: Icon,
  description,
  trend,
  change,
  variant = 'default',
  valueType,
}: {
  title: string
  value: number | string
  icon: React.ElementType
  description?: string
  trend?: Trend
  change?: number
  variant?: 'default' | 'success' | 'danger' | 'warning'
  valueType?: ValueType
}) {
  const variantClasses = {
    default: 'bg-muted/50',
    success: 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900',
    danger: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900',
    warning: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900',
  }

  const iconClasses = {
    default: 'text-muted-foreground',
    success: 'text-green-600 dark:text-green-400',
    danger: 'text-red-600 dark:text-red-400',
    warning: 'text-amber-600 dark:text-amber-400',
  }

  return (
    <div className={cn('rounded-lg border p-4', variantClasses[variant])}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={cn('h-5 w-5', iconClasses[variant])} />
          <span className="text-sm font-medium text-muted-foreground">{title}</span>
        </div>
        <div className="flex items-center gap-1">
          {valueType && <ValueTypeBadge type={valueType} />}
          {trend && <TrendIcon trend={trend} />}
        </div>
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-2xl font-bold">{value}</span>
        {change !== undefined && change !== 0 && (
          <Badge
            variant="outline"
            className={cn(
              'text-xs',
              change > 0
                ? 'bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-400 border-green-300'
                : 'bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-400 border-red-300'
            )}
          >
            {change > 0 ? '+' : ''}{change}
          </Badge>
        )}
      </div>
      {description && (
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  )
}

export function PortfolioSummaryCard({ summary, renovationKPIs }: PortfolioSummaryCardProps) {
  const cvPercentage = summary.totalClientesActivos > 0
    ? ((summary.clientesEnCV / summary.totalClientesActivos) * 100).toFixed(1)
    : '0'

  const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Resumen de Cartera</CardTitle>
        <CardDescription>
          Estado actual de clientes y cartera vencida
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Alert when no completed weeks */}
        {summary.semanasCompletadas === 0 && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              No hay semanas completadas en este período aún. El CV se calcula semanalmente
              (lunes a domingo) y se muestra el promedio de las semanas terminadas.
              Una vez termine la primera semana del mes, verás los datos de CV.
            </AlertDescription>
          </Alert>
        )}

        {/* Main Stats Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Clientes Activos"
            value={summary.totalClientesActivos}
            icon={Users}
            valueType="total"
            description="Con saldo pendiente"
          />
          <StatCard
            title="Al Corriente"
            value={summary.clientesAlCorriente}
            icon={UserCheck}
            variant="success"
            valueType="promedio"
            description="Promedio semanal del mes"
          />
          <StatCard
            title="En Cartera Vencida"
            value={summary.clientesEnCV}
            icon={UserX}
            variant="danger"
            valueType="promedio"
            description={
              summary.semanasCompletadas !== undefined && summary.semanasCompletadas === 0
                ? 'Sin semanas completadas aún'
                : summary.semanasCompletadas !== undefined
                  ? `Promedio de ${summary.semanasCompletadas} semana${summary.semanasCompletadas !== 1 ? 's' : ''} (${cvPercentage}%)`
                  : `Promedio semanal (${cvPercentage}%)`
            }
            change={summary.comparison?.cvChange}
          />
          <StatCard
            title="Tasa de Renovación"
            value={formatPercent(renovationKPIs.tasaRenovacion)}
            icon={RefreshCw}
            variant="warning"
            valueType="porcentaje"
            trend={renovationKPIs.tendencia}
          />
        </div>

        {/* Balance de Clientes */}
        <div className="rounded-lg border bg-muted/30 p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Balance de Clientes
            </h4>
            <ValueTypeBadge type="total" />
          </div>
          <div className="grid gap-4 sm:grid-cols-4">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-green-600 dark:text-green-400">
                <ArrowUpRight className="h-4 w-4" />
                <span className="text-xl font-bold">+{summary.clientBalance.nuevos}</span>
              </div>
              <p className="text-xs text-muted-foreground">Nuevos</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-red-600 dark:text-red-400">
                <ArrowDownRight className="h-4 w-4" />
                <span className="text-xl font-bold">-{summary.clientBalance.terminadosSinRenovar}</span>
              </div>
              <p className="text-xs text-muted-foreground">Sin Renovar</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-blue-600 dark:text-blue-400">
                <RefreshCw className="h-4 w-4" />
                <span className="text-xl font-bold">{summary.clientBalance.renovados}</span>
              </div>
              <p className="text-xs text-muted-foreground">Renovados</p>
            </div>
            <div className="text-center border-l">
              <div className={cn(
                'flex items-center justify-center gap-1',
                summary.clientBalance.balance >= 0
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
              )}>
                <TrendIcon trend={summary.clientBalance.trend} />
                <span className="text-xl font-bold">
                  {summary.clientBalance.balance >= 0 ? '+' : ''}{summary.clientBalance.balance}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">Balance Neto</p>
            </div>
          </div>
        </div>

        {/* Renovations KPIs */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border bg-green-50 dark:bg-green-950/30 p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Renovaciones</span>
              <Badge variant="secondary" className="bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300">
                {renovationKPIs.totalRenovaciones}
              </Badge>
            </div>
          </div>
          <div className="rounded-lg border bg-red-50 dark:bg-red-950/30 p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Cierres sin Renovar</span>
              <Badge variant="secondary" className="bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300">
                {renovationKPIs.totalCierresSinRenovar}
              </Badge>
            </div>
          </div>
        </div>

        {/* Comparison with Previous Period */}
        {summary.comparison && (
          <div className="rounded-lg border bg-slate-50 dark:bg-slate-900/50 p-4">
            <h4 className="text-sm font-semibold mb-3">Comparación con Período Anterior</h4>
            <div className="grid gap-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Clientes Activos (anterior)</span>
                <span>{summary.comparison.previousClientesActivos}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Clientes en CV (anterior)</span>
                <span>{summary.comparison.previousClientesEnCV}</span>
              </div>
              <div className="flex items-center justify-between border-t pt-2">
                <span className="text-muted-foreground">Cambio en CV</span>
                <Badge
                  variant="outline"
                  className={cn(
                    summary.comparison.cvChange > 0
                      ? 'bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-400'
                      : summary.comparison.cvChange < 0
                        ? 'bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-400'
                        : ''
                  )}
                >
                  {summary.comparison.cvChange > 0 ? '+' : ''}{summary.comparison.cvChange}
                </Badge>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
