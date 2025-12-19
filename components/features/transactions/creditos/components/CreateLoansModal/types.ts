import type { LoanType, Account, PreviousLoan, PendingLoan, UnifiedClientValue } from '../../types'

export interface CreateLoansModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  loanTypes: LoanType[]
  accounts: Account[]
  loansForRenewal: PreviousLoan[]
  leadId: string
  grantorId: string
  locationId?: string
  selectedDate: Date
  onSuccess: () => void
}

export interface ActiveLoanData {
  id: string
  requestedAmount: string
  pendingAmountStored: string
  totalPaid?: string
  loantype?: {
    id: string
  }
  collaterals?: {
    id: string
    fullName: string
    phones?: { id?: string; number: string }[]
  }[]
}

export type { LoanType, Account, PreviousLoan, PendingLoan, UnifiedClientValue }
