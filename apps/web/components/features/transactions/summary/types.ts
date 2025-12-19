// Types for summary tab

export interface Route {
  id: string
  name: string
}

// Transaction from GraphQL query
export interface TransactionNode {
  id: string
  amount: string
  date: string
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER' | 'INVESTMENT'
  incomeSource?: string
  expenseSource?: string
  profitAmount?: string
  returnToCapital?: string
  loan?: {
    id: string
    amountGived?: string
    borrower?: {
      personalData?: {
        fullName?: string
      }
    }
  }
  loanPayment?: {
    id: string
    amount: string
    comission?: string
    paymentMethod: 'CASH' | 'MONEY_TRANSFER'
  }
  sourceAccount?: {
    id: string
    name: string
    type: string
  }
  route?: {
    id: string
    name: string
  }
  lead?: {
    id: string
    personalData?: {
      fullName?: string
    }
    location?: {
      id: string
      name: string
    }
  }
  createdAt: string
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

// Locality summary with payments
export interface LocalitySummary {
  locationKey: string
  localityName: string
  municipalityName: string
  stateName: string
  leaderName: string
  leaderId: string
  // Payments (abonos)
  payments: PaymentSummary[]
  totalPayments: number
  cashPayments: number
  bankPayments: number
  totalCommissions: number
  paymentCount: number
  // Expenses
  expenses: ExpenseSummary[]
  totalExpenses: number
  // Loans granted
  loansGranted: LoanGrantedSummary[]
  totalLoansGranted: number
  loansGrantedCount: number
  // Calculated balance
  balance: number
}

// Executive summary totals
export interface ExecutiveSummaryData {
  totalPaymentsReceived: number
  totalCashPayments: number
  totalBankPayments: number
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
