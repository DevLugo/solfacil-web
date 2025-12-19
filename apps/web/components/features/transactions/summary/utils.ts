import type {
  TransactionNode,
  LocalitySummary,
  ExecutiveSummaryData,
  PaymentSummary,
  ExpenseSummary,
  LoanGrantedSummary,
} from './types'

/**
 * Expense source labels in Spanish
 */
const EXPENSE_SOURCE_LABELS: Record<string, string> = {
  VIATIC: 'Viáticos',
  GASOLINE: 'Gasolina',
  ACCOMMODATION: 'Hospedaje',
  NOMINA_SALARY: 'Nómina',
  EXTERNAL_SALARY: 'Salario externo',
  VEHICLE_MAINTENANCE: 'Mantenimiento vehículo',
  LOAN_GRANTED: 'Préstamo otorgado',
  LOAN_GRANTED_COMISSION: 'Comisión préstamo',
  LOAN_PAYMENT_COMISSION: 'Comisión abono',
  LEAD_COMISSION: 'Comisión líder',
  LEAD_EXPENSE: 'Gasto líder',
  OTHER: 'Otro',
}

/**
 * Get location info from a transaction's lead
 */
function getLocationFromLead(lead?: TransactionNode['lead']): {
  localityName: string
  leaderName: string
  leaderId: string
} {
  const localityName = lead?.location?.name || 'Sin localidad'
  const leaderName = lead?.personalData?.fullName || 'Sin líder'
  const leaderId = lead?.id || ''

  return { localityName, leaderName, leaderId }
}

/**
 * Build location key for grouping (by locality name)
 */
function buildLocationKey(localityName: string, leaderName: string): string {
  return `${localityName}|${leaderName}`
}

/**
 * Create empty locality summary
 */
function createEmptyLocality(
  locationKey: string,
  localityName: string,
  leaderName: string,
  leaderId: string
): LocalitySummary {
  return {
    locationKey,
    localityName,
    municipalityName: '',
    stateName: '',
    leaderName,
    leaderId,
    payments: [],
    totalPayments: 0,
    cashPayments: 0,
    bankPayments: 0,
    totalCommissions: 0,
    paymentCount: 0,
    expenses: [],
    totalExpenses: 0,
    loansGranted: [],
    totalLoansGranted: 0,
    loansGrantedCount: 0,
    balance: 0,
  }
}

/**
 * Process transactions and group by locality
 */
export function processTransactionsByLocality(
  transactions: TransactionNode[]
): LocalitySummary[] {
  const grouped: Record<string, LocalitySummary> = {}

  for (const tx of transactions) {
    const { localityName, leaderName, leaderId } = getLocationFromLead(tx.lead)
    const locationKey = buildLocationKey(localityName, leaderName)

    // Initialize locality if not exists
    if (!grouped[locationKey]) {
      grouped[locationKey] = createEmptyLocality(locationKey, localityName, leaderName, leaderId)
    }

    const loc = grouped[locationKey]
    const amount = parseFloat(tx.amount) || 0

    // Process based on transaction type
    if (tx.type === 'INCOME') {
      // Check if it's a loan payment (abono)
      if (tx.loanPayment && tx.incomeSource?.includes('LOAN_PAYMENT')) {
        const payment: PaymentSummary = {
          id: tx.id,
          borrowerName: tx.loan?.borrower?.personalData?.fullName || 'Sin nombre',
          amount: parseFloat(tx.loanPayment.amount) || amount,
          commission: parseFloat(tx.loanPayment.comission || '0') || 0,
          paymentMethod: tx.loanPayment.paymentMethod,
          date: tx.date,
        }
        loc.payments.push(payment)
        loc.totalPayments += payment.amount
        loc.totalCommissions += payment.commission

        if (payment.paymentMethod === 'CASH') {
          loc.cashPayments += payment.amount
        } else {
          loc.bankPayments += payment.amount
        }
        loc.paymentCount++
      }
    } else if (tx.type === 'EXPENSE') {
      // Check if it's a loan granted
      if (tx.expenseSource === 'LOAN_GRANTED' && tx.loan) {
        const loanGranted: LoanGrantedSummary = {
          id: tx.id,
          borrowerName: tx.loan?.borrower?.personalData?.fullName || 'Sin nombre',
          amount: parseFloat(tx.loan.amountGived || tx.amount) || amount,
          date: tx.date,
        }
        loc.loansGranted.push(loanGranted)
        loc.totalLoansGranted += loanGranted.amount
        loc.loansGrantedCount++
      } else {
        // Regular expense
        const expense: ExpenseSummary = {
          id: tx.id,
          source: tx.expenseSource || 'OTHER',
          sourceLabel: EXPENSE_SOURCE_LABELS[tx.expenseSource || 'OTHER'] || tx.expenseSource || 'Otro',
          amount,
          date: tx.date,
        }
        loc.expenses.push(expense)
        loc.totalExpenses += amount
      }
    }
  }

  // Calculate balance for each locality
  for (const loc of Object.values(grouped)) {
    loc.balance = loc.totalPayments - loc.totalExpenses - loc.totalLoansGranted - loc.totalCommissions
  }

  // Sort by total payments (descending)
  return Object.values(grouped).sort((a, b) => b.totalPayments - a.totalPayments)
}

