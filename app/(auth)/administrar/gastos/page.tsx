'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@apollo/client'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  Filter,
  RefreshCw,
  MapPin,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useExpenseAnalytics, useExpenseTrend } from '@/components/features/administrar-gastos/hooks'
import {
  ExpenseKPIs,
  ExpenseByCategoryChart,
  ExpenseDistributionChart,
  ExpenseInsights,
  ExpenseTable,
  ExpenseTrendDialog,
} from '@/components/features/administrar-gastos/components'
import { MONTH_NAMES } from '@/components/features/administrar-gastos/constants'
import { GET_ROUTES } from '@/components/features/administrar-gastos/queries'
import type { Route } from '@/components/features/administrar-gastos/types'

function MonthSelector({
  selectedMonth,
  onMonthChange,
}: {
  selectedMonth: string
  onMonthChange: (month: string) => void
}) {
  const [year, month] = selectedMonth.split('-').map(Number)

  const goToPreviousMonth = () => {
    const newDate = new Date(year, month - 2, 1)
    onMonthChange(`${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}`)
  }

  const goToNextMonth = () => {
    const newDate = new Date(year, month, 1)
    const now = new Date()
    if (newDate <= now) {
      onMonthChange(`${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}`)
    }
  }

  const isCurrentMonth = () => {
    const now = new Date()
    return year === now.getFullYear() && month === now.getMonth() + 1
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="icon"
        onClick={goToPreviousMonth}
        className="h-8 w-8"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-md min-w-[180px] justify-center">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium">
          {MONTH_NAMES[month - 1]} {year}
        </span>
      </div>
      <Button
        variant="outline"
        size="icon"
        onClick={goToNextMonth}
        disabled={isCurrentMonth()}
        className="h-8 w-8"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )
}

