import type { LucideIcon } from 'lucide-react'

export interface Expense {
  id: string
  amount: string
  date: string
  type: string
  expenseSource: string | null
  incomeSource: string | null
  sourceAccount: {
    id: string
    name: string
    type: string
    amount: string
  } | null
  destinationAccount: {
    id: string
    name: string
  } | null
  route: {
    id: string
    name: string
  } | null
  lead: {
    id: string
    personalData: {
      fullName: string
    }
  } | null
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
