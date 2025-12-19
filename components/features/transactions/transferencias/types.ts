// Types for Transferencias Tab

export type AccountType = 'BANK' | 'OFFICE_CASH_FUND' | 'EMPLOYEE_CASH_FUND' | 'PREPAID_GAS' | 'TRAVEL_EXPENSES'

export interface Account {
  id: string
  name: string
  type: AccountType
  amount: string
  accountBalance: string
}

export interface Transfer {
  id: string
  amount: string
  date: string
  type: string
  incomeSource?: string
  sourceAccount: {
    id: string
    name: string
    type: string
  } | null
  destinationAccount: {
    id: string
    name: string
    type: string
  } | null
  route: {
    id: string
    name: string
  } | null
}

export interface TransferFormData {
  isCapitalInvestment: boolean
  sourceAccountId: string
  destinationAccountId: string
  amount: string
  description: string
}

export interface TransferFormState extends TransferFormData {
  isSubmitting: boolean
  showSuccessDialog: boolean
}

export interface TransferValidation {
  isAmountValid: boolean
  isFormValid: boolean
  availableBalance: number
}
