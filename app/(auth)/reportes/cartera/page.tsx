'use client'

import { useState, useMemo, memo, useCallback, useEffect } from 'react'
import { useQuery } from '@apollo/client'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  FileText,
  Loader2,
  AlertTriangle,
  Download,
  RefreshCw,
  BarChart3,
  LayoutDashboard,
  Route,
  Skull,
  DollarSign,
  Receipt,
  Wallet,
  Users,
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  X,
  Check,
  ChevronsUpDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  usePortfolioReport,
  usePeriodNavigation,
  useLocalityReport,
  useAnnualPortfolioData,
  useRecoveredDeadDebt,
  useRouteKPIs,
} from './hooks'
import type { AnnualMonthData } from './components'
import {
  WeekSelector,
  LocationBreakdown,
  ClientBalanceChart,
  MonthComparisonChart,
  formatMonthLabel,
} from './components'
import type { Trend } from './hooks'
import { GET_ROUTES } from '@/graphql/queries/reports'
import { RecoveredDeadDebtModal } from '@/components/features/recovered-dead-debt'

interface RouteType {
  id: string
  name: string
}

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

function ReportSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <Skeleton className="h-9 w-64 mb-2" />
          <Skeleton className="h-5 w-96" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
      <Skeleton className="h-64" />
      <Skeleton className="h-96" />
    </div>
  )
}

// Memoized Period and Filters component to prevent re-renders when data loads
interface PeriodFiltersProps {
  year: number
  month: number
  currentActiveWeek: WeekRange | null
  setYear: (year: number) => void
  setMonth: (month: number) => void
  goToCurrentPeriod: () => void
  routes: RouteType[]
  selectedRouteIds: string[]
  setSelectedRouteIds: (ids: string[]) => void
}

interface WeekRange {
  start: string
  end: string
  weekNumber: number
  year: number
}

