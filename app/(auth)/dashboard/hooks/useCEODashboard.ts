'use client'

import { useMemo } from 'react'
import { useQuery } from '@apollo/client'
import { gql } from '@apollo/client'
import { getCurrentAndPreviousWeekRanges } from '../utils/weekUtils'

// GraphQL Queries
const GET_CEO_DASHBOARD_DATA = gql`
  query CEODashboardData(
    $routeIds: [ID!]!
    $routeId: ID
    $expenseRouteIds: [ID!]!
    $portfolioRouteIds: [ID!]
    $year: Int!
    $month: Int!
    $prevYear: Int!
    $prevMonth: Int!
    $fromDate: DateTime!
    $toDate: DateTime!
    $limit: Int
    $currentWeekStart: DateTime!
    $currentWeekEnd: DateTime!
    $previousWeekStart: DateTime!
    $previousWeekEnd: DateTime!
    $skipExpenseSummary: Boolean!
    $weeksWithoutPaymentMin: Int!
  ) {
    financialReport(routeIds: $routeIds, year: $year, month: $month) {
      summary {
        activeLoans
        activeLoansBreakdown {
          total
          alCorriente
          carteraVencida
        }
        totalPortfolio
        totalPaid
        pendingAmount
        averagePayment
      }
      weeklyData {
        week
        date
        loansGranted
        paymentsReceived
        paymentsCount
        expectedPayments
        recoveryRate
      }
      comparisonData {
        previousMonth {
          activeLoans
          totalPortfolio
          totalPaid
          pendingAmount
        }
        growth
        trend
      }
      performanceMetrics {
        recoveryRate
        averageTicket
        activeLoansCount
        finishedLoansCount
      }
    }
    previousFinancialReport: financialReport(routeIds: $routeIds, year: $prevYear, month: $prevMonth) {
      summary {
        totalPaid
      }
      weeklyData {
        week
        date
        paymentsReceived
        paymentsCount
      }
    }
    portfolioReportMonthly(year: $year, month: $month, filters: { routeIds: $portfolioRouteIds }) {
      summary {
        clientesActivosInicio
        totalClientesActivos
        clientesAlCorriente
        clientesEnCV
        promedioCV
        semanasCompletadas
        totalSemanas
        clientBalance {
          nuevos
          terminadosSinRenovar
          renovados
          balance
          trend
        }
        comparison {
          previousClientesActivos
          previousClientesEnCV
          cvChange
          balanceChange
        }
      }
      weeklyData {
        weekRange {
          start
          end
          weekNumber
          year
        }
        clientesActivos
        clientesAlCorriente
        clientesEnCV
        balance
        isCompleted
        nuevos
        renovados
        reintegros
      }
      renovationKPIs {
        totalRenovaciones
        totalCierresSinRenovar
        tasaRenovacion
        tendencia
      }
      byLocation {
        locationId
        locationName
        routeId
        routeName
        clientesActivos
        clientesAlCorriente
        clientesEnCV
        balance
      }
    }
    locationsCreatedInPeriod(fromDate: $fromDate, toDate: $toDate) {
      id
      name
      createdAt
      route {
        id
        name
      }
      municipality {
        id
        name
        state {
          id
          name
        }
      }
    }
    accounts(routeId: $routeId) {
      id
      name
      type
      accountBalance
    }
    transactions(routeId: $routeId, limit: $limit) {
      edges {
        node {
          id
          amount
          date
          type
          incomeSource
          expenseSource
          loan {
            id
            borrower {
              id
              personalData {
                id
                fullName
              }
            }
          }
          lead {
            id
            personalData {
              id
              fullName
            }
          }
        }
      }
    }
    routes {
      id
      name
    }
    recoveredDeadDebt(year: $year, month: $month, routeId: $routeId) {
      year
      month
      summary {
        totalRecovered
        paymentsCount
        loansCount
        clientsCount
      }
      payments {
        id
        amount
        receivedAt
        loanId
        clientName
        clientCode
        badDebtDate
        routeName
        locality
        pendingAmount
      }
    }
    previousPortfolioReport: portfolioReportMonthly(year: $prevYear, month: $prevMonth, filters: { routeIds: $portfolioRouteIds }) {
      summary {
        clientesActivosInicio
        totalClientesActivos
        clientesEnCV
      }
      weeklyData {
        weekRange {
          start
          end
          weekNumber
          year
        }
        clientesActivos
        clientesAlCorriente
        clientesEnCV
        balance
        isCompleted
        nuevos
        renovados
        reintegros
      }
      byLocation {
        locationId
        locationName
        routeId
        routeName
        clientesActivos
        clientesAlCorriente
        clientesEnCV
        balance
      }
    }
    criticalClients: deadDebtLoans(weeksWithoutPaymentMin: $weeksWithoutPaymentMin, routeId: $routeId, evaluationDate: $currentWeekEnd) {
      loans {
        id
        pendingAmountStored
        weeksWithoutPayment
        borrower {
          fullName
          clientCode
        }
        lead {
          fullName
          locality
          route
        }
        payments {
          receivedAt
          amount
        }
      }
      summary {
        totalLoans
        totalPendingAmount
      }
    }
    currentWeekSummary: transactionsSummaryByLocation(
      routeIds: $expenseRouteIds
      startDate: $currentWeekStart
      endDate: $currentWeekEnd
    ) @skip(if: $skipExpenseSummary) {
      executiveSummary {
        totalExpenses
        totalLoansGranted
        loansGrantedCount
      }
      localities {
        expenses {
          source
          sourceLabel
          amount
        }
      }
    }
    previousWeekSummary: transactionsSummaryByLocation(
      routeIds: $expenseRouteIds
      startDate: $previousWeekStart
      endDate: $previousWeekEnd
    ) @skip(if: $skipExpenseSummary) {
      executiveSummary {
        totalExpenses
      }
    }
  }
`

