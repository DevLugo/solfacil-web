'use client'

import { useState, useMemo } from 'react'
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
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  usePortfolioReport,
  usePeriodNavigation,
  useLocalityReport,
  useAnnualPortfolioData,
  useRecoveredDeadDebt,
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

export default function PortfolioReportPage() {
  const [activeTab, setActiveTab] = useState('resumen')
  const [showRecoveredDeadDebtModal, setShowRecoveredDeadDebtModal] = useState(false)

  // Period navigation - always use MONTHLY view
  const {
    year,
    month,
    setYear,
    setMonth,
    goToCurrentPeriod,
  } = usePeriodNavigation('MONTHLY')

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
  })

  // Portfolio report data - previous month for comparison
  const {
    report: previousReport,
    loading: previousLoading,
  } = usePortfolioReport({
    periodType: 'MONTHLY',
    year: prevYear,
    month: prevMonth,
  })

  // Locality report for "Por Localidad" view
  const {
    localityReport,
    loading: localityLoading,
  } = useLocalityReport({
    year,
    month,
  })

  // Recovered dead debt
  const {
    summary: recoveredDeadDebt,
    payments: recoveredDeadDebtPayments,
    loading: recoveredLoading,
  } = useRecoveredDeadDebt({
    year,
    month,
  })

  // Annual data for trends view
  const {
    annualData: rawAnnualData,
    loading: annualLoading,
  } = useAnnualPortfolioData({
    year,
    currentMonth: month,
  })

  // Routes data for filters (future use)
  const { data: routesData } = useQuery<{ routes: RouteType[] }>(GET_ROUTES)

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

    // Current month data
    const currentMonth = {
      label: formatMonthLabel(month, year),
      clientesActivos: safeNumber(report.summary.totalClientesActivos),
      alCorrientePromedio: safeNumber(report.summary.clientesAlCorriente),
      cvPromedio: safeNumber(report.summary.promedioCV ?? report.summary.clientesEnCV),
      renovaciones: safeNumber(report.renovationKPIs.totalRenovaciones),
      nuevos: safeNumber(report.summary.clientBalance.nuevos),
      tasaRenovacion: safeNumber(report.renovationKPIs.tasaRenovacion),
    }

    // Override with locality report averages if available (with NaN protection)
    if (localityReport?.totals) {
      const alCorriente = localityReport.totals.alCorrientePromedio
      const cv = localityReport.totals.cvPromedio
      if (alCorriente !== undefined && !Number.isNaN(alCorriente)) {
        currentMonth.alCorrientePromedio = alCorriente
      }
      if (cv !== undefined && !Number.isNaN(cv)) {
        currentMonth.cvPromedio = cv
      }
    }

    // Previous month data
    const previousMonth = previousReport
      ? {
          label: formatMonthLabel(prevMonth, prevYear),
          clientesActivos: safeNumber(previousReport.summary.totalClientesActivos),
          alCorrientePromedio: safeNumber(previousReport.summary.clientesAlCorriente),
          cvPromedio: safeNumber(previousReport.summary.promedioCV ?? previousReport.summary.clientesEnCV),
          renovaciones: safeNumber(previousReport.renovationKPIs.totalRenovaciones),
          nuevos: safeNumber(previousReport.summary.clientBalance.nuevos),
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

  // Render loading state
  if (loading && !report) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Reporte de Cartera</h1>
            <p className="text-muted-foreground">Cargando datos...</p>
          </div>
        </div>
        <ReportSkeleton />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Reporte de Cartera</h1>
            <p className="text-muted-foreground">
              Estado de clientes activos y cartera vencida
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            <span className="ml-2 hidden sm:inline">Actualizar</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadPDF}
            disabled={pdfLoading || !report}
          >
            {pdfLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            <span className="ml-2 hidden sm:inline">Descargar PDF</span>
          </Button>
        </div>
      </div>

      {/* Period Selector */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Período del Reporte</CardTitle>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>

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
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="resumen" className="flex items-center gap-2">
              <LayoutDashboard className="h-4 w-4" />
              <span>Resumen del Mes</span>
            </TabsTrigger>
            <TabsTrigger value="rutas" className="flex items-center gap-2">
              <Route className="h-4 w-4" />
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
              locations={report.byLocation}
              localityReport={localityReport}
              localityLoading={localityLoading}
              year={year}
              month={month}
            />
          </TabsContent>
        </Tabs>
      )}

      {/* Empty State */}
      {!loading && !report && !error && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <BarChart3 className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold">Sin datos para mostrar</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              No hay información disponible para el período seleccionado.
              Intenta seleccionar un período diferente.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
