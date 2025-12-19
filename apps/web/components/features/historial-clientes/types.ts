// Types for Client History Feature

export interface ClientSearchResult {
  id: string
  name: string
  clientCode: string
  phone: string | null
  address: string | null
  route: string | null
  location: string | null
  municipality: string | null
  state: string | null
  latestLoanDate: string | null
  hasLoans: boolean
  hasBeenCollateral: boolean
  totalLoans: number
  activeLoans: number
  finishedLoans: number
  collateralLoans: number
}

export interface ClientInfo {
  id: string
  fullName: string
  clientCode: string
  phones: string[]
  addresses: ClientAddressInfo[]
  leader: LeaderInfo | null
}

export interface ClientAddressInfo {
  street: string
  city: string | null
  location: string
  route: string
}

export interface LeaderInfo {
  name: string
  route: string
  location: string
  municipality: string | null
  state: string | null
  phone: string | null
}

export interface ClientSummary {
  totalLoansAsClient: number
  totalLoansAsCollateral: number
  activeLoansAsClient: number
  activeLoansAsCollateral: number
  totalAmountRequestedAsClient: number
  totalAmountPaidAsClient: number
  currentPendingDebtAsClient: number
  hasBeenClient: boolean
  hasBeenCollateral: boolean
}

export interface LoanHistoryDetail {
  id: string
  signDate: string
  signDateFormatted: string
  finishedDate: string | null
  finishedDateFormatted: string | null
  renewedDate: string | null
  loanType: string
  amountRequested: number
  totalAmountDue: number
  interestAmount: number
  totalPaid: number
  pendingDebt: number
  daysSinceSign: number
  status: LoanStatus
  wasRenewed: boolean
  weekDuration: number
  rate: number
  leadName: string | null
  routeName: string | null
  paymentsCount: number
  payments: LoanPaymentDetail[]
  noPaymentPeriods: NoPaymentPeriod[]
  renewedFrom: string | null
  renewedTo: string | null
  avalName: string | null
  avalPhone: string | null
  clientName: string | null
  clientDui: string | null
}

export type LoanStatus = 'ACTIVE' | 'FINISHED' | 'RENOVATED' | 'CANCELLED'

export interface LoanPaymentDetail {
  id: string
  amount: number
  receivedAt: string
  receivedAtFormatted: string
  type: string
  paymentMethod: PaymentMethod
  paymentNumber: number
  balanceBeforePayment: number
  balanceAfterPayment: number
}

export type PaymentMethod = 'CASH' | 'MONEY_TRANSFER'

export interface NoPaymentPeriod {
  id: string
  startDate: string
  endDate: string
  startDateFormatted: string
  endDateFormatted: string
  weekCount: number
}

export interface ClientHistoryData {
  client: ClientInfo
  summary: ClientSummary
  loansAsClient: LoanHistoryDetail[]
  loansAsCollateral: LoanHistoryDetail[]
}

// Payment chronology types
export type CoverageType = 'FULL' | 'COVERED_BY_SURPLUS' | 'PARTIAL' | 'MISS'

export interface PaymentChronologyItem {
  id: string
  date: string
  dateFormatted: string
  type: 'PAYMENT' | 'NO_PAYMENT'
  description: string
  amount?: number
  paymentMethod?: string
  balanceBefore?: number
  balanceAfter?: number
  paymentNumber?: number
  weekCount?: number
  weekIndex?: number
  weeklyExpected?: number
  weeklyPaid?: number
  surplusBefore?: number
  surplusAfter?: number
  coverageType?: CoverageType
}

// UI-specific types for components
export interface LoanCardData {
  id: string
  date: string
  status: 'active' | 'completed' | 'renewed'
  amount: number
  totalAmount: number
  paidAmount: number
  remainingAmount: number
  guarantor: {
    name: string
    phone: string
  }
  weekCount: number
  interestRate: number
  interestAmount: number
  payments: PaymentRowData[]
  renovationId?: string
}

export interface PaymentRowData {
  id: number
  date: string
  expected: number
  paid: number
  surplus: number
  status: 'paid' | 'partial' | 'missed' | 'overpaid' | 'upcoming'
  remainingDebt?: number
}

export interface ClientProfileData {
  name: string
  id: string
  phone: string
  roles: string[]
  since: string
  leader: LeaderInfo
  loanCount: number
}
