'use client'

import { useMemo, useState, useCallback, useEffect } from 'react'
import { useQuery, useMutation, useLazyQuery, gql } from '@apollo/client'
import {
  GET_PORTFOLIO_REPORT_WEEKLY,
  GET_PORTFOLIO_REPORT_MONTHLY,
  GET_ACTIVE_CLIENTS_WITH_CV_STATUS,
  GET_CURRENT_ACTIVE_WEEK,
  GENERATE_PORTFOLIO_REPORT_PDF,
  GET_PORTFOLIO_BY_LOCALITY,
  GET_LOCALITY_CLIENTS,
} from '@/graphql/queries/portfolioReport'

// =============================================================================
// FRONTEND TYPES FOR PORTFOLIO REPORT
// =============================================================================
//
// Note: These types mirror @solufacil/business-logic/types/portfolio but use
// `string` for dates instead of `Date` because GraphQL serializes dates as
// ISO strings. This is intentional to avoid unnecessary conversions in the
// frontend layer.
//
// If you need to use Date objects, convert with: new Date(dateString)
// =============================================================================

export type PeriodType = 'WEEKLY' | 'MONTHLY'
export type Trend = 'UP' | 'DOWN' | 'STABLE'
export type CVStatus = 'AL_CORRIENTE' | 'EN_CV' | 'EXCLUIDO'

export interface WeekRange {
  start: string
  end: string
  weekNumber: number
  year: number
}

export interface ClientBalanceData {
  nuevos: number
  terminadosSinRenovar: number
  renovados: number
  balance: number
  trend: Trend
}

export interface PeriodComparison {
  previousClientesActivos: number
  previousClientesEnCV: number
  previousBalance: number
  cvChange: number
  balanceChange: number
}

export interface PortfolioSummary {
  totalClientesActivos: number
  clientesAlCorriente: number
  clientesEnCV: number
  promedioCV?: number
  semanasCompletadas?: number
  totalSemanas?: number
  clientBalance: ClientBalanceData
  comparison: PeriodComparison | null
}

