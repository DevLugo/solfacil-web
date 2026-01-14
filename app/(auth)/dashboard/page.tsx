'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@apollo/client'
import { Skeleton } from '@/components/ui/skeleton'
import { TrendingDown } from 'lucide-react'
import { useTransactionContext } from '@/components/features/transactions/transaction-context'
import { ROUTES_QUERY } from '@/graphql/queries/transactions'
import { useCEODashboard, useDashboardComparisons } from './hooks'
import { RecoveredDeadDebtModal } from '@/components/features/recovered-dead-debt'
import {
  // Layout Components
  DashboardHeader,
  // KPI Components
  DashboardKPIRow,
  // Table/List Components
  WeeklyComparisonTable,
  WeeklyTransactionsCard,
  WeeklyExpensesCard,
  // Alert Components
  LocalityAlertsCard,
  CriticalClientsCard,
  ExpensesDetailModal,
  // Chart Components
  WeeklyActivityChart,
  // Location Components
  TopLocationsCard,
  NewLocationsCard,
  // Specialized Cards
  RecoveredDeadDebtCard,
  // Types
  type LocalityAlert,
  type Route,
  type TopLocation,
  type WeeklyChartDataPoint,
} from './components'
import { getCurrentWeek, getMajorityMonthFromWeek } from './utils/weekUtils'
import { buildLocalityAlerts, buildTopLocationsFromLeads } from './utils/alertsHelpers'

// ============================================================================
// CONSTANTS
// ============================================================================

const monthNames = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const MIN_CLIENTS_FOR_ALERT = 2
const MAX_ALERTS_DISPLAYED = 5

