import {
  Wallet,
  Building2,
  User,
  Fuel,
  Briefcase,
  type LucideIcon,
} from 'lucide-react'
import type { AccountType } from './types'
import { accountTypeStyles } from '../shared/theme'

// Account type to icon mapping
export const ACCOUNT_TYPE_ICONS: Record<AccountType, LucideIcon> = {
  BANK: Building2,
  OFFICE_CASH_FUND: Wallet,
  EMPLOYEE_CASH_FUND: User,
  PREPAID_GAS: Fuel,
  TRAVEL_EXPENSES: Briefcase,
}

// Account type labels
export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  BANK: 'Banco',
  OFFICE_CASH_FUND: 'Caja Oficina',
  EMPLOYEE_CASH_FUND: 'Caja Empleado',
  PREPAID_GAS: 'Toka/Gasolina',
  TRAVEL_EXPENSES: 'Gastos de Viaje',
}

// Re-export account type styles from shared theme (theme-aware)
export const ACCOUNT_TYPE_COLORS = accountTypeStyles

// Transaction types
export const TRANSACTION_TYPES = {
  TRANSFER: 'TRANSFER',
  INCOME: 'INCOME',
} as const

// Income sources
export const INCOME_SOURCES = {
  MONEY_INVESTMENT: 'MONEY_INVESMENT', // Note: original typo in backend
} as const