export interface RecoveredDeadDebtPayment {
  id: string
  amount: string
  receivedAt: string
  loanId: string
  clientName: string
  clientCode: string
  badDebtDate: string
  routeName: string
  locality: string
  pendingAmount: string
}

export interface RecoveredDeadDebtSummary {
  totalRecovered: string
  paymentsCount: number
  loansCount: number
  clientsCount: number
}

export interface RecoveredDeadDebtData {
  summary: RecoveredDeadDebtSummary
  payments: RecoveredDeadDebtPayment[]
}

export interface CriticalClientPayment {
  receivedAt: string | null
  amount: string
}

export interface CriticalClient {
  id: string
  pendingAmountStored: string
  weeksWithoutPayment: number
  borrower: {
    fullName: string
    clientCode: string
  }
  lead: {
    fullName: string
    locality: string
    route: string
  }
  payments: CriticalClientPayment[]
}

export interface CriticalClientsSummary {
  totalLoans: number
  totalPendingAmount: string
}

export interface CriticalClientsData {
  loans: CriticalClient[]
  summary: CriticalClientsSummary
}

export interface ExpensesByCategory {
  gasolina: number
  nomina: number
  viaticos: number
  otros: number
}

export interface WeeklyData {
  week: number
  date: string
  loansGranted: number
  paymentsReceived: string
  paymentsCount: number
  expectedPayments: string
  recoveryRate: string
}

export interface Account {
  id: string
  name: string
  type: string
  accountBalance: string
}

export interface TransactionNode {
  id: string
  amount: string
  date: string
  type: string
  incomeSource: string | null
  expenseSource: string | null
  loan: {
    borrower: {
      personalData: {
        fullName: string
      }
    }
  } | null
  lead: {
    personalData: {
      fullName: string
    }
  } | null
}

export interface LocationCreated {
  id: string
  name: string
  createdAt: string
  route: {
    id: string
    name: string
  } | null
  municipality: {
    id: string
    name: string
    state: {
      id: string
      name: string
    }
  }
}

