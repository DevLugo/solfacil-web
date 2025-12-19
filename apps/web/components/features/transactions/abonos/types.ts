export interface PaymentTransaction {
  id: string
  type: string
  profitAmount: string | null
  returnToCapital: string | null
}

export interface LoanPayment {
  id: string
  amount: string
  comission: string
  receivedAt: string
  paymentMethod: 'CASH' | 'MONEY_TRANSFER'
  leadPaymentReceived?: {
    id: string
  } | null
  transactions?: PaymentTransaction[]
}

export interface ActiveLoan {
  id: string
  requestedAmount: string
  amountGived: string
  signDate: string
  expectedWeeklyPayment: string
  totalPaid: string
  pendingAmountStored: string
  status: string
  borrower: {
    id: string
    personalData: {
      id: string
      fullName: string
      phones: Array<{ number: string }>
    }
  }
  collaterals: Array<{
    id: string
    fullName: string
    phones: Array<{ id: string; number: string }>
  }>
  loantype: {
    id: string
    name: string
    weekDuration: number
    loanPaymentComission: string
  }
  payments: LoanPayment[]
}

export interface PaymentEntry {
  loanId: string
  amount: string
  commission: string
  initialCommission: string
  paymentMethod: 'CASH' | 'MONEY_TRANSFER'
  isNoPayment: boolean
}

export interface Account {
  id: string
  name: string
  type: string
  amount: string
}

export interface EditedPayment {
  paymentId: string
  loanId: string
  amount: string
  comission: string
  paymentMethod: 'CASH' | 'MONEY_TRANSFER'
  isDeleted: boolean
}

export interface UserAddedPayment {
  tempId: string
  loanId: string
  amount: string
  commission: string
  paymentMethod: 'CASH' | 'MONEY_TRANSFER'
}

export interface PaymentTotals {
  cash: number
  bank: number
  total: number
  count: number
  noPayment: number
  commission: number
}

export interface RegisteredTotals {
  cash: number
  bank: number
  total: number
  count: number
  deleted: number
  commission: number
}

export interface CombinedTotals {
  cash: number
  bank: number
  total: number
  count: number
  noPayment: number
  deleted: number
  commission: number
}

export interface ModalTotals {
  cash: number
  bank: number
  total: number
  count: number
  deleted: number
  commission: number
  noPayment: number
}

// RowStyle type removed - now using theme constants from shared/theme.ts
