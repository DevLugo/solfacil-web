// Types for Creditos Tab

// Client states for visual feedback in UnifiedClientAutocomplete
export type ClientState = 'existing' | 'new' | 'edited' | 'renewed' | 'newClient'

// Action types for tracking what to do with client data
export type ClientAction = 'connect' | 'create' | 'update' | 'clear'

// Active loan data for renewal functionality
export interface ActiveLoanData {
  id: string
  requestedAmount: string
  amountGived: string
  pendingAmountStored: string
  expectedWeeklyPayment: string
  totalPaid: string
  loantype: LoanType
  collaterals: PersonalData[]
  leadLocationName?: string
  leaderName?: string
}

// Unified value type that can represent either borrower or personal data (aval)
export interface UnifiedClientValue {
  id?: string
  personalDataId?: string // Track for mutations
  phoneId?: string // Track for mutations
  fullName: string
  phone?: string
  locationId?: string
  locationName?: string
  isFromCurrentLocation: boolean
  loanFinishedCount?: number
  hasActiveLoans?: boolean
  pendingDebtAmount?: number // Total pending debt (for display)
  // Active loan data for renewals
  activeLoan?: ActiveLoanData
  // For tracking changes
  originalFullName?: string
  originalPhone?: string
  // State tracking
  clientState: ClientState
  action: ClientAction
}

export interface LoanType {
  id: string
  name: string
  weekDuration: number
  rate: string
  loanPaymentComission: string
  loanGrantedComission: string
}

export interface PersonalData {
  id: string
  fullName: string
  clientCode?: string
  phones: Array<{ id: string; number: string }>
  addresses: Array<{
    id: string
    location: {
      id: string
      name: string
      municipalityRelation?: {
        name: string
        stateRelation?: { name: string }
      }
    }
  }>
}

export interface Borrower {
  id: string
  loanFinishedCount: number
  personalData: PersonalData
}

export interface BorrowerSearchResult {
  id: string
  personalData: PersonalData
  loanFinishedCount: number
  hasActiveLoans: boolean
  pendingDebtAmount?: string // Total pending debt across all active loans
  locationId?: string
  locationName?: string
  isFromCurrentLocation: boolean
}

export interface Loan {
  id: string
  requestedAmount: string
  amountGived: string
  signDate: string
  comissionAmount: string
  totalDebtAcquired: string
  expectedWeeklyPayment: string
  pendingAmountStored: string
  totalPaid: string
  profitAmount: string
  status: string
  loantype: LoanType
  borrower: Borrower
  collaterals: PersonalData[]
  lead: {
    id: string
    personalData: {
      fullName: string
      addresses: Array<{
        location: { id: string; name: string }
      }>
    }
  }
  previousLoan: {
    id: string
    requestedAmount: string
    amountGived: string
    profitAmount: string
    pendingAmountStored: string
    borrower: {
      personalData: { fullName: string }
    }
  } | null
}

export interface PreviousLoan {
  id: string
  requestedAmount: string
  amountGived: string
  profitAmount: string
  signDate: string
  pendingAmountStored: string
  expectedWeeklyPayment: string
  totalPaid: string
  status: string
  loantype: LoanType
  borrower: Borrower
  collaterals: PersonalData[]
  lead?: {
    personalData: {
      addresses: Array<{
        location: { id: string; name: string }
      }>
    }
  }
}

export interface Account {
  id: string
  name: string
  type: string
  amount: string
  accountBalance?: string
}

// Pending loan to be created in batch
export interface PendingLoan {
  tempId: string
  requestedAmount: string
  amountGived: string
  loantypeId: string
  loantypeName: string
  weekDuration: number
  comissionAmount: string // Commission for loan grant
  previousLoanId?: string
  borrowerId?: string
  borrowerPersonalDataId?: string // Track for editing
  borrowerPhoneId?: string // Track for editing
  borrowerName: string
  borrowerPhone?: string
  newBorrower?: CreateBorrowerInput
  collateralIds: string[]
  collateralPersonalDataId?: string // Track for editing (same as collateralIds[0] for existing avales)
  collateralPhoneId?: string // Track for editing
  collateralName?: string
  collateralPhone?: string
  newCollateral?: CreatePersonalDataInput
  firstPayment?: FirstPaymentInput
  isFromDifferentLocation: boolean
  isRenewal: boolean
}

export interface CreateBorrowerInput {
  personalData: CreatePersonalDataInput
}

export interface CreatePersonalDataInput {
  fullName: string
  clientCode?: string
  birthDate?: Date
  phones?: { number: string }[]
  addresses?: {
    street: string
    numberInterior?: string
    numberExterior?: string
    zipCode?: string
    locationId: string
  }[]
}

export interface FirstPaymentInput {
  amount: string
  comission?: string
  paymentMethod: 'CASH' | 'MONEY_TRANSFER'
}

export interface CreateLoansInBatchInput {
  loans: CreateSingleLoanInput[]
  sourceAccountId: string
  signDate: Date
  leadId: string
  grantorId: string
}

export interface CreateSingleLoanInput {
  tempId: string
  requestedAmount: string
  amountGived: string
  loantypeId: string
  previousLoanId?: string
  borrowerId?: string
  newBorrower?: CreateBorrowerInput
  collateralIds?: string[]
  newCollateral?: CreatePersonalDataInput
  firstPayment?: FirstPaymentInput
  isFromDifferentLocation?: boolean
}

export interface UpdateLoanExtendedInput {
  loantypeId?: string
  requestedAmount?: string
  borrowerName?: string
  borrowerPhone?: string
  comissionAmount?: string
  collateralIds?: string[]
  newCollateral?: CreatePersonalDataInput
  collateralPhone?: string
}

// Totals for display
export interface CreditosTotals {
  totalLoansToday: number
  totalAmountGranted: number
  totalRenovations: number
  totalNewLoans: number
}
