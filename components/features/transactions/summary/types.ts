// Types for summary tab

export interface Route {
  id: string
  name: string
}

// Grouped payment for display
export interface PaymentSummary {
  id: string
  borrowerName: string
  amount: number
  commission: number
  paymentMethod: 'CASH' | 'MONEY_TRANSFER'
  date: string
}

// Expense item
export interface ExpenseSummary {
  id: string
  source: string
  sourceLabel: string
  amount: number
  date: string
}

// Loan granted item
export interface LoanGrantedSummary {
  id: string
  borrowerName: string
  amount: number
  date: string
}

// Locality summary with payments (server-calculated)
export interface LocalitySummary {
  locationKey: string
  localityName: string
  leaderName: string
  leaderId: string
  // Payments (abonos)
  payments: PaymentSummary[]
  totalPayments: number
  cashPayments: number
  bankPayments: number
  // Commissions breakdown
  // Comisiones por cobrar abonos (pago a líder por cobranza)
  totalPaymentCommissions: number
  // Comisiones por otorgar préstamos (pago a líder por colocación)
  totalLoansGrantedCommissions: number
  // Total de comisiones (suma de ambos tipos)
  totalCommissions: number
  paymentCount: number
  // Expenses
  expenses: ExpenseSummary[]
  totalExpenses: number
  // Loans granted
  loansGranted: LoanGrantedSummary[]
  totalLoansGranted: number
  loansGrantedCount: number
  // Calculated balances (from API)
  // balanceEfectivo = cashPayments - totalCommissions - totalLoansGranted - totalExpenses
  balanceEfectivo: number
  // balanceBanco = bankPayments
  balanceBanco: number
  // balance = balanceEfectivo + balanceBanco (total)
  balance: number
}

// Executive summary totals (server-calculated)
export interface ExecutiveSummaryData {
  totalPaymentsReceived: number
  totalCashPayments: number
  totalBankPayments: number
  // Commissions breakdown
  totalPaymentCommissions: number
  totalLoansGrantedCommissions: number
  totalCommissions: number
  totalExpenses: number
  totalLoansGranted: number
  paymentCount: number
  expenseCount: number
  loansGrantedCount: number
  netBalance: number
}

// Component props
export interface StatCardProps {
  title: string
  value: number
  icon: React.ReactNode
  gradient: string
  subtitle?: string
  trend?: {
    value: string
    isPositive: boolean
  }
}

export interface LocalityCardProps {
  locality: LocalitySummary
}
