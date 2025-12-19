'use client'

import { useMemo } from 'react'
import { useQuery } from '@apollo/client'
import { gql } from '@apollo/client'

// GraphQL Queries
const GET_CEO_DASHBOARD_DATA = gql`
  query CEODashboardData(
    $routeIds: [ID!]!
    $routeId: ID
    $year: Int!
    $month: Int!
    $prevYear: Int!
    $prevMonth: Int!
    $fromDate: DateTime!
    $toDate: DateTime!
    $limit: Int
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
    portfolioReportMonthly(year: $year, month: $month, filters: {}) {
      summary {
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

interface UseCEODashboardParams {
  year: number
  month: number
  selectedRouteId?: string | null
  allRouteIds: string[]
}

export function useCEODashboard({
  year,
  month,
  selectedRouteId,
  allRouteIds,
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

  const routeIdsToUse = selectedRouteId ? [selectedRouteId] : allRouteIds
  const routeIdForAccounts = selectedRouteId || null

  const { data, loading, error, refetch } = useQuery(GET_CEO_DASHBOARD_DATA, {
    variables: {
      routeIds: routeIdsToUse,
      routeId: routeIdForAccounts,
      year,
      month,
      prevYear,
      prevMonth,
      fromDate,
      toDate,
      limit: 8,
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

  // Computed stats
  const stats = useMemo(() => {
    if (!summary) return null

    const now = new Date()
    const completedWeeks = weeklyData.filter((w) => new Date(w.date) <= now)
    const activeWeeks = completedWeeks.length

    const weeklyAveragePayments =
      activeWeeks > 0
        ? completedWeeks.reduce((sum, w) => sum + parseFloat(w.paymentsReceived || '0'), 0) /
          activeWeeks
        : 0

    const weeklyAverageClients =
      activeWeeks > 0
        ? completedWeeks.reduce((sum, w) => sum + (w.paymentsCount || 0), 0) / activeWeeks
        : 0

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

    // Current month - only completed weeks
    const currentCompletedWeeks = weeklyData.filter((w) => new Date(w.date) <= now)
    const currentWeeksCount = currentCompletedWeeks.length

    // Previous month - all weeks (month is complete)
    const prevWeeksCount = prevWeeklyData.length

    if (currentWeeksCount === 0) {
      return null
    }

    // Current month averages
    const currentAvgCobranza = currentCompletedWeeks.reduce(
      (sum, w) => sum + parseFloat(w.paymentsReceived || '0'), 0
    ) / currentWeeksCount

    const currentAvgClientes = currentCompletedWeeks.reduce(
      (sum, w) => sum + (w.paymentsCount || 0), 0
    ) / currentWeeksCount

    const currentTotalCobranza = currentCompletedWeeks.reduce(
      (sum, w) => sum + parseFloat(w.paymentsReceived || '0'), 0
    )

    const currentTotalClientes = currentCompletedWeeks.reduce(
      (sum, w) => sum + (w.paymentsCount || 0), 0
    )

    // Previous month averages (if data exists)
    let prevAvgCobranza = 0
    let prevAvgClientes = 0
    let prevTotalCobranza = 0
    let prevTotalClientes = 0

    if (prevWeeksCount > 0) {
      prevAvgCobranza = prevWeeklyData.reduce(
        (sum, w) => sum + parseFloat(w.paymentsReceived || '0'), 0
      ) / prevWeeksCount

      prevAvgClientes = prevWeeklyData.reduce(
        (sum, w) => sum + (w.paymentsCount || 0), 0
      ) / prevWeeksCount

      prevTotalCobranza = prevWeeklyData.reduce(
        (sum, w) => sum + parseFloat(w.paymentsReceived || '0'), 0
      )

      prevTotalClientes = prevWeeklyData.reduce(
        (sum, w) => sum + (w.paymentsCount || 0), 0
      )
    }

    // Calculate changes
    const avgCobranzaChange = prevAvgCobranza > 0
      ? ((currentAvgCobranza - prevAvgCobranza) / prevAvgCobranza) * 100
      : 0

    const avgClientesChange = prevAvgClientes > 0
      ? ((currentAvgClientes - prevAvgClientes) / prevAvgClientes) * 100
      : 0

    return {
      currentWeeksCount,
      prevWeeksCount,
      // Weekly averages
      currentAvgCobranza,
      currentAvgClientes,
      prevAvgCobranza,
      prevAvgClientes,
      avgCobranzaChange,
      avgClientesChange,
      // Monthly totals (current only has completed weeks)
      currentTotalCobranza,
      currentTotalClientes,
      prevTotalCobranza,
      prevTotalClientes,
      // Previous month label
      prevMonthLabel: prevMonth,
      prevYear,
    }
  }, [weeklyData, prevWeeklyData, prevMonth, prevYear])

  // Portfolio stats
  const portfolioStats = useMemo(() => {
    if (!portfolioSummary) return null

    return {
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
    renovationKPIs,
    weeklyData,
    weeklyComparison,
    accounts,
    transactions,
    newLocations,
    topLocations,
    routes,
    recoveredDeadDebt,
    // State
    loading,
    error,
    // Actions
    refetch,
  }
}
