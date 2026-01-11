import type { LucideIcon } from 'lucide-react'

export interface Expense {
  id: string
  amount: string
  expenseSource: string | null
  description?: string | null
  sourceAccount: {
    id: string
    name: string
    type: string
  } | null
  createdAt: string
}

export interface Account {
  id: string
  name: string
  type: AccountType
  amount: string
  accountBalance: string
}

export interface NewExpense {
  amount: string
  expenseSource: string
  description: string
  sourceAccountId: string
  observaciones?: string // Free-form observations/notes
}

export interface ExpenseType {
  value: string
  label: string
  icon: LucideIcon
}

export type AccountType =
  | 'BANK'
  | 'OFFICE_CASH_FUND'
  | 'EMPLOYEE_CASH_FUND'
  | 'PREPAID_GAS'
  | 'TRAVEL_EXPENSES'

export interface ExpenseTotals {
  existing: number
  new: number
  total: number
}
