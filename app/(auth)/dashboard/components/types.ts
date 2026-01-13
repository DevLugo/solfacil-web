// Shared types for dashboard components

export interface Route {
  id: string
  name: string
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

export interface TopLocation {
  locationId: string
  locationName: string
  routeName: string
  clientesActivos: number
  clientesAlCorriente: number
  clientesEnCV: number
}

export interface RecoveredDeadDebtSummary {
  totalRecovered: string
  paymentsCount: number
  loansCount: number
  clientsCount: number
}

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

export interface RecoveredDeadDebtData {
  summary: RecoveredDeadDebtSummary
  payments: RecoveredDeadDebtPayment[]
}

export interface WeeklyChartDataPoint {
  week: string
  cobranza: number
  clientesPagaron: number
}

export interface WeeklyComparisonData {
  currentWeeksCount: number
  prevMonthLabel: number
  currentAvgCobranza: number
  prevAvgCobranza: number
  avgCobranzaChange: number
  currentAvgClientes: number
  prevAvgClientes: number
  avgClientesChange: number
  currentTotalCobranza: number
  prevTotalCobranza: number
  currentTotalClientes: number
  prevTotalClientes: number
}
