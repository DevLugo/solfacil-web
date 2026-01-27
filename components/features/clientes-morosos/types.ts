// Types for Bad Debt Clients (Clientes Morosos) Feature

export interface BadDebtClientItem {
  id: string
  loanId: string
  clientName: string
  clientCode: string | null
  clientPhone: string | null
  amountRequested: string
  totalAmountDue: string
  totalPaid: string
  pendingDebt: string
  locationName: string | null
  municipalityName: string | null
  routeName: string | null
  leadName: string | null
  leadPhone: string | null
  collateralName: string | null
  collateralPhone: string | null
  signDate: string
  badDebtDate: string | null
  cleanupDate: string | null
  lastPaymentDate: string | null
  isFromCleanup: boolean
  borrowerPersonalDataId: string
}

export interface BadDebtClientsResult {
  clients: BadDebtClientItem[]
  totalCount: number
  hasMore: boolean
}

export interface BadDebtFilters {
  routeId?: string
  locationId?: string
}

export interface RouteOption {
  id: string
  name: string
}

export interface LocationOption {
  id: string
  name: string
  routeId?: string
}