/**
 * Calculate executive summary from localities
 */
export function calculateExecutiveSummary(localities: LocalitySummary[]): ExecutiveSummaryData {
  return localities.reduce(
    (acc, loc) => ({
      totalPaymentsReceived: acc.totalPaymentsReceived + loc.totalPayments,
      totalCashPayments: acc.totalCashPayments + loc.cashPayments,
      totalBankPayments: acc.totalBankPayments + loc.bankPayments,
      totalCommissions: acc.totalCommissions + loc.totalCommissions,
      totalExpenses: acc.totalExpenses + loc.totalExpenses,
      totalLoansGranted: acc.totalLoansGranted + loc.totalLoansGranted,
      paymentCount: acc.paymentCount + loc.paymentCount,
      expenseCount: acc.expenseCount + loc.expenses.length,
      loansGrantedCount: acc.loansGrantedCount + loc.loansGrantedCount,
      netBalance: acc.netBalance + loc.balance,
    }),
    {
      totalPaymentsReceived: 0,
      totalCashPayments: 0,
      totalBankPayments: 0,
      totalCommissions: 0,
      totalExpenses: 0,
      totalLoansGranted: 0,
      paymentCount: 0,
      expenseCount: 0,
      loansGrantedCount: 0,
      netBalance: 0,
    }
  )
}

/**
 * Create date range for query (UTC, 6am start - next day 5:59am end)
 * This matches the business day (6am to 6am next day)
 */
export function createDateRange(selectedDate: Date): { startDate: string; endDate: string } {
  const year = selectedDate.getFullYear()
  const month = selectedDate.getMonth()
  const day = selectedDate.getDate()

  const startDate = new Date(Date.UTC(year, month, day, 6, 0, 0, 0))
  const endDate = new Date(Date.UTC(year, month, day + 1, 5, 59, 59, 999))

  return {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  }
}

/**
 * Get week date range (Monday to Sunday)
 */
export function getWeekDateRange(selectedDate: Date): { startDate: string; endDate: string } {
  const startOfWeek = new Date(selectedDate)
  const dayOfWeek = startOfWeek.getDay()
  const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  startOfWeek.setDate(startOfWeek.getDate() + daysToMonday)

  const endOfWeek = new Date(startOfWeek)
  endOfWeek.setDate(endOfWeek.getDate() + 6)

  const startYear = startOfWeek.getFullYear()
  const startMonth = startOfWeek.getMonth()
  const startDay = startOfWeek.getDate()

  const endYear = endOfWeek.getFullYear()
  const endMonth = endOfWeek.getMonth()
  const endDay = endOfWeek.getDate()

  return {
    startDate: new Date(Date.UTC(startYear, startMonth, startDay, 6, 0, 0, 0)).toISOString(),
    endDate: new Date(Date.UTC(endYear, endMonth, endDay + 1, 5, 59, 59, 999)).toISOString(),
  }
}