function RouteSelector({
  routes,
  selectedRouteIds,
  onRouteChange,
  loading,
}: {
  routes: Route[]
  selectedRouteIds: string[]
  onRouteChange: (routeIds: string[]) => void
  loading?: boolean
}) {
  const allSelected = selectedRouteIds.length === routes.length
  const someSelected = selectedRouteIds.length > 0 && !allSelected

  const toggleAll = () => {
    if (allSelected) {
      onRouteChange([])
    } else {
      onRouteChange(routes.map((r) => r.id))
    }
  }

  const toggleRoute = (routeId: string) => {
    if (selectedRouteIds.includes(routeId)) {
      onRouteChange(selectedRouteIds.filter((id) => id !== routeId))
    } else {
      onRouteChange([...selectedRouteIds, routeId])
    }
  }

  if (loading) {
    return <Skeleton className="h-9 w-[180px]" />
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="min-w-[180px] justify-start">
          <MapPin className="h-4 w-4 mr-2" />
          {selectedRouteIds.length === 0
            ? 'Seleccionar rutas'
            : selectedRouteIds.length === routes.length
              ? 'Todas las rutas'
              : `${selectedRouteIds.length} ruta(s)`}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[220px] p-3" align="start">
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="all-routes"
              checked={allSelected ? true : someSelected ? 'indeterminate' : false}
              onCheckedChange={toggleAll}
            />
            <Label htmlFor="all-routes" className="font-medium">
              Todas las rutas
            </Label>
          </div>
          <div className="border-t pt-2 space-y-2 max-h-[200px] overflow-y-auto">
            {routes.map((route) => (
              <div key={route.id} className="flex items-center space-x-2">
                <Checkbox
                  id={route.id}
                  checked={selectedRouteIds.includes(route.id)}
                  onCheckedChange={() => toggleRoute(route.id)}
                />
                <Label htmlFor={route.id} className="text-sm font-normal">
                  {route.name}
                </Label>
              </div>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

function PageHeader({
  selectedMonth,
  onMonthChange,
  routes,
  selectedRouteIds,
  onRouteChange,
  onRefresh,
  loading,
  routesLoading,
}: {
  selectedMonth: string
  onMonthChange: (month: string) => void
  routes: Route[]
  selectedRouteIds: string[]
  onRouteChange: (routeIds: string[]) => void
  onRefresh: () => void
  loading?: boolean
  routesLoading?: boolean
}) {
  const [year, month] = selectedMonth.split('-').map(Number)

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            Administrar Gastos
          </h1>
          <p className="text-muted-foreground">
            Analisis y control de gastos operativos por mes
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <MonthSelector
            selectedMonth={selectedMonth}
            onMonthChange={onMonthChange}
          />
          <RouteSelector
            routes={routes}
            selectedRouteIds={selectedRouteIds}
            onRouteChange={onRouteChange}
            loading={routesLoading}
          />
          <Button
            variant="outline"
            size="icon"
            onClick={onRefresh}
            disabled={loading}
            className="h-9 w-9"
          >
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </Button>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-sm">
        <p className="text-amber-800 dark:text-amber-200">
          <strong>Nota:</strong> Este reporte excluye automaticamente los gastos relacionados con
          prestamos (desembolsos, comisiones de credito y abonos) para mostrar solo gastos operativos.
        </p>
      </div>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-3">
                <div className="h-4 w-24 bg-muted rounded" />
                <div className="h-8 w-32 bg-muted rounded" />
                <div className="h-4 w-20 bg-muted rounded" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="p-6">
            <div className="h-[400px] bg-muted rounded animate-pulse" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="h-[400px] bg-muted rounded animate-pulse" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function EmptyState({ hasRoutes }: { hasRoutes: boolean }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16">
        <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">
          {hasRoutes ? 'Selecciona al menos una ruta' : 'No hay rutas disponibles'}
        </h3>
        <p className="text-muted-foreground text-center max-w-md">
          {hasRoutes
            ? 'Selecciona una o mas rutas para ver el analisis de gastos del mes.'
            : 'No se encontraron rutas en el sistema. Contacta al administrador.'}
        </p>
      </CardContent>
    </Card>
  )
}

export default function AdministrarGastosPage() {
  // State
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [selectedRouteIds, setSelectedRouteIds] = useState<string[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [trendDialogOpen, setTrendDialogOpen] = useState(false)

  // Fetch routes
  const { data: routesData, loading: routesLoading } = useQuery<{ routes: Route[] }>(GET_ROUTES)
  const routes = routesData?.routes || []

  // Initialize with all routes selected
  useEffect(() => {
    if (routes.length > 0 && selectedRouteIds.length === 0) {
      setSelectedRouteIds(routes.map((r) => r.id))
    }
  }, [routes, selectedRouteIds.length])

  // Fetch expense analytics
  const {
    expenses,
    expensesByCategory,
    expensesByRoute,
    expensesByAccount,
    kpis,
    insights,
    loading: analyticsLoading,
    error,
    refetch,
  } = useExpenseAnalytics({
    selectedMonth,
    selectedRouteIds,
  })

  // Fetch trend data for category comparison
  const {
    getCategoryTrend,
    loading: trendLoading,
  } = useExpenseTrend({
    selectedMonth,
    selectedRouteIds,
  })

  const loading = routesLoading || analyticsLoading

  // Get selected category trend data
  const selectedCategoryTrend = selectedCategory ? getCategoryTrend(selectedCategory) ?? null : null

  // Handle route change
  const handleRouteChange = (routeIds: string[]) => {
    setSelectedRouteIds(routeIds)
  }

  // Handle refresh
  const handleRefresh = () => {
    refetch()
  }

  // Handle category click to show trend
  const handleCategoryClick = (category: string) => {
    setSelectedCategory(category)
    setTrendDialogOpen(true)
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        selectedMonth={selectedMonth}
        onMonthChange={setSelectedMonth}
        routes={routes}
        selectedRouteIds={selectedRouteIds}
        onRouteChange={handleRouteChange}
        onRefresh={handleRefresh}
        loading={loading}
        routesLoading={routesLoading}
      />

      {error ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <p className="text-destructive">Error al cargar datos: {error.message}</p>
            <Button variant="outline" onClick={handleRefresh} className="mt-4">
              Reintentar
            </Button>
          </CardContent>
        </Card>
      ) : selectedRouteIds.length === 0 ? (
        <EmptyState hasRoutes={routes.length > 0} />
      ) : loading && expenses.length === 0 ? (
        <LoadingState />
      ) : (
        <div className="space-y-6">
          {/* KPI Cards */}
          <ExpenseKPIs kpis={kpis} loading={loading} />

          {/* Charts Row */}
          <div className="grid gap-6 lg:grid-cols-2">
            <ExpenseByCategoryChart
              data={expensesByCategory}
              loading={loading}
              onCategoryClick={handleCategoryClick}
            />
            <ExpenseInsights insights={insights} loading={loading} />
          </div>

          {/* Distribution Charts */}
          <ExpenseDistributionChart
            byRoute={expensesByRoute}
            byAccount={expensesByAccount}
            loading={loading}
          />

          {/* Expense Table */}
          <ExpenseTable expenses={expenses} loading={loading} />
        </div>
      )}

      {/* Category Trend Dialog */}
      <ExpenseTrendDialog
        open={trendDialogOpen}
        onOpenChange={setTrendDialogOpen}
        categoryData={selectedCategoryTrend}
        loading={trendLoading}
      />
    </div>
  )
}
