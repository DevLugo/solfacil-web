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
  Wrench,
} from 'lucide-react'
import type { ExpenseTypeConfig } from './types'

// Expense types with colors for charts
export const EXPENSE_TYPES: ExpenseTypeConfig[] = [
  { value: 'VIATIC', label: 'Viaticos', icon: Coffee, color: 'hsl(142, 76%, 36%)' },
  { value: 'GASOLINE', label: 'Gasolina', icon: Fuel, color: 'hsl(25, 95%, 53%)' },
  { value: 'ACCOMMODATION', label: 'Hospedaje', icon: Home, color: 'hsl(262, 83%, 58%)' },
  { value: 'NOMINA_SALARY', label: 'Nomina', icon: Banknote, color: 'hsl(221, 83%, 53%)' },
  { value: 'EXTERNAL_SALARY', label: 'Salario Externo', icon: Banknote, color: 'hsl(199, 89%, 48%)' },
  { value: 'VEHICULE_MAINTENANCE', label: 'Mantenimiento Vehiculo', icon: Wrench, color: 'hsl(47, 96%, 53%)' },
  { value: 'LEAD_EXPENSE', label: 'Gasto de Lider', icon: Briefcase, color: 'hsl(280, 67%, 54%)' },
  { value: 'LAVADO_DE_AUTO', label: 'Lavado de Auto', icon: Car, color: 'hsl(173, 80%, 40%)' },
  { value: 'CASETA', label: 'Caseta', icon: CreditCard, color: 'hsl(346, 77%, 49%)' },
  { value: 'PAPELERIA', label: 'Papeleria', icon: Receipt, color: 'hsl(215, 20%, 65%)' },
  { value: 'HOUSE_RENT', label: 'Renta', icon: Home, color: 'hsl(30, 80%, 55%)' },
  { value: 'CAR_PAYMENT', label: 'Pago de Auto', icon: Car, color: 'hsl(180, 60%, 45%)' },
  { value: 'IMSS_INFONAVIT', label: 'IMSS/INFONAVIT', icon: Building2, color: 'hsl(340, 82%, 52%)' },
  { value: 'POSADA', label: 'Posada', icon: PartyPopper, color: 'hsl(291, 64%, 42%)' },
  { value: 'REGALOS_LIDERES', label: 'Regalos Lideres', icon: Gift, color: 'hsl(0, 84%, 60%)' },
  { value: 'AGUINALDO', label: 'Aguinaldo', icon: DollarSign, color: 'hsl(122, 39%, 49%)' },
  { value: 'OTRO', label: 'Otro', icon: Wallet, color: 'hsl(220, 14%, 46%)' },
]

// Commission types - excluded from expense analysis
export const COMMISSION_TYPES = [
  { value: 'LOAN_GRANTED', label: 'Credito Otorgado', icon: CircleDollarSign },
  { value: 'LOAN_GRANTED_COMISSION', label: 'Comision Credito', icon: HandCoins },
  { value: 'LOAN_PAYMENT_COMISSION', label: 'Comision Abono', icon: HandCoins },
  { value: 'LEAD_COMISSION', label: 'Comision Lider', icon: HandCoins },
]

// Excluded expense types (loan-related)
export const EXCLUDED_EXPENSE_TYPES = [
  'LOAN_GRANTED',
  'LOAN_PAYMENT_COMISSION',
  'LOAN_GRANTED_COMISSION',
  'LEAD_COMISSION',
]

// Account types
export const ACCOUNT_TYPES = [
  { value: 'EMPLOYEE_CASH_FUND', label: 'Efectivo Empleado', color: 'hsl(142, 76%, 36%)' },
  { value: 'PREPAID_GAS', label: 'Gasolina Prepagada', color: 'hsl(25, 95%, 53%)' },
  { value: 'TRAVEL_EXPENSES', label: 'Gastos de Viaje', color: 'hsl(262, 83%, 58%)' },
  { value: 'BANK', label: 'Banco', color: 'hsl(221, 83%, 53%)' },
  { value: 'OFFICE_CASH_FUND', label: 'Fondo de Oficina', color: 'hsl(47, 96%, 53%)' },
]

// Map for quick label lookup
export const EXPENSE_SOURCE_LABELS: Record<string, string> = EXPENSE_TYPES.reduce(
  (acc, type) => ({ ...acc, [type.value]: type.label }),
  {} as Record<string, string>
)

export const ACCOUNT_TYPE_LABELS: Record<string, string> = ACCOUNT_TYPES.reduce(
  (acc, type) => ({ ...acc, [type.value]: type.label }),
  {} as Record<string, string>
)

// Color palette for charts
export const CHART_COLORS = [
  'hsl(142, 76%, 36%)', // green
  'hsl(25, 95%, 53%)',  // orange
  'hsl(262, 83%, 58%)', // purple
  'hsl(221, 83%, 53%)', // blue
  'hsl(47, 96%, 53%)',  // yellow
  'hsl(346, 77%, 49%)', // pink
  'hsl(173, 80%, 40%)', // teal
  'hsl(280, 67%, 54%)', // violet
  'hsl(199, 89%, 48%)', // cyan
  'hsl(30, 80%, 55%)',  // amber
]

// Month names in Spanish
export const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

export const MONTH_NAMES_SHORT = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
]