const PeriodFiltersCard = memo(function PeriodFiltersCard({
  year,
  month,
  currentActiveWeek,
  setYear,
  setMonth,
  goToCurrentPeriod,
  routes,
  selectedRouteIds,
  setSelectedRouteIds,
}: PeriodFiltersProps) {
  const [routeFilterOpen, setRouteFilterOpen] = useState(false)

  const handleRouteToggle = useCallback((routeId: string, checked: boolean) => {
    if (checked) {
      setSelectedRouteIds([...selectedRouteIds, routeId])
    } else {
      setSelectedRouteIds(selectedRouteIds.filter((id) => id !== routeId))
    }
  }, [selectedRouteIds, setSelectedRouteIds])

  const handleClearRoutes = useCallback(() => {
    setSelectedRouteIds([])
  }, [setSelectedRouteIds])

  const handleRemoveRoute = useCallback((routeId: string) => {
    setSelectedRouteIds(selectedRouteIds.filter((id) => id !== routeId))
  }, [selectedRouteIds, setSelectedRouteIds])

  return (
    <Card>
      <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6 pt-3 sm:pt-6">
        <CardTitle className="text-base sm:text-lg">Período y Filtros</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <WeekSelector
          periodType="MONTHLY"
          year={year}
          month={month}
          currentActiveWeek={currentActiveWeek}
          onPeriodTypeChange={() => {}}
          onYearChange={setYear}
          onMonthChange={setMonth}
          onWeekNumberChange={() => {}}
          onPrevious={() => {}}
          onNext={() => {}}
          onGoToCurrent={goToCurrentPeriod}
        />

        {/* Route Filter */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Filtrar por ruta:</span>
          <Popover open={routeFilterOpen} onOpenChange={setRouteFilterOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 justify-between min-w-[150px]"
              >
                {selectedRouteIds.length === 0 ? (
                  <span className="text-muted-foreground">Todas las rutas</span>
                ) : (
                  <span>{selectedRouteIds.length} ruta{selectedRouteIds.length > 1 ? 's' : ''}</span>
                )}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[250px] p-0" align="start">
              <div className="p-2 border-b">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Seleccionar rutas</span>
                  {selectedRouteIds.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={handleClearRoutes}
                    >
                      Limpiar
                    </Button>
                  )}
                </div>
              </div>
              <ScrollArea className="h-[200px]">
                <div className="p-2 space-y-1">
                  {routes.map((route) => (
                    <label
                      key={route.id}
                      className="flex items-center gap-2 p-2 rounded-md hover:bg-accent cursor-pointer"
                    >
                      <Checkbox
                        checked={selectedRouteIds.includes(route.id)}
                        onCheckedChange={(checked) => handleRouteToggle(route.id, !!checked)}
                      />
                      <span className="text-sm">{route.name}</span>
                    </label>
                  ))}
                  {routes.length === 0 && (
                    <p className="text-sm text-muted-foreground p-2">No hay rutas disponibles</p>
                  )}
                </div>
              </ScrollArea>
            </PopoverContent>
          </Popover>

          {/* Show selected routes as badges */}
          {selectedRouteIds.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {selectedRouteIds.map((routeId) => {
                const route = routes.find((r) => r.id === routeId)
                return (
                  <Badge
                    key={routeId}
                    variant="secondary"
                    className="text-xs flex items-center gap-1"
                  >
                    {route?.name || routeId}
                    <X
                      className="h-3 w-3 cursor-pointer hover:text-destructive"
                      onClick={() => handleRemoveRoute(routeId)}
                    />
                  </Badge>
                )
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
})

export default function PortfolioReportPage() {
  const [activeTab, setActiveTab] = useState('resumen')
  const [showRecoveredDeadDebtModal, setShowRecoveredDeadDebtModal] = useState(false)
  const [selectedRouteIds, setSelectedRouteIds] = useState<string[]>([])
  // Drill-down state: which route is selected for locality details (null = show routes only)
  const [selectedRouteForDrillDown, setSelectedRouteForDrillDown] = useState<string | null>(null)

  // Period navigation - always use MONTHLY view
  const {
    year,
    month,
    setYear,
    setMonth,
    goToCurrentPeriod,
  } = usePeriodNavigation('MONTHLY')

  // Build filters object from selected routes
  const filters = useMemo(() => {
    if (selectedRouteIds.length === 0) return undefined
    return { routeIds: selectedRouteIds }
  }, [selectedRouteIds])

  // Calculate previous month for comparison
  const { prevYear, prevMonth } = useMemo(() => {
    if (month === 1) {
      return { prevYear: year - 1, prevMonth: 12 }
    }
    return { prevYear: year, prevMonth: month - 1 }
  }, [year, month])

  // Portfolio report data - current month
  const {
    report,
    currentActiveWeek,
    loading,
    error,
    pdfLoading,
    refetch,
    generatePDF,
  } = usePortfolioReport({
    periodType: 'MONTHLY',
    year,
    month,
    filters,
  })

  // Portfolio report data - previous month for comparison (lazy load)
  const [shouldLoadPrevious, setShouldLoadPrevious] = useState(false)
  const {
    report: previousReport,
    loading: previousLoading,
  } = usePortfolioReport({
    periodType: 'MONTHLY',
    year: prevYear,
    month: prevMonth,
    filters,
    skip: !shouldLoadPrevious,
  })

  // Load previous month data after initial render (non-blocking)
  useEffect(() => {
    if (report && !shouldLoadPrevious) {
      // Delay loading previous month to not block initial render
      const timer = setTimeout(() => setShouldLoadPrevious(true), 100)
      return () => clearTimeout(timer)
    }
  }, [report, shouldLoadPrevious])

  // Build filters for locality report - include the specific route for drill-down
  const localityFilters = useMemo(() => {
    if (!selectedRouteForDrillDown) return filters
    // When drilling down into a specific route, filter by that route
    return {
      ...filters,
      routeIds: [selectedRouteForDrillDown],
    }
  }, [filters, selectedRouteForDrillDown])

  // Locality report for drill-down (only loaded when a route is selected)
  const {
    localityReport,
    loading: localityLoading,
  } = useLocalityReport({
    year,
    month,
    filters: localityFilters,
    skip: !selectedRouteForDrillDown, // Only fetch when drilling down into a route
  })

  // Route KPIs for "Por Ruta" tab - simplified query with only 3 metrics
  const {
    routeKPIs,
    totals: routeKPIsTotals,
    loading: routeKPIsLoading,
  } = useRouteKPIs({
    year,
    month,
    filters,
  })

  // Recovered dead debt (lazy load after main report)
  const [shouldLoadRecovered, setShouldLoadRecovered] = useState(false)
  const {
    summary: recoveredDeadDebt,
    payments: recoveredDeadDebtPayments,
    loading: recoveredLoading,
  } = useRecoveredDeadDebt({
    year,
    month,
    skip: !shouldLoadRecovered,
  })

  // Load recovered debt after initial render
  useEffect(() => {
    if (report && !shouldLoadRecovered) {
      const timer = setTimeout(() => setShouldLoadRecovered(true), 200)
      return () => clearTimeout(timer)
    }
  }, [report, shouldLoadRecovered])

  // Annual data for trends view (lazy load - heavy operation)
  const [shouldLoadAnnual, setShouldLoadAnnual] = useState(false)
  const {
    annualData: rawAnnualData,
    loading: annualLoading,
  } = useAnnualPortfolioData({
    year,
    currentMonth: month,
    skip: !shouldLoadAnnual,
  })

  // Load annual data after other data is loaded (lowest priority)
  useEffect(() => {
    if (report && shouldLoadPrevious && !shouldLoadAnnual) {
      const timer = setTimeout(() => setShouldLoadAnnual(true), 500)
      return () => clearTimeout(timer)
    }
  }, [report, shouldLoadPrevious, shouldLoadAnnual])

  // Routes data for filters
  const { data: routesData } = useQuery<{ routes: RouteType[] }>(GET_ROUTES)

  // Stable reference for routes to prevent PeriodFiltersCard re-renders
  const routes = useMemo(() => routesData?.routes || [], [routesData?.routes])

  // Transform annual data for chart
  const annualData: AnnualMonthData[] = useMemo(() => {
    return rawAnnualData.map((d) => ({
      month: d.month,
      year: d.year,
      label: d.label,
      clientesActivos: d.clientesActivos,
      alCorrientePromedio: d.alCorrientePromedio,
      cvPromedio: d.cvPromedio,
      renovaciones: d.renovaciones,
      nuevos: d.nuevos,
      reintegros: d.reintegros,
      balance: d.balance,
      tasaRenovacion: d.tasaRenovacion,
    }))
  }, [rawAnnualData])

  // Month comparison data
  const monthComparisonData = useMemo(() => {
    if (!report) return null

    // Helper to safely get numeric value (handles undefined and NaN)
    const safeNumber = (value: number | undefined | null): number => {
      if (value === undefined || value === null || Number.isNaN(value)) return 0
      return value
    }

    // clientesActivosInicio = previous month's totalClientesActivos
    // This is the most reliable way to get the "start of month" count
    const clientesActivosInicio = previousReport?.summary.totalClientesActivos !== undefined
      ? safeNumber(previousReport.summary.totalClientesActivos)
      : undefined

    // Use backend's totalClientesActivos directly (clientes activos al final del mes)
    const clientesActivos = safeNumber(report.summary.totalClientesActivos)

    // Current month data
    const currentMonth = {
      label: formatMonthLabel(month, year),
      clientesActivosInicio,
      clientesActivos,
      alCorrientePromedio: safeNumber(report.summary.clientesAlCorriente),
      cvPromedio: safeNumber(report.summary.promedioCV ?? report.summary.clientesEnCV),
      renovaciones: safeNumber(report.renovationKPIs.totalRenovaciones),
      nuevos: safeNumber(report.summary.clientBalance.nuevos),
      reintegros: safeNumber(report.summary.clientBalance.reintegros),
      tasaRenovacion: safeNumber(report.renovationKPIs.tasaRenovacion),
    }

    // NOTA: Se usa directamente el valor de getMonthlyReport.summary.promedioCV
    // El override con localityReport.totals.cvPromedio causaba valores incorrectos
    // debido a diferencias en cómo se calculan los campos en getLocalityReport

    // Previous month data
    const previousMonth = previousReport
      ? {
          label: formatMonthLabel(prevMonth, prevYear),
          clientesActivos: safeNumber(previousReport.summary.totalClientesActivos),
          alCorrientePromedio: safeNumber(previousReport.summary.clientesAlCorriente),
          cvPromedio: safeNumber(previousReport.summary.promedioCV ?? previousReport.summary.clientesEnCV),
          renovaciones: safeNumber(previousReport.renovationKPIs.totalRenovaciones),
          nuevos: safeNumber(previousReport.summary.clientBalance.nuevos),
          reintegros: safeNumber(previousReport.summary.clientBalance.reintegros ?? 0),
          tasaRenovacion: safeNumber(previousReport.renovationKPIs.tasaRenovacion),
        }
      : null

    return { currentMonth, previousMonth }
  }, [report, previousReport, localityReport, month, year, prevMonth, prevYear])

  // Handle PDF download
  const handleDownloadPDF = async () => {
    const result = await generatePDF()
    if (result?.success && result.url) {
      window.open(result.url, '_blank')
    } else if (result?.success && result.base64) {
      // Create download from base64
      const link = document.createElement('a')
      link.href = `data:application/pdf;base64,${result.base64}`
      link.download = result.filename
      link.click()
    }
  }

  // Check if this is initial load (no report data yet)
  const isInitialLoad = loading && !report

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-0 overflow-x-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
            <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl font-bold tracking-tight truncate">Reporte Cartera</h1>
            <p className="text-xs sm:text-sm text-muted-foreground truncate">
              {loading ? 'Cargando datos...' : 'Clientes activos y CV'}
            </p>
          </div>
        </div>
        <div className="flex gap-1 sm:gap-2 shrink-0">
          <Button
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            disabled={loading}
            className="h-8 w-8 sm:h-9 sm:w-9"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleDownloadPDF}
            disabled={pdfLoading || !report}
            className="h-8 w-8 sm:h-9 sm:w-9"
          >
            {pdfLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Period Selector and Filters - Always rendered, never affected by loading */}
      <PeriodFiltersCard
        year={year}
        month={month}
        currentActiveWeek={currentActiveWeek}
        setYear={setYear}
        setMonth={setMonth}
        goToCurrentPeriod={goToCurrentPeriod}
        routes={routes}
        selectedRouteIds={selectedRouteIds}
        setSelectedRouteIds={setSelectedRouteIds}
      />

      {/* Show skeleton only on initial load, otherwise show report content */}
      {isInitialLoad ? (
        <ReportSkeleton />
      ) : (
        <>

      {/* Error State */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="flex items-center gap-4 py-6">
            <AlertTriangle className="h-8 w-8 text-destructive" />
            <div>
              <h3 className="font-semibold">Error al cargar el reporte</h3>
              <p className="text-sm text-muted-foreground">{error.message}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recovered Dead Debt Modal */}
      <RecoveredDeadDebtModal
        open={showRecoveredDeadDebtModal}
        onOpenChange={setShowRecoveredDeadDebtModal}
        payments={recoveredDeadDebtPayments}
        title="Cartera Muerta Recuperada - Detalle"
      />

      {/* Report Content */}
      {report && (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
          <TabsList className="grid w-full grid-cols-2 h-9 sm:h-10">
            <TabsTrigger value="resumen" className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
              <LayoutDashboard className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>Resumen</span>
            </TabsTrigger>
            <TabsTrigger value="rutas" className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
              <Route className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>Por Ruta</span>
            </TabsTrigger>
          </TabsList>

          {/* Resumen del Mes Tab */}
          <TabsContent value="resumen" className="space-y-6">
            {/* Month Comparison Chart */}
            {monthComparisonData && (
              <MonthComparisonChart
                currentMonth={monthComparisonData.currentMonth}
                previousMonth={monthComparisonData.previousMonth}
                annualData={annualData.length > 1 ? annualData : undefined}
                loading={previousLoading || annualLoading}
              />
            )}

            {/* Balance de Clientes y Cartera Muerta Recuperada */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Movimiento de Clientes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Balance de Clientes */}
                <div className="grid gap-3 sm:grid-cols-4">
                  <div className="flex items-center gap-3 rounded-lg border bg-green-50/50 dark:bg-green-950/20 border-green-200 dark:border-green-900 p-3">
                    <ArrowUpRight className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                    <div>
                      <p className="text-2xl font-bold text-green-600 dark:text-green-400">+{report.summary.clientBalance.nuevos}</p>
                      <p className="text-xs text-muted-foreground">Nuevos</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-lg border bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-900 p-3">
                    <ArrowDownRight className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                    <div>
                      <p className="text-2xl font-bold text-red-600 dark:text-red-400">-{report.summary.clientBalance.terminadosSinRenovar}</p>
                      <p className="text-xs text-muted-foreground">Sin Renovar</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-lg border bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900 p-3">
                    <RefreshCw className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                    <div>
                      <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{report.summary.clientBalance.renovados}</p>
                      <p className="text-xs text-muted-foreground">Renovados</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
                    {report.summary.clientBalance.trend === 'UP' ? (
                      <TrendingUp className={cn('h-5 w-5 flex-shrink-0', report.summary.clientBalance.balance >= 0 ? 'text-green-600' : 'text-red-600')} />
                    ) : report.summary.clientBalance.trend === 'DOWN' ? (
                      <TrendingDown className={cn('h-5 w-5 flex-shrink-0', report.summary.clientBalance.balance >= 0 ? 'text-green-600' : 'text-red-600')} />
                    ) : (
                      <Minus className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    )}
                    <div>
                      <p className={cn(
                        'text-2xl font-bold',
                        report.summary.clientBalance.balance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                      )}>
                        {report.summary.clientBalance.balance >= 0 ? '+' : ''}{report.summary.clientBalance.balance}
                      </p>
                      <p className="text-xs text-muted-foreground">Balance Neto</p>
                    </div>
                  </div>
                </div>

                {/* Cartera Muerta Recuperada - Inline compact */}
                {recoveredDeadDebt && (recoveredDeadDebt.paymentsCount > 0 || recoveredDeadDebt.loansCount > 0) && (
                  <button
                    onClick={() => setShowRecoveredDeadDebtModal(true)}
                    className="w-full flex items-center justify-between gap-4 rounded-lg border-2 border-dashed border-green-300 dark:border-green-800 bg-green-50/30 dark:bg-green-950/10 hover:bg-green-50/50 dark:hover:bg-green-950/20 transition-colors p-3"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/50">
                        <Skull className="h-5 w-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-medium">Cartera Muerta Recuperada</p>
                        <p className="text-xs text-muted-foreground">
                          {recoveredDeadDebt.paymentsCount} pagos de {recoveredDeadDebt.clientsCount} clientes
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <p className="text-xl font-bold text-green-600 dark:text-green-400">
                        {formatCurrency(recoveredDeadDebt.totalRecovered)}
                      </p>
                      <span className="text-xs text-primary">Ver detalle →</span>
                    </div>
                  </button>
                )}
              </CardContent>
            </Card>

            {/* Weekly Trends (integrated from Tendencias tab) */}
            {report.weeklyData.length > 0 && (
              <ClientBalanceChart
                weeklyData={report.weeklyData}
                periodType="MONTHLY"
              />
            )}
          </TabsContent>

          {/* Por Ruta Tab */}
          <TabsContent value="rutas">
            <LocationBreakdown
              routeKPIs={routeKPIs}
              routeKPIsTotals={routeKPIsTotals}
              routeKPIsLoading={routeKPIsLoading}
              localityReport={localityReport}
              localityLoading={localityLoading}
              year={year}
              month={month}
              selectedRouteId={selectedRouteForDrillDown}
              onRouteSelect={setSelectedRouteForDrillDown}
            />
          </TabsContent>
        </Tabs>
      )}

      {/* Empty State */}
      {!loading && !report && !error && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8 sm:py-16">
            <BarChart3 className="h-8 w-8 sm:h-12 sm:w-12 text-muted-foreground/50 mb-2 sm:mb-4" />
            <h3 className="text-base sm:text-lg font-semibold">Sin datos para mostrar</h3>
            <p className="text-xs sm:text-sm text-muted-foreground text-center max-w-md">
              No hay información disponible para el período seleccionado.
            </p>
          </CardContent>
        </Card>
      )}
        </>
      )}
    </div>
  )
}