// ============================================================================
// SKELETON COMPONENT
// ============================================================================

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

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function DashboardPage() {
  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------
  const { selectedRouteId, setSelectedRouteId } = useTransactionContext()
  const [showRecoveredDeadDebtModal, setShowRecoveredDeadDebtModal] = useState(false)
  const [showExpensesModal, setShowExpensesModal] = useState(false)
  const [weeksWithoutPaymentMin, setWeeksWithoutPaymentMin] = useState(3)

  // Initialize year/week from getCurrentWeek()
  const initialWeek = getCurrentWeek()
  const [selectedYear, setSelectedYear] = useState(initialWeek.year)
  const [selectedWeekNumber, setSelectedWeekNumber] = useState(initialWeek.weekNumber)

  // ---------------------------------------------------------------------------
  // COMPUTED VALUES - Week/Month Calculations
  // ---------------------------------------------------------------------------

  // Calculate the Monday date of the selected week
  const selectedWeekMonday = useMemo(() => {
    const jan1 = new Date(selectedYear, 0, 1)
    const dayOfWeek = jan1.getDay()
    const daysToFirstMonday = dayOfWeek === 0 ? 1 : dayOfWeek === 1 ? 0 : 8 - dayOfWeek
    const firstMonday = new Date(selectedYear, 0, 1 + daysToFirstMonday)

    const monday = new Date(firstMonday)
    monday.setDate(firstMonday.getDate() + (selectedWeekNumber - 1) * 7)
    return monday
  }, [selectedYear, selectedWeekNumber])

  // Calculate month from selected week for API calls
  const { month: currentMonth, year: currentYear } = useMemo(
    () => getMajorityMonthFromWeek(selectedWeekMonday),
    [selectedWeekMonday]
  )

  // ---------------------------------------------------------------------------
  // DATA FETCHING
  // ---------------------------------------------------------------------------

  // Fetch all routes
  const { data: routesData, loading: routesLoading } = useQuery<{ routes: Route[] }>(ROUTES_QUERY)
  const allRouteIds = routesData?.routes?.map((r) => r.id) || []

  // CEO Dashboard hook
  const {
    stats,
    portfolioStats,
    previousPortfolioStats,
    weeklyData,
    portfolioWeeklyData,
    previousPortfolioWeeklyData,
    weeklyComparison,
    newLocations,
    locationBreakdown,
    previousLocationBreakdown,
    recoveredDeadDebt,
    criticalClients,
    currentWeekExpenses,
    previousWeekExpenses,
    expensesByCategory,
    currentWeekStart,
    currentWeekEnd,
    previousWeekStart,
    previousWeekEnd,
    loading,
    error,
    refetch,
  } = useCEODashboard({
    year: currentYear,
    month: currentMonth,
    selectedRouteId,
    allRouteIds,
    weeksWithoutPaymentMin,
    selectedWeekMonday,
  })

  // ---------------------------------------------------------------------------
  // COMPUTED VALUES - Week Data
  // ---------------------------------------------------------------------------

  const { selectedWeekData, previousWeekData } = useMemo(() => {
    if (portfolioWeeklyData.length === 0) {
      return { selectedWeekData: null, previousWeekData: null }
    }

    const selectedIdx = portfolioWeeklyData.findIndex(w => {
      const weekStart = new Date(w.weekRange.start)
      const weekEnd = new Date(w.weekRange.end)
      return selectedWeekMonday >= weekStart && selectedWeekMonday <= weekEnd
    })

    if (selectedIdx === -1) {
      const completedWeeks = portfolioWeeklyData.filter(w => w.isCompleted)
      if (completedWeeks.length > 0) {
        const lastCompleted = completedWeeks[completedWeeks.length - 1]
        const lastIdx = portfolioWeeklyData.indexOf(lastCompleted)
        let previous = lastIdx > 0 ? portfolioWeeklyData[lastIdx - 1] : null
        if (!previous && previousPortfolioWeeklyData.length > 0) {
          previous = previousPortfolioWeeklyData[previousPortfolioWeeklyData.length - 1]
        }
        return { selectedWeekData: lastCompleted, previousWeekData: previous }
      }
      return { selectedWeekData: null, previousWeekData: null }
    }

    const selected = portfolioWeeklyData[selectedIdx]
    let previous = selectedIdx > 0 ? portfolioWeeklyData[selectedIdx - 1] : null
    if (!previous && previousPortfolioWeeklyData.length > 0) {
      previous = previousPortfolioWeeklyData[previousPortfolioWeeklyData.length - 1]
    }

    return { selectedWeekData: selected, previousWeekData: previous }
  }, [selectedWeekMonday, portfolioWeeklyData, previousPortfolioWeeklyData])

  // Week comparisons
  const weekComparisons = useMemo(() => {
    if (!selectedWeekData) {
      return {
        clientesActivosVsPrev: 0,
        clientesAlCorrienteVsPrev: 0,
        clientesEnCVVsPrev: 0,
        clientesActivosVsStart: 0,
        clientesEnCVVsStart: 0,
      }
    }

    const clientesActivosInicio = portfolioStats?.clientesActivosInicio ?? selectedWeekData.clientesActivos
    const firstWeekData = portfolioWeeklyData[0]
    const clientesEnCVInicio = firstWeekData?.clientesEnCV ?? 0

    return {
      clientesActivosVsPrev: previousWeekData
        ? selectedWeekData.clientesActivos - previousWeekData.clientesActivos
        : 0,
      clientesAlCorrienteVsPrev: previousWeekData
        ? selectedWeekData.clientesAlCorriente - previousWeekData.clientesAlCorriente
        : 0,
      clientesEnCVVsPrev: previousWeekData
        ? selectedWeekData.clientesEnCV - previousWeekData.clientesEnCV
        : 0,
      clientesActivosVsStart: selectedWeekData.clientesActivos - clientesActivosInicio,
      clientesEnCVVsStart: selectedWeekData.clientesEnCV - clientesEnCVInicio,
    }
  }, [selectedWeekData, previousWeekData, portfolioStats?.clientesActivosInicio, portfolioWeeklyData])

  // ---------------------------------------------------------------------------
  // COMPUTED VALUES - Locality Alerts
  // ---------------------------------------------------------------------------

  const localityAlerts = useMemo<LocalityAlert[]>(
    () => buildLocalityAlerts(
      criticalClients?.loans,
      previousLocationBreakdown,
      locationBreakdown,
      MIN_CLIENTS_FOR_ALERT,
      MAX_ALERTS_DISPLAYED
    ),
    [criticalClients, previousLocationBreakdown, locationBreakdown]
  )

  // ---------------------------------------------------------------------------
  // COMPUTED VALUES - Top Locations
  // ---------------------------------------------------------------------------

  const topLocationsFromLeads = useMemo<TopLocation[]>(
    () => buildTopLocationsFromLeads(criticalClients?.loans, 6),
    [criticalClients]
  )

  // ---------------------------------------------------------------------------
  // COMPUTED VALUES - Critical Clients Filter
  // ---------------------------------------------------------------------------

  const { filteredCriticalClients, filteredCriticalTotal } = useMemo(() => {
    if (!criticalClients?.loans) {
      return { filteredCriticalClients: [], filteredCriticalTotal: '0' }
    }

    const filtered = weeksWithoutPaymentMin >= 8
      ? criticalClients.loans.filter(c => c.weeksWithoutPayment >= 8)
      : criticalClients.loans.filter(c => c.weeksWithoutPayment === weeksWithoutPaymentMin)

    const total = filtered.reduce(
      (sum, client) => sum + parseFloat(client.pendingAmountStored || '0'),
      0
    )

    return {
      filteredCriticalClients: filtered,
      filteredCriticalTotal: total.toString(),
    }
  }, [criticalClients, weeksWithoutPaymentMin])

  // ---------------------------------------------------------------------------
  // COMPUTED VALUES - Chart Data
  // ---------------------------------------------------------------------------

  const weeklyChartData = useMemo<WeeklyChartDataPoint[]>(() => {
    return weeklyData.map((weekData) => ({
      week: `S${weekData.week}`,
      cobranza: parseFloat(weekData.paymentsReceived || '0'),
      clientesPagaron: weekData.paymentsCount || 0,
    }))
  }, [weeklyData])

  // ---------------------------------------------------------------------------
  // COMPUTED VALUES - Expenses
  // ---------------------------------------------------------------------------

  const expensesChangePercent = useMemo(() => {
    const current = parseFloat(currentWeekExpenses?.executiveSummary?.totalExpenses || '0')
    const previous = parseFloat(previousWeekExpenses?.executiveSummary?.totalExpenses || '0')
    // Si no hay datos de semana anterior, no mostrar cambio
    if (previous === 0) return undefined
    return Math.round(((current - previous) / previous) * 100)
  }, [currentWeekExpenses, previousWeekExpenses])

  // ---------------------------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------------------------

  const handleWeekChange = (year: number, weekNumber: number) => {
    setSelectedYear(year)
    setSelectedWeekNumber(weekNumber)
  }

  const handleRouteChange = (routeId: string | null) => {
    setSelectedRouteId(routeId)
  }

  // ---------------------------------------------------------------------------
  // LOADING & ERROR STATES
  // ---------------------------------------------------------------------------

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

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-6 overflow-x-hidden">
      {/* ===== HEADER ===== */}
      <DashboardHeader
        title="Dashboard"
        subtitle={`${monthNames[currentMonth - 1]} ${currentYear}`}
        selectedYear={selectedYear}
        selectedWeekNumber={selectedWeekNumber}
        onWeekChange={handleWeekChange}
        selectedRouteId={selectedRouteId}
        onRouteChange={handleRouteChange}
        routes={routesData?.routes || []}
        loading={loading}
        onRefresh={refetch}
      />

      {/* ===== KPI ROW ===== */}
      <DashboardKPIRow
        clientesActivos={selectedWeekData?.clientesActivos ?? portfolioStats?.totalClientesActivos ?? 0}
        clientesActivosVsPrev={weekComparisons.clientesActivosVsPrev}
        clientesAlCorriente={selectedWeekData?.clientesAlCorriente ?? portfolioStats?.clientesAlCorriente ?? 0}
        clientesAlCorrienteVsPrev={weekComparisons.clientesAlCorrienteVsPrev}
        clientesEnCV={selectedWeekData?.clientesEnCV ?? portfolioStats?.clientesEnCV ?? 0}
        clientesEnCVVsPrev={weekComparisons.clientesEnCVVsPrev}
        cvPercentage={selectedWeekData?.clientesActivos
          ? `${((selectedWeekData.clientesEnCV / selectedWeekData.clientesActivos) * 100).toFixed(1)}% del total`
          : undefined}
        criticalClientsCount={filteredCriticalClients.length}
        criticalClientsTotal={filteredCriticalTotal}
        weeksWithoutPaymentMin={weeksWithoutPaymentMin}
        totalExpenses={currentWeekExpenses?.executiveSummary?.totalExpenses
          ? parseFloat(currentWeekExpenses.executiveSummary.totalExpenses)
          : 0}
        expensesChangePercent={expensesChangePercent}
        onExpensesClick={() => setShowExpensesModal(true)}
      />

      {/* ===== COMPARISON TABLE + TRANSACTIONS ===== */}
      <div className="grid gap-6 lg:grid-cols-2">
        <WeeklyComparisonTable
          currentWeek={selectedWeekData ? {
            weekNumber: selectedWeekData.weekRange.weekNumber,
            clientesActivos: selectedWeekData.clientesActivos,
            clientesEnCV: selectedWeekData.clientesEnCV,
            criticalClients: criticalClients?.summary?.totalLoans,
          } : null}
          previousWeek={previousWeekData ? {
            weekNumber: previousWeekData.weekRange.weekNumber,
            clientesActivos: previousWeekData.clientesActivos,
            clientesEnCV: previousWeekData.clientesEnCV,
          } : null}
          monthStart={{
            clientesActivos: portfolioStats?.clientesActivosInicio
              || previousPortfolioStats?.totalClientesActivos
              || portfolioWeeklyData[0]?.clientesActivos
              || 0,
            clientesEnCV: portfolioWeeklyData[0]?.clientesEnCV
              || previousPortfolioWeeklyData[previousPortfolioWeeklyData.length - 1]?.clientesEnCV
              || 0,
          }}
        />
        <WeeklyTransactionsCard
          nuevos={portfolioStats?.clientBalance?.nuevos ?? 0}
          renovados={portfolioStats?.clientBalance?.renovados ?? 0}
        />
      </div>

      {/* ===== ALERTS + CRITICAL CLIENTS ===== */}
      <div className="grid gap-6 lg:grid-cols-2">
        <LocalityAlertsCard alerts={localityAlerts} />
        <CriticalClientsCard
          clients={filteredCriticalClients}
          totalPendingAmount={filteredCriticalTotal}
          weeksWithoutPayment={weeksWithoutPaymentMin}
          onWeeksChange={setWeeksWithoutPaymentMin}
        />
      </div>

      {/* ===== TOP LOCATIONS (right after critical clients) ===== */}
      <TopLocationsCard
        locations={topLocationsFromLeads}
        weeksWithoutPaymentMin={weeksWithoutPaymentMin}
      />

      {/* ===== WEEKLY EXPENSES ===== */}
      {expensesByCategory && (
        <WeeklyExpensesCard
          totalExpenses={currentWeekExpenses?.executiveSummary?.totalExpenses
            ? parseFloat(currentWeekExpenses.executiveSummary.totalExpenses)
            : 0}
          previousTotalExpenses={previousWeekExpenses?.executiveSummary?.totalExpenses
            ? parseFloat(previousWeekExpenses.executiveSummary.totalExpenses)
            : undefined}
          categories={expensesByCategory}
        />
      )}

      {/* ===== RECOVERED DEAD DEBT ===== */}
      {recoveredDeadDebt && (
        <RecoveredDeadDebtCard
          data={recoveredDeadDebt}
          onViewDetail={() => setShowRecoveredDeadDebtModal(true)}
        />
      )}

      {/* Recovered Dead Debt Modal */}
      <RecoveredDeadDebtModal
        open={showRecoveredDeadDebtModal}
        onOpenChange={setShowRecoveredDeadDebtModal}
        payments={recoveredDeadDebt?.payments || []}
        title="Cartera Muerta Recuperada - Detalle"
      />

      {/* Expenses Detail Modal */}
      <ExpensesDetailModal
        open={showExpensesModal}
        onOpenChange={setShowExpensesModal}
        routes={routesData?.routes || []}
        allRouteIds={allRouteIds}
        weekStart={currentWeekStart}
        weekEnd={currentWeekEnd}
        previousWeekStart={previousWeekStart}
        previousWeekEnd={previousWeekEnd}
        weekLabel={`S${selectedWeekNumber}`}
        initialRouteId={selectedRouteId}
      />

      {/* ===== WEEKLY ACTIVITY CHART ===== */}
      <WeeklyActivityChart
        data={weeklyChartData}
        comparison={weeklyComparison}
      />

      {/* ===== NEW LOCATIONS ===== */}
      <NewLocationsCard locations={newLocations} />
    </div>
  )
}
