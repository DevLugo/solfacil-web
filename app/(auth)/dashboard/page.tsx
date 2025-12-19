'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@apollo/client'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  ResponsiveContainer,
} from 'recharts'
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Users,
  Receipt,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  MapPin,
  RefreshCw,
  Building2,
  UserCheck,
  UserX,
  Minus,
  LayoutDashboard,
  PlusCircle,
  Skull,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTransactionContext } from '@/components/features/transactions/transaction-context'
import { ROUTES_QUERY } from '@/graphql/queries/transactions'
import { useCEODashboard, type Trend } from './hooks'
import { RecoveredDeadDebtModal } from '@/components/features/recovered-dead-debt'

// Utility function to format currency
function formatCurrency(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '$0'
  const numValue = typeof value === 'string' ? parseFloat(value) : value
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(numValue)
}

// Format relative time
function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 60) return `Hace ${diffMins} min`
  if (diffHours < 24) return `Hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`
  return `Hace ${diffDays} dia${diffDays > 1 ? 's' : ''}`
}

// Trend icon component
function TrendIcon({ trend, className }: { trend: Trend; className?: string }) {
  if (trend === 'UP') {
    return <TrendingUp className={cn('h-4 w-4 text-green-600 dark:text-green-400', className)} />
  }
  if (trend === 'DOWN') {
    return <TrendingDown className={cn('h-4 w-4 text-red-600 dark:text-red-400', className)} />
  }
  return <Minus className={cn('h-4 w-4 text-muted-foreground', className)} />
}

// Stat card component similar to cartera reports
function StatCard({
  title,
  value,
  icon: Icon,
  description,
  change,
  variant = 'default',
}: {
  title: string
  value: number | string
  icon: React.ElementType
  description?: string
  change?: number
  variant?: 'default' | 'success' | 'danger' | 'warning' | 'info'
}) {
  const variantClasses = {
    default: 'bg-muted/50',
    success: 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900',
    danger: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900',
    warning: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900',
    info: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900',
  }

  const iconClasses = {
    default: 'text-muted-foreground',
    success: 'text-green-600 dark:text-green-400',
    danger: 'text-red-600 dark:text-red-400',
    warning: 'text-amber-600 dark:text-amber-400',
    info: 'text-blue-600 dark:text-blue-400',
  }

  return (
    <div className={cn('rounded-lg border p-4', variantClasses[variant])}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={cn('h-5 w-5', iconClasses[variant])} />
          <span className="text-sm font-medium text-muted-foreground">{title}</span>
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

// Dashboard Skeleton component
function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-9 w-48 mb-2" />
        <Skeleton className="h-5 w-80" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-80" />
        <Skeleton className="h-80" />
      </div>
    </div>
  )
}

interface Route {
  id: string
  name: string
}

