import {
  Coffee,
  Fuel,
  Home,
  Banknote,
  Car,
  Briefcase,
  CreditCard,
  Receipt,
  Building2,
  PartyPopper,
  Gift,
  DollarSign,
  Wallet,
  HandCoins,
  CircleDollarSign,
} from 'lucide-react'
import type { ExpenseType, AccountType } from './types'

export const EXPENSE_TYPES: ExpenseType[] = [
  { value: 'VIATIC', label: 'Viaticos', icon: Coffee },
  { value: 'GASOLINE', label: 'Gasolina', icon: Fuel },
  { value: 'ACCOMMODATION', label: 'Hospedaje', icon: Home },
  { value: 'NOMINA_SALARY', label: 'Nomina', icon: Banknote },
  { value: 'EXTERNAL_SALARY', label: 'Salario Externo', icon: Banknote },
  { value: 'VEHICULE_MAINTENANCE', label: 'Mantenimiento Vehiculo', icon: Car },
  { value: 'LEAD_EXPENSE', label: 'Gasto de Lider', icon: Briefcase },
  { value: 'LAVADO_DE_AUTO', label: 'Lavado de Auto', icon: Car },
  { value: 'CASETA', label: 'Caseta', icon: CreditCard },
  { value: 'PAPELERIA', label: 'Papeleria', icon: Receipt },
  { value: 'HOUSE_RENT', label: 'Renta', icon: Home },
  { value: 'CAR_PAYMENT', label: 'Pago de Auto', icon: Car },
  { value: 'IMSS_INFONAVIT', label: 'IMSS/INFONAVIT', icon: Building2 },
  { value: 'POSADA', label: 'Posada', icon: PartyPopper },
  { value: 'REGALOS_LIDERES', label: 'Regalos Lideres', icon: Gift },
  { value: 'AGUINALDO', label: 'Aguinaldo', icon: DollarSign },
  { value: 'OTRO', label: 'Otro', icon: Wallet },
]

// Commission types - these are system-generated and shown in filtered views
export const COMMISSION_TYPES: ExpenseType[] = [
  { value: 'LOAN_GRANTED', label: 'Credito Otorgado', icon: CircleDollarSign },
  { value: 'LOAN_GRANTED_COMISSION', label: 'Comision Credito', icon: HandCoins },
  { value: 'LOAN_PAYMENT_COMISSION', label: 'Comision Abono', icon: HandCoins },
  { value: 'LEAD_COMISSION', label: 'Comision Lider', icon: HandCoins },
]

// All expense types including commissions (for display purposes)
export const ALL_EXPENSE_TYPES: ExpenseType[] = [...EXPENSE_TYPES, ...COMMISSION_TYPES]

// Map of all expense source labels for display
export const EXPENSE_SOURCE_LABELS: Record<string, string> = {
  VIATIC: 'Viaticos',
  GASOLINE: 'Gasolina',
  ACCOMMODATION: 'Hospedaje',
  NOMINA_SALARY: 'Nomina',
  EXTERNAL_SALARY: 'Salario Externo',
  VEHICULE_MAINTENANCE: 'Mantenimiento Vehiculo',
  LEAD_EXPENSE: 'Gasto de Lider',
  LAVADO_DE_AUTO: 'Lavado de Auto',
  CASETA: 'Caseta',
  PAPELERIA: 'Papeleria',
  HOUSE_RENT: 'Renta',
  CAR_PAYMENT: 'Pago de Auto',
  IMSS_INFONAVIT: 'IMSS/INFONAVIT',
  POSADA: 'Posada',
  REGALOS_LIDERES: 'Regalos Lideres',
  AGUINALDO: 'Aguinaldo',
  OTRO: 'Otro',
  // Commission types
  LOAN_GRANTED: 'Credito Otorgado',
  LOAN_GRANTED_COMISSION: 'Comision Credito',
  LOAN_PAYMENT_COMISSION: 'Comision Abono',
  LEAD_COMISSION: 'Comision Lider',
}

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  BANK: 'Banco',
  OFFICE_CASH_FUND: 'Caja Oficina',
  EMPLOYEE_CASH_FUND: 'Caja Empleado',
  PREPAID_GAS: 'Toka/Gasolina',
  TRAVEL_EXPENSES: 'Gastos de Viaje',
}

// Account types that are shown by default in the filter
export const DEFAULT_VISIBLE_ACCOUNT_TYPES: AccountType[] = [
  'EMPLOYEE_CASH_FUND',
  'PREPAID_GAS',
  'TRAVEL_EXPENSES',
]

// Account types that require toggling to show
export const EXTRA_ACCOUNT_TYPES: AccountType[] = ['BANK', 'OFFICE_CASH_FUND']

// Auto-selection mapping: expense type -> preferred account type
export const EXPENSE_TO_ACCOUNT_TYPE: Partial<Record<string, AccountType>> = {
  GASOLINE: 'PREPAID_GAS',
  VIATIC: 'TRAVEL_EXPENSES',
  ACCOMMODATION: 'TRAVEL_EXPENSES',
}
