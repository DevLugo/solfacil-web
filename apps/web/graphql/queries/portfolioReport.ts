import { gql } from '@apollo/client'

// Fragment for WeekRange
const WEEK_RANGE_FRAGMENT = gql`
  fragment WeekRangeFields on WeekRange {
    start
    end
    weekNumber
    year
  }
`

// Fragment for RenovationKPIs
const RENOVATION_KPIS_FRAGMENT = gql`
  fragment RenovationKPIsFields on RenovationKPIs {
    totalRenovaciones
    totalCierresSinRenovar
    tasaRenovacion
    tendencia
  }
`

// Fragment for LocationBreakdown
const LOCATION_BREAKDOWN_FRAGMENT = gql`
  fragment LocationBreakdownFields on LocationBreakdown {
    locationId
    locationName
    routeId
    routeName
    clientesActivos
    clientesAlCorriente
    clientesEnCV
    balance
  }
`

// Fragment for PortfolioSummary
const PORTFOLIO_SUMMARY_FRAGMENT = gql`
  fragment PortfolioSummaryFields on PortfolioSummary {
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
      previousBalance
      cvChange
      balanceChange
    }
  }
`

// Fragment for WeeklyPortfolioData
const WEEKLY_PORTFOLIO_DATA_FRAGMENT = gql`
  fragment WeeklyPortfolioDataFields on WeeklyPortfolioData {
    weekRange {
      ...WeekRangeFields
    }
    clientesActivos
    clientesEnCV
    balance
    isCompleted
  }
  ${WEEK_RANGE_FRAGMENT}
`

// Full PortfolioReport fragment
export const PORTFOLIO_REPORT_FRAGMENT = gql`
  fragment PortfolioReportFields on PortfolioReport {
    reportDate
    periodType
    year
    month
    weekNumber
    summary {
      ...PortfolioSummaryFields
    }
    weeklyData {
      ...WeeklyPortfolioDataFields
    }
    byLocation {
      ...LocationBreakdownFields
    }
    renovationKPIs {
      ...RenovationKPIsFields
    }
  }
  ${PORTFOLIO_SUMMARY_FRAGMENT}
  ${WEEKLY_PORTFOLIO_DATA_FRAGMENT}
  ${LOCATION_BREAKDOWN_FRAGMENT}
  ${RENOVATION_KPIS_FRAGMENT}
`

// Query: Get weekly portfolio report
export const GET_PORTFOLIO_REPORT_WEEKLY = gql`
  query GetPortfolioReportWeekly(
    $year: Int!
    $weekNumber: Int!
    $filters: PortfolioFiltersInput
  ) {
    portfolioReportWeekly(year: $year, weekNumber: $weekNumber, filters: $filters) {
      ...PortfolioReportFields
    }
  }
  ${PORTFOLIO_REPORT_FRAGMENT}
`

// Query: Get monthly portfolio report
export const GET_PORTFOLIO_REPORT_MONTHLY = gql`
  query GetPortfolioReportMonthly(
    $year: Int!
    $month: Int!
    $filters: PortfolioFiltersInput
  ) {
    portfolioReportMonthly(year: $year, month: $month, filters: $filters) {
      ...PortfolioReportFields
    }
  }
  ${PORTFOLIO_REPORT_FRAGMENT}
`

// Query: Get active clients with CV status
export const GET_ACTIVE_CLIENTS_WITH_CV_STATUS = gql`
  query GetActiveClientsWithCVStatus($filters: PortfolioFiltersInput) {
    activeClientsWithCVStatus(filters: $filters) {
      loanId
      borrowerId
      clientName
      pendingAmount
      cvStatus
      daysSinceLastPayment
      locationName
      routeName
    }
  }
`

// Query: Get current active week
export const GET_CURRENT_ACTIVE_WEEK = gql`
  query GetCurrentActiveWeek {
    currentActiveWeek {
      ...WeekRangeFields
    }
  }
  ${WEEK_RANGE_FRAGMENT}
`

// Mutation: Generate PDF
export const GENERATE_PORTFOLIO_REPORT_PDF = gql`
  mutation GeneratePortfolioReportPDF(
    $periodType: PeriodType!
    $year: Int!
    $month: Int
    $weekNumber: Int
    $filters: PortfolioFiltersInput
  ) {
    generatePortfolioReportPDF(
      periodType: $periodType
      year: $year
      month: $month
      weekNumber: $weekNumber
      filters: $filters
    ) {
      success
      url
      base64
      filename
      generatedAt
      error
    }
  }
`

// ============================================
// Locality Report Queries (Vista por Localidad)
// ============================================

// Fragment for LocalityWeekData
const LOCALITY_WEEK_DATA_FRAGMENT = gql`
  fragment LocalityWeekDataFields on LocalityWeekData {
    weekRange {
      ...WeekRangeFields
    }
    clientesActivos
    clientesAlCorriente
    clientesEnCV
    nuevos
    renovados
    reintegros
    finalizados
    balance
    isCompleted
  }
  ${WEEK_RANGE_FRAGMENT}
`

// Fragment for LocalitySummary
const LOCALITY_SUMMARY_FRAGMENT = gql`
  fragment LocalitySummaryFields on LocalitySummary {
    totalClientesActivos
    totalClientesAlCorriente
    totalClientesEnCV
    totalNuevos
    totalRenovados
    totalReintegros
    totalFinalizados
    balance
    cvPromedio
    porcentajePagando
  }
`

// Fragment for LocalityBreakdownDetail
const LOCALITY_BREAKDOWN_DETAIL_FRAGMENT = gql`
  fragment LocalityBreakdownDetailFields on LocalityBreakdownDetail {
    localityId
    localityName
    routeId
    routeName
    weeklyData {
      ...LocalityWeekDataFields
    }
    summary {
      ...LocalitySummaryFields
    }
  }
  ${LOCALITY_WEEK_DATA_FRAGMENT}
  ${LOCALITY_SUMMARY_FRAGMENT}
`

// Query: Get portfolio by locality
export const GET_PORTFOLIO_BY_LOCALITY = gql`
  query GetPortfolioByLocality(
    $year: Int!
    $month: Int!
    $filters: PortfolioFiltersInput
  ) {
    portfolioByLocality(year: $year, month: $month, filters: $filters) {
      periodType
      year
      month
      weekNumber
      weeks {
        ...WeekRangeFields
      }
      localities {
        ...LocalityBreakdownDetailFields
      }
      totals {
        ...LocalitySummaryFields
      }
    }
  }
  ${WEEK_RANGE_FRAGMENT}
  ${LOCALITY_BREAKDOWN_DETAIL_FRAGMENT}
  ${LOCALITY_SUMMARY_FRAGMENT}
`

// Query: Get clients for a locality (drill-down)
export const GET_LOCALITY_CLIENTS = gql`
  query GetLocalityClients(
    $localityId: ID!
    $year: Int!
    $month: Int!
    $weekNumber: Int
    $category: ClientCategory
  ) {
    localityClients(
      localityId: $localityId
      year: $year
      month: $month
      weekNumber: $weekNumber
      category: $category
    ) {
      loanId
      clientName
      clientCode
      amountGived
      pendingAmount
      signDate
      cvStatus
      daysSinceLastPayment
      loanType
      category
    }
  }
`