export default function DashboardPage() {
  const { selectedRouteId, setSelectedRouteId } = useTransactionContext()
  const [showRecoveredDeadDebtModal, setShowRecoveredDeadDebtModal] = useState(false)
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  // First, fetch all routes
  const { data: routesData, loading: routesLoading } = useQuery<{ routes: Route[] }>(ROUTES_QUERY)
  const allRouteIds = routesData?.routes?.map((r) => r.id) || []

  // CEO Dashboard hook
  const {
    stats,
    portfolioStats,
    renovationKPIs,
    weeklyData,
    weeklyComparison,
    accounts,
    transactions,
    newLocations,
    topLocations,
    recoveredDeadDebt,
    loading,
    error,
    refetch,
  } = useCEODashboard({
    year: currentYear,
    month: currentMonth,
    selectedRouteId,
    allRouteIds,
  })

  // Handle route selection change
  const handleRouteChange = (value: string) => {
    if (value === 'all') {
      setSelectedRouteId(null)
    } else {
      setSelectedRouteId(value)
    }
  }

  // Weekly chart data
  const weeklyChartData = useMemo(() => {
    return weeklyData.map((w) => ({
      week: `S${w.week}`,
      cobranza: parseFloat(w.paymentsReceived || '0'),
      clientesPagaron: w.paymentsCount || 0,
    }))
  }, [weeklyData])

  const weeklyChartConfig: ChartConfig = {
    cobranza: {
      label: 'Cobranza',
      color: 'hsl(var(--chart-1))',
    },
    clientesPagaron: {
      label: 'Clientes que pagaron',
      color: 'hsl(var(--chart-3))',
    },
  }

  // Show loading while fetching routes
  if (routesLoading || (loading && !stats)) {
    return (
      <div className="space-y-6 p-6">
        <DashboardSkeleton />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center p-6">
        <div className="rounded-full bg-destructive/10 p-6 mb-4">
          <TrendingDown className="h-12 w-12 text-destructive" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Error al cargar datos</h2>
        <p className="text-muted-foreground max-w-md">{error.message}</p>
      </div>
    )
  }

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ]

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <LayoutDashboard className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard CEO</h1>
            <p className="text-muted-foreground">
              {monthNames[currentMonth - 1]} {currentYear}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Route Selector */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span className="hidden sm:inline">Ruta:</span>
          </div>
          <Select value={selectedRouteId || 'all'} onValueChange={handleRouteChange}>
            <SelectTrigger className="w-[200px] bg-background">
              <SelectValue placeholder="Seleccionar ruta" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span className="font-medium">Todas las rutas</span>
                </div>
              </SelectItem>
              {routesData?.routes?.map((route) => (
                <SelectItem key={route.id} value={route.id}>
                  {route.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </Button>
        </div>
      </div>

      {/* Portfolio KPIs - Main Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" />
            Resumen de Cartera
          </CardTitle>
          <CardDescription>Estado actual de clientes activos</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Clientes Activos"
              value={portfolioStats?.totalClientesActivos ?? stats?.activeLoans ?? 0}
              icon={Users}
              description="Con saldo pendiente"
            />
            <StatCard
              title="Al Corriente"
              value={portfolioStats?.clientesAlCorriente ?? stats?.activeLoansBreakdown?.alCorriente ?? 0}
              icon={UserCheck}
              variant="success"
              description="Promedio semanal"
            />
            <StatCard
              title="Cartera Vencida"
              value={portfolioStats?.clientesEnCV ?? stats?.activeLoansBreakdown?.carteraVencida ?? 0}
              icon={UserX}
              variant="danger"
              change={portfolioStats?.comparison?.cvChange}
              description={
                portfolioStats?.semanasCompletadas
                  ? `Promedio de ${portfolioStats.semanasCompletadas} semana${portfolioStats.semanasCompletadas !== 1 ? 's' : ''}`
                  : 'Sin semanas completadas'
              }
            />
            <StatCard
              title="Tasa de Renovacion"
              value={renovationKPIs ? `${(renovationKPIs.tasaRenovacion * 100).toFixed(1)}%` : '0%'}
              icon={RefreshCw}
              variant="warning"
            />
          </div>

          {/* Balance de Clientes */}
          {portfolioStats?.clientBalance && (
            <div className="rounded-lg border bg-muted/30 p-4 mt-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Balance de Clientes del Mes
                </h4>
              </div>
              <div className="grid gap-4 sm:grid-cols-4">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-green-600 dark:text-green-400">
                    <ArrowUpRight className="h-4 w-4" />
                    <span className="text-xl font-bold">+{portfolioStats.clientBalance.nuevos}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Nuevos</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-red-600 dark:text-red-400">
                    <ArrowDownRight className="h-4 w-4" />
                    <span className="text-xl font-bold">-{portfolioStats.clientBalance.terminadosSinRenovar}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Sin Renovar</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-blue-600 dark:text-blue-400">
                    <RefreshCw className="h-4 w-4" />
                    <span className="text-xl font-bold">{portfolioStats.clientBalance.renovados}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Renovados</p>
                </div>
                <div className="text-center border-l">
                  <div className={cn(
                    'flex items-center justify-center gap-1',
                    portfolioStats.clientBalance.balance >= 0
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  )}>
                    <TrendIcon trend={portfolioStats.clientBalance.trend} />
                    <span className="text-xl font-bold">
                      {portfolioStats.clientBalance.balance >= 0 ? '+' : ''}{portfolioStats.clientBalance.balance}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">Balance Neto</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Financial Stats Row */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Indicadores Financieros
          </CardTitle>
          <CardDescription>Resumen financiero del mes actual</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border bg-muted/50 p-4">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/60">
                  <Wallet className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Cartera Total</p>
                  <p className="text-2xl font-bold">{formatCurrency(stats?.totalPortfolio)}</p>
                  {stats?.trend && (
                    <div className="flex items-center gap-1 text-xs">
                      <TrendIcon trend={stats.trend} />
                      <span className={cn(
                        stats.trend === 'UP' ? 'text-green-600' : stats.trend === 'DOWN' ? 'text-red-600' : ''
                      )}>
                        {stats.growthPercent}% vs mes anterior
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-lg border bg-muted/50 p-4">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-green-600">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Cobranza Mensual</p>
                  <p className="text-2xl font-bold">{formatCurrency(stats?.totalPaid)}</p>
                  <p className="text-xs text-muted-foreground">
                    {stats?.activeWeeks || 0} semanas activas
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border bg-muted/50 p-4">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600">
                  <DollarSign className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tasa Recuperacion</p>
                  <p className="text-2xl font-bold">
                    {parseFloat(stats?.recoveryRate || '0').toFixed(1)}%
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(stats?.weeklyAveragePayments)}/semana
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border bg-muted/50 p-4">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-purple-600">
                  <PlusCircle className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Localidades Nuevas</p>
                  <p className="text-2xl font-bold">{newLocations.length}</p>
                  <p className="text-xs text-muted-foreground">
                    Este mes
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recovered Dead Debt Section */}
      {recoveredDeadDebt && (recoveredDeadDebt.summary.paymentsCount > 0 || recoveredDeadDebt.summary.loansCount > 0) && (
        <Card className="border-green-200 dark:border-green-900 bg-green-50/50 dark:bg-green-950/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Skull className="h-5 w-5 text-green-600 dark:text-green-400" />
              Cartera Muerta Recuperada
            </CardTitle>
            <CardDescription>
              Pagos recibidos de créditos previamente marcados como cartera muerta.{' '}
              <button
                onClick={() => setShowRecoveredDeadDebtModal(true)}
                className="text-primary hover:underline font-medium"
              >
                Ver detalle
              </button>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 cursor-pointer"
              onClick={() => setShowRecoveredDeadDebtModal(true)}
            >
              <div className="rounded-lg border bg-white dark:bg-background p-4 transition-colors hover:bg-muted/50">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <span className="text-sm font-medium text-muted-foreground">Monto Recuperado</span>
                </div>
                <p className="text-2xl font-bold mt-1 text-green-600 dark:text-green-400">
                  {formatCurrency(recoveredDeadDebt.summary.totalRecovered)}
                </p>
              </div>
              <div className="rounded-lg border bg-white dark:bg-background p-4 transition-colors hover:bg-muted/50">
                <div className="flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <span className="text-sm font-medium text-muted-foreground">Pagos Recibidos</span>
                </div>
                <p className="text-2xl font-bold mt-1">
                  {recoveredDeadDebt.summary.paymentsCount}
                </p>
              </div>
              <div className="rounded-lg border bg-white dark:bg-background p-4 transition-colors hover:bg-muted/50">
                <div className="flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <span className="text-sm font-medium text-muted-foreground">Créditos</span>
                </div>
                <p className="text-2xl font-bold mt-1">
                  {recoveredDeadDebt.summary.loansCount}
                </p>
                <p className="text-xs text-muted-foreground">Con pagos este mes</p>
              </div>
              <div className="rounded-lg border bg-white dark:bg-background p-4 transition-colors hover:bg-muted/50">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <span className="text-sm font-medium text-muted-foreground">Clientes</span>
                </div>
                <p className="text-2xl font-bold mt-1">
                  {recoveredDeadDebt.summary.clientsCount}
                </p>
                <p className="text-xs text-muted-foreground">Que pagaron cartera muerta</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recovered Dead Debt Modal */}
      <RecoveredDeadDebtModal
        open={showRecoveredDeadDebtModal}
        onOpenChange={setShowRecoveredDeadDebtModal}
        payments={recoveredDeadDebt?.payments || []}
        title="Cartera Muerta Recuperada - Detalle"
      />

      {/* Main content grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Weekly Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Actividad Semanal
            </CardTitle>
            <CardDescription>Monto cobrado y clientes que pagaron por semana</CardDescription>
          </CardHeader>
          <CardContent>
            {weeklyChartData.length > 0 ? (
              <ChartContainer config={weeklyChartConfig} className="min-h-[250px] w-full">
                <ComposedChart data={weeklyChartData} margin={{ left: 0, right: 40 }}>
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
                            return [formatCurrency(value as number), 'Cobranza']
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
              <div className="flex flex-col items-center justify-center h-[250px] text-muted-foreground">
                <Calendar className="h-12 w-12 mb-4 opacity-50" />
                <p>Sin datos semanales</p>
              </div>
            )}

            {/* Weekly Comparison Summary */}
            {weeklyComparison && (
              <div className="mt-4 pt-4 border-t">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold">
                    Promedio Semanal ({weeklyComparison.currentWeeksCount} semana{weeklyComparison.currentWeeksCount !== 1 ? 's' : ''} completada{weeklyComparison.currentWeeksCount !== 1 ? 's' : ''})
                  </h4>
                  <Badge variant="outline" className="text-xs">
                    vs {monthNames[weeklyComparison.prevMonthLabel - 1]}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {/* Cobranza Promedio */}
                  <div className="rounded-lg border p-3 bg-muted/30">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Cobranza/Semana</span>
                      {weeklyComparison.avgCobranzaChange !== 0 && (
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-xs',
                            weeklyComparison.avgCobranzaChange > 0
                              ? 'bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-400'
                              : 'bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-400'
                          )}
                        >
                          {weeklyComparison.avgCobranzaChange > 0 ? '+' : ''}
                          {weeklyComparison.avgCobranzaChange.toFixed(1)}%
                        </Badge>
                      )}
                    </div>
                    <p className="text-lg font-bold mt-1">
                      {formatCurrency(weeklyComparison.currentAvgCobranza)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Anterior: {formatCurrency(weeklyComparison.prevAvgCobranza)}
                    </p>
                  </div>

                  {/* Clientes Promedio */}
                  <div className="rounded-lg border p-3 bg-muted/30">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Clientes/Semana</span>
                      {weeklyComparison.avgClientesChange !== 0 && (
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-xs',
                            weeklyComparison.avgClientesChange > 0
                              ? 'bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-400'
                              : 'bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-400'
                          )}
                        >
                          {weeklyComparison.avgClientesChange > 0 ? '+' : ''}
                          {weeklyComparison.avgClientesChange.toFixed(1)}%
                        </Badge>
                      )}
                    </div>
                    <p className="text-lg font-bold mt-1">
                      {weeklyComparison.currentAvgClientes.toFixed(0)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Anterior: {weeklyComparison.prevAvgClientes.toFixed(0)}
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
                      <span className="text-sm font-bold">{formatCurrency(weeklyComparison.currentTotalCobranza)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Pagos</span>
                      <span className="text-sm font-bold">{weeklyComparison.currentTotalClientes}</span>
                    </div>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {monthNames[weeklyComparison.prevMonthLabel - 1]} completo: {formatCurrency(weeklyComparison.prevTotalCobranza)} / {weeklyComparison.prevTotalClientes} pagos
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* New Locations */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Localidades Nuevas
            </CardTitle>
            <CardDescription>
              {newLocations.length > 0
                ? `${newLocations.length} localidad${newLocations.length > 1 ? 'es' : ''} creada${newLocations.length > 1 ? 's' : ''} este mes`
                : 'No se han creado localidades este mes'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {newLocations.length > 0 ? (
              <div className="space-y-3">
                {newLocations.map((location) => (
                  <div
                    key={location.id}
                    className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-950">
                        <MapPin className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div>
                        <p className="font-medium">{location.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {location.municipality.name}, {location.municipality.state.name}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      {location.route && (
                        <Badge variant="outline">{location.route.name}</Badge>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(location.createdAt).toLocaleDateString('es-MX')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
                <Building2 className="h-12 w-12 mb-4 opacity-50" />
                <p>Sin localidades nuevas</p>
                <p className="text-sm">Este mes no se han abierto nuevas localidades</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom grid - Top Locations and Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-7">
        {/* Top Locations */}
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Top Localidades por Clientes
            </CardTitle>
            <CardDescription>Localidades con mas clientes activos</CardDescription>
          </CardHeader>
          <CardContent>
            {topLocations.length > 0 ? (
              <div className="space-y-3">
                {topLocations.map((location, index) => (
                  <div
                    key={location.locationId}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold',
                        index === 0 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400' :
                        index === 1 ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400' :
                        index === 2 ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400' :
                        'bg-muted text-muted-foreground'
                      )}>
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{location.locationName}</p>
                        {location.routeName && (
                          <p className="text-sm text-muted-foreground">{location.routeName}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="text-right">
                        <p className="font-bold">{location.clientesActivos}</p>
                        <p className="text-xs text-muted-foreground">Activos</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-600">{location.clientesAlCorriente}</p>
                        <p className="text-xs text-muted-foreground">Corriente</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-red-600">{location.clientesEnCV}</p>
                        <p className="text-xs text-muted-foreground">CV</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
                <MapPin className="h-12 w-12 mb-4 opacity-50" />
                <p>Sin datos de localidades</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-primary" />
              Actividad Reciente
            </CardTitle>
            <CardDescription>Ultimas transacciones</CardDescription>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No hay transacciones recientes
              </p>
            ) : (
              <div className="space-y-3">
                {transactions.map(({ node: tx }) => {
                  const isPositive = tx.type === 'INCOME'
                  const borrowerName = tx.loan?.borrower?.personalData?.fullName
                  const leadName = tx.lead?.personalData?.fullName

                  let description = 'Transaccion'
                  if (tx.type === 'INCOME') {
                    description = borrowerName ? `Abono - ${borrowerName}` : 'Abono recibido'
                  } else if (tx.type === 'EXPENSE') {
                    if (tx.expenseSource === 'LOAN_GRANTED') {
                      description = borrowerName ? `Prestamo - ${borrowerName}` : 'Nuevo prestamo'
                    } else {
                      description = tx.expenseSource || 'Gasto'
                    }
                  } else if (tx.type === 'TRANSFER') {
                    description = leadName ? `Transferencia a ${leadName}` : 'Transferencia'
                  }

                  return (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            'flex h-8 w-8 items-center justify-center rounded-full',
                            isPositive ? 'bg-green-100 dark:bg-green-950' : 'bg-muted'
                          )}
                        >
                          {isPositive ? (
                            <ArrowUpRight className="h-4 w-4 text-green-600" />
                          ) : (
                            <ArrowDownRight className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium truncate max-w-[180px]">{description}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatRelativeTime(tx.date)}
                          </p>
                        </div>
                      </div>
                      <p
                        className={cn(
                          'font-medium',
                          isPositive ? 'text-green-600' : 'text-foreground'
                        )}
                      >
                        {isPositive ? '+' : '-'}
                        {formatCurrency(tx.amount)}
                      </p>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Accounts Section */}
      {accounts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              Balance de Cuentas
            </CardTitle>
            <CardDescription>Estado actual de todas las cuentas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {accounts.map((account) => {
                const balance = parseFloat(account.accountBalance || '0')
                return (
                  <div
                    key={account.id}
                    className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                        <Wallet className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{account.name}</p>
                        <Badge variant="outline" className="text-xs">
                          {account.type === 'BANK' ? 'Banco' :
                           account.type === 'OFFICE_CASH_FUND' ? 'Caja' :
                           account.type === 'EMPLOYEE_CASH_FUND' ? 'Fondo' :
                           account.type}
                        </Badge>
                      </div>
                    </div>
                    <p className={cn(
                      'font-bold',
                      balance < 0 ? 'text-red-600' : 'text-foreground'
                    )}>
                      {formatCurrency(balance)}
                    </p>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