export interface WeeklyPortfolioData {
  weekRange: WeekRange
  clientesActivos: number
  clientesEnCV: number
  balance: number
  isCompleted: boolean
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

export interface RenovationKPIs {
  totalRenovaciones: number
  totalCierresSinRenovar: number
  tasaRenovacion: number
  tendencia: Trend
}

export interface PortfolioReport {
  reportDate: string
  periodType: PeriodType
  year: number
  month?: number
  weekNumber?: number
  summary: PortfolioSummary
  weeklyData: WeeklyPortfolioData[]
  byLocation: LocationBreakdown[]
  renovationKPIs: RenovationKPIs
}

export interface ActiveClientStatus {
  loanId: string
  borrowerId: string
  clientName: string
  pendingAmount: number
  cvStatus: CVStatus
  daysSinceLastPayment: number | null
  locationName: string
  routeName: string
}

export interface PortfolioFilters {
  locationIds?: string[]
  routeIds?: string[]
  loantypeIds?: string[]
}

export interface PDFGenerationResult {
  success: boolean
  url?: string
  base64?: string
  filename: string
  generatedAt: string
  error?: string
}

interface UsePortfolioReportParams {
  periodType: PeriodType
  year: number
  month?: number
  weekNumber?: number
  filters?: PortfolioFilters
}

export function usePortfolioReport({
  periodType,
  year,
  month,
  weekNumber,
  filters,
}: UsePortfolioReportParams) {
  // Query for current active week
  const {
    data: currentWeekData,
    loading: currentWeekLoading,
  } = useQuery(GET_CURRENT_ACTIVE_WEEK)

  // Weekly report query
  const {
    data: weeklyData,
    loading: weeklyLoading,
    error: weeklyError,
    refetch: refetchWeekly,
  } = useQuery(GET_PORTFOLIO_REPORT_WEEKLY, {
    variables: {
      year,
      weekNumber: weekNumber ?? currentWeekData?.currentActiveWeek?.weekNumber ?? 1,
      filters: filters ?? {},
    },
    skip: periodType !== 'WEEKLY' || (!weekNumber && !currentWeekData?.currentActiveWeek),
    fetchPolicy: 'cache-and-network',
  })

  // Monthly report query
  const {
    data: monthlyData,
    loading: monthlyLoading,
    error: monthlyError,
    refetch: refetchMonthly,
  } = useQuery(GET_PORTFOLIO_REPORT_MONTHLY, {
    variables: {
      year,
      month: month ?? new Date().getMonth() + 1,
      filters: filters ?? {},
    },
    skip: periodType !== 'MONTHLY',
    fetchPolicy: 'cache-and-network',
  })

  // PDF generation mutation
  const [generatePDFMutation, { loading: pdfLoading }] = useMutation(GENERATE_PORTFOLIO_REPORT_PDF)

  // Get the appropriate report data
  const report: PortfolioReport | null = useMemo(() => {
    if (periodType === 'WEEKLY') {
      return weeklyData?.portfolioReportWeekly ?? null
    }
    return monthlyData?.portfolioReportMonthly ?? null
  }, [periodType, weeklyData, monthlyData])

  // Current active week
  const currentActiveWeek: WeekRange | null = useMemo(() => {
    return currentWeekData?.currentActiveWeek ?? null
  }, [currentWeekData])

  // Loading state
  const loading = useMemo(() => {
    if (periodType === 'WEEKLY') {
      return weeklyLoading || currentWeekLoading
    }
    return monthlyLoading
  }, [periodType, weeklyLoading, monthlyLoading, currentWeekLoading])

  // Error state
  const error = useMemo(() => {
    if (periodType === 'WEEKLY') {
      return weeklyError
    }
    return monthlyError
  }, [periodType, weeklyError, monthlyError])

  // Refetch function
  const refetch = useCallback(async () => {
    if (periodType === 'WEEKLY') {
      await refetchWeekly()
    } else {
      await refetchMonthly()
    }
  }, [periodType, refetchWeekly, refetchMonthly])

  // Generate PDF function
  const generatePDF = useCallback(async (): Promise<PDFGenerationResult | null> => {
    try {
      const result = await generatePDFMutation({
        variables: {
          periodType,
          year,
          month: periodType === 'MONTHLY' ? month : undefined,
          weekNumber: periodType === 'WEEKLY' ? weekNumber : undefined,
          filters: filters ?? {},
        },
      })
      return result.data?.generatePortfolioReportPDF ?? null
    } catch (err) {
      console.error('Error generating PDF:', err)
      return null
    }
  }, [generatePDFMutation, periodType, year, month, weekNumber, filters])

  return {
    // Data
    report,
    currentActiveWeek,
    // State
    loading,
    error,
    pdfLoading,
    // Actions
    refetch,
    generatePDF,
  }
}

// Separate hook for active clients list (for detailed table view)
export function useActiveClientsWithCVStatus(filters?: PortfolioFilters) {
  const {
    data,
    loading,
    error,
    refetch,
  } = useQuery(GET_ACTIVE_CLIENTS_WITH_CV_STATUS, {
    variables: { filters: filters ?? {} },
    fetchPolicy: 'cache-and-network',
  })

  const clients: ActiveClientStatus[] = useMemo(() => {
    return data?.activeClientsWithCVStatus ?? []
  }, [data])

  // Computed stats
  const stats = useMemo(() => {
    const total = clients.length
    const enCV = clients.filter((c) => c.cvStatus === 'EN_CV').length
    const alCorriente = clients.filter((c) => c.cvStatus === 'AL_CORRIENTE').length
    const cvPercentage = total > 0 ? (enCV / total) * 100 : 0

    return {
      total,
      enCV,
      alCorriente,
      cvPercentage,
    }
  }, [clients])

  // Group by route
  const byRoute = useMemo(() => {
    const grouped = new Map<string, ActiveClientStatus[]>()
    clients.forEach((client) => {
      const routeName = client.routeName || 'Sin ruta'
      if (!grouped.has(routeName)) {
        grouped.set(routeName, [])
      }
      grouped.get(routeName)!.push(client)
    })
    return grouped
  }, [clients])

  return {
    clients,
    stats,
    byRoute,
    loading,
    error,
    refetch,
  }
}

// Helper hook for period navigation
export function usePeriodNavigation(initialPeriodType: PeriodType = 'WEEKLY') {
  const [periodType, setPeriodType] = useState<PeriodType>(initialPeriodType)
  const [year, setYear] = useState(() => new Date().getFullYear())
  const [month, setMonth] = useState(() => new Date().getMonth() + 1)
  const [weekNumber, setWeekNumber] = useState<number | undefined>()

  const goToPreviousPeriod = useCallback(() => {
    if (periodType === 'WEEKLY') {
      if (weekNumber && weekNumber > 1) {
        setWeekNumber(weekNumber - 1)
      } else {
        // Go to last week of previous year
        setYear((y) => y - 1)
        setWeekNumber(52) // Approximate
      }
    } else {
      if (month > 1) {
        setMonth(month - 1)
      } else {
        setYear((y) => y - 1)
        setMonth(12)
      }
    }
  }, [periodType, weekNumber, month])

  const goToNextPeriod = useCallback(() => {
    if (periodType === 'WEEKLY') {
      if (weekNumber && weekNumber < 52) {
        setWeekNumber(weekNumber + 1)
      } else {
        setYear((y) => y + 1)
        setWeekNumber(1)
      }
    } else {
      if (month < 12) {
        setMonth(month + 1)
      } else {
        setYear((y) => y + 1)
        setMonth(1)
      }
    }
  }, [periodType, weekNumber, month])

  const goToCurrentPeriod = useCallback(() => {
    const now = new Date()
    setYear(now.getFullYear())
    setMonth(now.getMonth() + 1)
    setWeekNumber(undefined) // Will use currentActiveWeek from query
  }, [])

  return {
    periodType,
    year,
    month,
    weekNumber,
    setPeriodType,
    setYear,
    setMonth,
    setWeekNumber,
    goToPreviousPeriod,
    goToNextPeriod,
    goToCurrentPeriod,
  }
}

// ============================================
// Locality Report Types & Hook
// ============================================

export type ClientCategory =
  | 'NUEVO'
  | 'RENOVADO'
  | 'REINTEGRO'
  | 'ACTIVO'
  | 'FINALIZADO'
  | 'EN_CV'

export interface LocalityWeekData {
  weekRange: WeekRange
  clientesActivos: number
  clientesAlCorriente: number
  clientesEnCV: number
  nuevos: number
  renovados: number
  reintegros: number
  finalizados: number
  balance: number
  isCompleted: boolean
}

export interface LocalitySummary {
  totalClientesActivos: number
  totalClientesAlCorriente: number
  totalClientesEnCV: number
  totalNuevos: number
  totalRenovados: number
  totalReintegros: number
  totalFinalizados: number
  balance: number
  /** Promedio de clientes al corriente en semanas completadas */
  alCorrientePromedio: number
  cvPromedio: number
  porcentajePagando: number
}

export interface LocalityBreakdownDetail {
  localityId: string
  localityName: string
  routeId: string | null
  routeName: string | null
  weeklyData: LocalityWeekData[]
  summary: LocalitySummary
}

export interface LocalityReport {
  periodType: PeriodType
  year: number
  month?: number
  weekNumber?: number
  weeks: WeekRange[]
  localities: LocalityBreakdownDetail[]
  totals: LocalitySummary
}

export interface LocalityClientDetail {
  loanId: string
  clientName: string
  clientCode: string
  amountGived: number
  pendingAmount: number
  signDate: string
  cvStatus: CVStatus
  daysSinceLastPayment: number | null
  loanType: string
  category: ClientCategory
}

interface UseLocalityReportParams {
  year: number
  month: number
  filters?: PortfolioFilters
  skip?: boolean
}

export function useLocalityReport({
  year,
  month,
  filters,
  skip = false,
}: UseLocalityReportParams) {
  const {
    data,
    loading,
    error,
    refetch,
  } = useQuery(GET_PORTFOLIO_BY_LOCALITY, {
    variables: {
      year,
      month,
      filters: filters ?? {},
    },
    skip: skip || !year || !month,
    fetchPolicy: 'cache-and-network',
  })

  const localityReport: LocalityReport | null = useMemo(() => {
    return data?.portfolioByLocality ?? null
  }, [data])

  return {
    localityReport,
    loading,
    error,
    refetch,
  }
}

interface UseLocalityClientsParams {
  localityId: string
  year: number
  month: number
  weekNumber?: number
  category?: ClientCategory
}

// ============================================
// Annual Portfolio Data Hook
// ============================================

export interface AnnualPortfolioDataPoint {
  month: number
  year: number
  label: string
  clientesActivos: number
  alCorrientePromedio: number
  cvPromedio: number
  renovaciones: number
  nuevos: number
  balance: number
  tasaRenovacion?: number
}

const MONTH_LABELS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

interface UseAnnualPortfolioDataParams {
  year: number
  currentMonth: number // Fetch from Jan to this month
}

export function useAnnualPortfolioData({ year, currentMonth }: UseAnnualPortfolioDataParams) {
  const [annualData, setAnnualData] = useState<AnnualPortfolioDataPoint[]>([])
  const [loading, setLoading] = useState(false)

  const [fetchMonthReport] = useLazyQuery(GET_PORTFOLIO_REPORT_MONTHLY, {
    fetchPolicy: 'cache-first',
  })

  // Fetch annual data when year or currentMonth changes
  useEffect(() => {
    let isCancelled = false

    const fetchAllMonths = async () => {
      setLoading(true)
      const results: AnnualPortfolioDataPoint[] = []

      // Fetch all months up to current month
      const fetchPromises = []
      for (let m = 1; m <= currentMonth; m++) {
        fetchPromises.push(
          fetchMonthReport({
            variables: { year, month: m, filters: {} },
          }).then((result) => ({
            month: m,
            data: result.data?.portfolioReportMonthly as PortfolioReport | null,
          }))
        )
      }

      try {
        const allResults = await Promise.all(fetchPromises)

        if (isCancelled) return

        for (const { month: m, data } of allResults) {
          if (data) {
            results.push({
              month: m,
              year,
              label: MONTH_LABELS[m - 1],
              clientesActivos: data.summary.totalClientesActivos,
              alCorrientePromedio: data.summary.promedioCV !== undefined
                ? data.summary.clientesAlCorriente
                : data.summary.clientesAlCorriente,
              cvPromedio: data.summary.promedioCV ?? data.summary.clientesEnCV,
              renovaciones: data.renovationKPIs.totalRenovaciones,
              nuevos: data.summary.clientBalance.nuevos,
              balance: data.summary.clientBalance.balance,
              tasaRenovacion: data.renovationKPIs.tasaRenovacion,
            })
          }
        }

        // Sort by month
        results.sort((a, b) => a.month - b.month)
        setAnnualData(results)
      } catch (error) {
        console.error('Error fetching annual data:', error)
      } finally {
        if (!isCancelled) {
          setLoading(false)
        }
      }
    }

    fetchAllMonths()

    return () => {
      isCancelled = true
    }
  }, [year, currentMonth, fetchMonthReport])

  return {
    annualData,
    loading,
  }
}

export function useLocalityClients() {
  const [fetchClients, { data, loading, error }] = useLazyQuery(GET_LOCALITY_CLIENTS, {
    fetchPolicy: 'network-only', // Always fetch fresh data to avoid stale cache
  })

  const clients: LocalityClientDetail[] = useMemo(() => {
    return data?.localityClients ?? []
  }, [data])

  const getClients = useCallback(
    async (params: UseLocalityClientsParams) => {
      await fetchClients({
        variables: {
          localityId: params.localityId,
          year: params.year,
          month: params.month,
          weekNumber: params.weekNumber,
          category: params.category,
        },
      })
    },
    [fetchClients]
  )

  // Stats computed from clients
  const stats = useMemo(() => {
    const total = clients.length
    const byCategory = {
      NUEVO: clients.filter((c) => c.category === 'NUEVO').length,
      RENOVADO: clients.filter((c) => c.category === 'RENOVADO').length,
      REINTEGRO: clients.filter((c) => c.category === 'REINTEGRO').length,
      ACTIVO: clients.filter((c) => c.category === 'ACTIVO').length,
      FINALIZADO: clients.filter((c) => c.category === 'FINALIZADO').length,
      EN_CV: clients.filter((c) => c.category === 'EN_CV').length,
    }
    return { total, byCategory }
  }, [clients])

  return {
    clients,
    stats,
    loading,
    error,
    getClients,
  }
}

// =============================================================================
// RECOVERED DEAD DEBT HOOK
// =============================================================================

const GET_RECOVERED_DEAD_DEBT = gql`
  query RecoveredDeadDebt($year: Int!, $month: Int!, $routeId: ID) {
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

interface UseRecoveredDeadDebtParams {
  year: number
  month: number
  routeId?: string | null
}

export function useRecoveredDeadDebt({ year, month, routeId }: UseRecoveredDeadDebtParams) {
  const { data, loading, error, refetch } = useQuery(GET_RECOVERED_DEAD_DEBT, {
    variables: { year, month, routeId: routeId || null },
    fetchPolicy: 'cache-and-network',
  })

  const summary: RecoveredDeadDebtSummary | null = useMemo(() => {
    return data?.recoveredDeadDebt?.summary || null
  }, [data])

  const payments: RecoveredDeadDebtPayment[] = useMemo(() => {
    return data?.recoveredDeadDebt?.payments || []
  }, [data])

  return {
    summary,
    payments,
    loading,
    error,
    refetch,
  }
}