export interface LocationBreakdown {
  locationId: string
  locationName: string
  routeId: string | null
  routeName: string | null
  clientesActivos: number
  clientesAlCorriente: number
  clientesEnCV: number
  balance: number
}

export interface Route {
  id: string
  name: string
}

export type Trend = 'UP' | 'DOWN' | 'STABLE'

export interface PortfolioWeeklyData {
  weekRange: {
    start: string
    end: string
    weekNumber: number
    year: number
  }
  clientesActivos: number
  clientesAlCorriente: number
  clientesEnCV: number
  balance: number
  isCompleted: boolean
  nuevos: number
  renovados: number
  reintegros: number
}

interface UseCEODashboardParams {
  year: number
  month: number
  selectedRouteId?: string | null
  allRouteIds: string[]
  weeksWithoutPaymentMin?: number
  selectedWeekMonday?: Date
}

export function useCEODashboard({
  year,
  month,
  selectedRouteId,
  allRouteIds,
  weeksWithoutPaymentMin = 3,
  selectedWeekMonday,
}: UseCEODashboardParams) {
  // Calculate previous month/year
  const { prevYear, prevMonth } = useMemo(() => {
    if (month === 1) {
      return { prevYear: year - 1, prevMonth: 12 }
    }
    return { prevYear: year, prevMonth: month - 1 }
  }, [year, month])

  // Calculate date range for new locations
  const { fromDate, toDate } = useMemo(() => {
    const from = new Date(year, month - 1, 1)
    const to = new Date(year, month, 0, 23, 59, 59)
    return {
      fromDate: from.toISOString(),
      toDate: to.toISOString(),
    }
  }, [year, month])

  // Calculate dates for selected week and previous week (for expenses query)
  const { currentWeekStart, currentWeekEnd, previousWeekStart, previousWeekEnd } = useMemo(
    () => getCurrentAndPreviousWeekRanges(selectedWeekMonday),
    [selectedWeekMonday]
  )

  const routeIdsToUse = selectedRouteId ? [selectedRouteId] : allRouteIds
  const routeIdForAccounts = selectedRouteId || null
  // For expense queries - use selected route if specified, otherwise all routes
  const expenseRouteIds = selectedRouteId ? [selectedRouteId] : allRouteIds
  // For portfolio queries - use selected route if specified, otherwise null (no filter = all routes)
  const portfolioRouteIds = selectedRouteId ? [selectedRouteId] : null
  // Only skip if we don't have ANY route IDs available
  const skipExpenseSummary = allRouteIds.length === 0

  const { data, loading, error, refetch } = useQuery(GET_CEO_DASHBOARD_DATA, {
    variables: {
      routeIds: routeIdsToUse,
      routeId: routeIdForAccounts,
      expenseRouteIds,
      portfolioRouteIds,
      year,
      month,
      prevYear,
      prevMonth,
      fromDate,
      toDate,
      limit: 8,
      currentWeekStart,
      currentWeekEnd,
      previousWeekStart,
      previousWeekEnd,
      skipExpenseSummary,
      weeksWithoutPaymentMin,
    },
    skip: routeIdsToUse.length === 0,
    fetchPolicy: 'cache-and-network',
  })

  // Financial data
  const financialReport = data?.financialReport
  const summary = financialReport?.summary
  const comparison = financialReport?.comparisonData
  const metrics = financialReport?.performanceMetrics
  const weeklyData: WeeklyData[] = financialReport?.weeklyData || []

  // Previous month financial data
  const prevFinancialReport = data?.previousFinancialReport
  const prevWeeklyData: WeeklyData[] = prevFinancialReport?.weeklyData || []

  // Portfolio data
  const portfolioReport = data?.portfolioReportMonthly
  const portfolioSummary = portfolioReport?.summary
  const renovationKPIs = portfolioReport?.renovationKPIs
  const locationBreakdown: LocationBreakdown[] = portfolioReport?.byLocation || []
  const portfolioWeeklyData: PortfolioWeeklyData[] = portfolioReport?.weeklyData || []

  // Previous month portfolio data (for cross-month week comparison)
  const previousPortfolioReport = data?.previousPortfolioReport
  const previousPortfolioWeeklyData: PortfolioWeeklyData[] = previousPortfolioReport?.weeklyData || []
  const previousPortfolioStats = previousPortfolioReport?.summary || null
  const previousLocationBreakdown: LocationBreakdown[] = previousPortfolioReport?.byLocation || []

  // New locations
  const newLocations: LocationCreated[] = data?.locationsCreatedInPeriod || []

  // Accounts and transactions
  const accounts: Account[] = data?.accounts || []
  const transactions: { node: TransactionNode }[] = data?.transactions?.edges || []

  // Routes
  const routes: Route[] = data?.routes || []

  // Recovered dead debt
  const recoveredDeadDebt: RecoveredDeadDebtData | null = data?.recoveredDeadDebt
    ? {
        summary: data.recoveredDeadDebt.summary,
        payments: data.recoveredDeadDebt.payments || [],
      }
    : null

  // Critical clients (4+ weeks without payment)
  const criticalClients: CriticalClientsData | null = data?.criticalClients || null

  // Current and previous week expenses
  const currentWeekExpenses = data?.currentWeekSummary || null
  const previousWeekExpenses = data?.previousWeekSummary || null

  // Calculate expenses by category
  const expensesByCategory = useMemo<ExpensesByCategory | null>(() => {
    if (!currentWeekExpenses?.localities) return null

    const GASOLINE_SOURCES = new Set(['GASOLINE', 'GASOLINE_TOKA'])
    const NOMINA_SOURCES = new Set(['NOMINA_SALARY', 'EXTERNAL_SALARY'])
    const VIATIC_SOURCES = new Set(['VIATIC', 'TRAVEL_EXPENSES'])

    const categories: ExpensesByCategory = {
      gasolina: 0,
      nomina: 0,
      viaticos: 0,
      otros: 0,
    }

    currentWeekExpenses.localities.forEach((locality: { expenses?: { source: string; amount: string }[] }) => {
      locality.expenses?.forEach((expense: { source: string; amount: string }) => {
        const amount = parseFloat(expense.amount || '0')

        if (GASOLINE_SOURCES.has(expense.source)) {
          categories.gasolina += amount
        } else if (NOMINA_SOURCES.has(expense.source)) {
          categories.nomina += amount
        } else if (VIATIC_SOURCES.has(expense.source)) {
          categories.viaticos += amount
        } else {
          categories.otros += amount
        }
      })
    })

    return categories
  }, [currentWeekExpenses])

  // Computed stats
  const stats = useMemo(() => {
    if (!summary) return null

    const now = new Date()
    const completedWeeks = weeklyData.filter((week) => new Date(week.date) <= now)
    const activeWeeks = completedWeeks.length

    const calculateWeeklyAverage = (getValue: (week: WeeklyData) => number) => {
      if (activeWeeks === 0) return 0
      return completedWeeks.reduce((sum, week) => sum + getValue(week), 0) / activeWeeks
    }

    const weeklyAveragePayments = calculateWeeklyAverage(
      (week) => parseFloat(week.paymentsReceived || '0')
    )
    const weeklyAverageClients = calculateWeeklyAverage(
      (week) => week.paymentsCount || 0
    )

    const growthPercent = comparison?.growth ? parseFloat(comparison.growth).toFixed(1) : '0'
    const trend = comparison?.trend || 'STABLE'

    return {
      activeLoans: summary.activeLoans,
      activeLoansBreakdown: summary.activeLoansBreakdown,
      totalPortfolio: summary.totalPortfolio,
      totalPaid: summary.totalPaid,
      pendingAmount: summary.pendingAmount,
      averagePayment: summary.averagePayment,
      recoveryRate: metrics?.recoveryRate || '0',
      averageTicket: metrics?.averageTicket || '0',
      finishedLoansCount: metrics?.finishedLoansCount || 0,
      activeWeeks,
      weeklyAveragePayments,
      weeklyAverageClients,
      growthPercent,
      trend: trend as Trend,
      newLocationsCount: newLocations.length,
    }
  }, [summary, weeklyData, comparison, metrics, newLocations])

  // Weekly comparison with previous month
  const weeklyComparison = useMemo(() => {
    const now = new Date()
    const currentCompletedWeeks = weeklyData.filter((week) => new Date(week.date) <= now)
    const currentWeeksCount = currentCompletedWeeks.length

    if (currentWeeksCount === 0) return null

    const calculateAverageAndTotal = (weeks: WeeklyData[]) => {
      const weeksCount = weeks.length
      if (weeksCount === 0) {
        return { avgCobranza: 0, avgClientes: 0, totalCobranza: 0, totalClientes: 0 }
      }

      const totalCobranza = weeks.reduce((sum, week) => sum + parseFloat(week.paymentsReceived || '0'), 0)
      const totalClientes = weeks.reduce((sum, week) => sum + (week.paymentsCount || 0), 0)

      return {
        avgCobranza: totalCobranza / weeksCount,
        avgClientes: totalClientes / weeksCount,
        totalCobranza,
        totalClientes,
      }
    }

    const current = calculateAverageAndTotal(currentCompletedWeeks)
    const previous = calculateAverageAndTotal(prevWeeklyData)

    const calculatePercentChange = (current: number, previous: number) => {
      return previous > 0 ? ((current - previous) / previous) * 100 : 0
    }

    return {
      currentWeeksCount,
      prevWeeksCount: prevWeeklyData.length,
      // Weekly averages
      currentAvgCobranza: current.avgCobranza,
      currentAvgClientes: current.avgClientes,
      prevAvgCobranza: previous.avgCobranza,
      prevAvgClientes: previous.avgClientes,
      avgCobranzaChange: calculatePercentChange(current.avgCobranza, previous.avgCobranza),
      avgClientesChange: calculatePercentChange(current.avgClientes, previous.avgClientes),
      // Monthly totals
      currentTotalCobranza: current.totalCobranza,
      currentTotalClientes: current.totalClientes,
      prevTotalCobranza: previous.totalCobranza,
      prevTotalClientes: previous.totalClientes,
      // Previous month label
      prevMonthLabel: prevMonth,
      prevYear,
    }
  }, [weeklyData, prevWeeklyData, prevMonth, prevYear])

  // Portfolio stats
  const portfolioStats = useMemo(() => {
    if (!portfolioSummary) return null

    return {
      clientesActivosInicio: portfolioSummary.clientesActivosInicio,
      totalClientesActivos: portfolioSummary.totalClientesActivos,
      clientesAlCorriente: portfolioSummary.clientesAlCorriente,
      clientesEnCV: portfolioSummary.clientesEnCV,
      promedioCV: portfolioSummary.promedioCV,
      semanasCompletadas: portfolioSummary.semanasCompletadas,
      clientBalance: portfolioSummary.clientBalance,
      comparison: portfolioSummary.comparison,
    }
  }, [portfolioSummary])

  // Top locations by active clients
  const topLocations = useMemo(() => {
    return [...locationBreakdown]
      .sort((a, b) => b.clientesActivos - a.clientesActivos)
      .slice(0, 5)
  }, [locationBreakdown])

  return {
    // Data
    stats,
    portfolioStats,
    previousPortfolioStats,
    renovationKPIs,
    weeklyData,
    portfolioWeeklyData,
    previousPortfolioWeeklyData,
    weeklyComparison,
    accounts,
    transactions,
    newLocations,
    topLocations,
    locationBreakdown,
    previousLocationBreakdown,
    routes,
    recoveredDeadDebt,
    criticalClients,
    currentWeekExpenses,
    previousWeekExpenses,
    expensesByCategory,
    currentWeekStart,
    currentWeekEnd,
    previousWeekStart,
    previousWeekEnd,
    // State
    loading,
    error,
    // Actions
    refetch,
  }
}
