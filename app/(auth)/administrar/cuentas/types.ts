export interface AccountRoute {
  id: string
  name: string
}

export interface Account {
  id: string
  name: string
  type: AccountType
  amount: string
  accountBalance: string
  routes: AccountRoute[]
  createdAt: string
}

export type AccountType =
  | 'BANK'
  | 'OFFICE_CASH_FUND'
  | 'EMPLOYEE_CASH_FUND'
  | 'PREPAID_GAS'
  | 'TRAVEL_EXPENSES'

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  BANK: 'Banco',
  OFFICE_CASH_FUND: 'Caja Oficina',
  EMPLOYEE_CASH_FUND: 'Caja Empleado',
  PREPAID_GAS: 'Gasolina Prepagada',
  TRAVEL_EXPENSES: 'Viaticos',
}

export const ACCOUNT_TYPE_COLORS: Record<AccountType, string> = {
  BANK: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  OFFICE_CASH_FUND: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300',
  EMPLOYEE_CASH_FUND: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
  PREPAID_GAS: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  TRAVEL_EXPENSES: 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-300',
}

export interface AccountFormData {
  name: string
  type: AccountType
  amount: string
  routeIds: string[]
}

export interface Route {
  id: string
  name: string
}
