import type {
  LoanHistoryDetail,
  PaymentChronologyItem,
  CoverageType,
} from './types'
import {
  mapApiStatus,
  statusToBadgeVariant,
  statusLabels,
  coverageRowStyles,
  type LoanStatusType,
  type BadgeVariant,
} from './constants'

// Re-export from constants for backwards compatibility
export {
  mapApiStatus,
  statusToBadgeVariant,
  statusLabels,
  coverageRowStyles,
  type LoanStatusType,
  type BadgeVariant,
} from './constants'

// ============================================================
// TRANSLATION FUNCTIONS - English to Spanish
// ============================================================

// Payment method labels
export const paymentMethodLabels: Record<string, string> = {
  CASH: 'Efectivo',
  MONEY_TRANSFER: 'Transferencia',
  CHECK: 'Cheque',
  CARD: 'Tarjeta',
}

export const formatPaymentMethod = (method: string): string =>
  paymentMethodLabels[method] || method

// Loan status labels
export const loanStatusLabels: Record<string, string> = {
  ACTIVE: 'Activo',
  FINISHED: 'Terminado',
  CANCELLED: 'Cancelado',
  BAD_DEBT: 'Cartera Vencida',
}

export const formatLoanStatus = (status: string): string =>
  loanStatusLabels[status] || status

// Payment type labels (income source)
export const paymentTypeLabels: Record<string, string> = {
  PAYMENT: 'Abono',
  LOAN_PAYMENT: 'Abono de Préstamo',
  COMMISSION: 'Comisión',
  PENALTY: 'Multa',
  INTEREST: 'Interés',
}

export const formatPaymentType = (type: string): string =>
  paymentTypeLabels[type] || type

// Coverage type labels
export const coverageTypeLabels: Record<string, string> = {
  FULL: 'Completo',
  COVERED_BY_SURPLUS: 'Cubierto por Sobrepago',
  PARTIAL: 'Parcial',
  MISS: 'Sin Pago',
}

export const formatCoverageType = (coverage: string): string =>
  coverageTypeLabels[coverage] || coverage

// ============================================================
// DATE FORMATTING
// ============================================================

export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('es-SV', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

export const formatCurrency = (amount: number | string): string => {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount
  if (isNaN(numAmount)) return '$0'
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(numAmount)
}

// ============================================================
// PAYMENT CHRONOLOGY - Week by week analysis
// ============================================================

interface LoanDataForChronology {
  signDate: string
  finishedDate?: string | null
  status?: string
  badDebtDate?: string | null
  wasRenewed?: boolean
  amountGived?: number
  profitAmount?: number
  totalAmountDue?: number
  weekDuration?: number
  payments?: Array<{
    id: string
    receivedAt: string
    receivedAtFormatted?: string
    amount: number
    paymentMethod: string
    balanceBeforePayment: number
    balanceAfterPayment: number
    paymentNumber?: number
  }>
}

export const generatePaymentChronology = (
  loan: LoanDataForChronology
): PaymentChronologyItem[] => {
  const chronology: PaymentChronologyItem[] = []

  if (!loan.signDate) return chronology

  // Helper to safely convert Decimal/string amounts to numbers
  const toNumber = (val: number | string | undefined | null): number => {
    if (val === undefined || val === null) return 0
    const num = typeof val === 'string' ? parseFloat(val) : val
    return isNaN(num) ? 0 : num
  }

  const signDate = new Date(loan.signDate)
  const now = new Date()

  // Check if loan is finished - don't show "no payment" after this
  const isFinished = loan.status === 'FINISHED'
  const isRenewed = loan.wasRenewed === true
  const finishedDate = loan.finishedDate ? new Date(loan.finishedDate) : null

  // Helper to calculate weeks between two dates
  const getWeeksBetween = (start: Date, end: Date): number => {
    return Math.ceil((end.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000))
  }

  // Helper to calculate max weeks based on amount
  const getMaxWeeksFromAmount = (): number => {
    const amount = toNumber(loan.amountGived)
    return Math.max(loan.weekDuration || 12, Math.ceil(amount / 100))
  }

  // Determine end date and total weeks for evaluation
  let endDate: Date
  let totalWeeks: number

  if (finishedDate && isFinished) {
    endDate = finishedDate
    totalWeeks = getWeeksBetween(signDate, finishedDate)
  } else if (loan.badDebtDate) {
    endDate = new Date(loan.badDebtDate)
    totalWeeks = getWeeksBetween(signDate, endDate)
  } else {
    const maxWeeks = getMaxWeeksFromAmount()
    const maxEndDate = new Date(signDate)
    maxEndDate.setDate(maxEndDate.getDate() + maxWeeks * 7)
    endDate = new Date(Math.min(now.getTime(), maxEndDate.getTime()))
    totalWeeks = Math.min(maxWeeks, getWeeksBetween(signDate, endDate))
  }

  // Sort payments by date
  const sortedPayments = [...(loan.payments || [])].sort(
    (a, b) => new Date(a.receivedAt).getTime() - new Date(b.receivedAt).getTime()
  )

  // Calculate expected weekly payment
  const totalDue = toNumber(loan.totalAmountDue) || (toNumber(loan.amountGived) + toNumber(loan.profitAmount))
  const durationWeeks = loan.weekDuration || 16
  const expectedWeekly = durationWeeks > 0 ? totalDue / durationWeeks : 0

  // Track running balance for calculating balanceAfter
  // Start with total debt, will be reduced by payments
  let runningBalance = totalDue

  // Helper to get Monday of a given date
  const getMondayOfWeek = (date: Date): Date => {
    const result = new Date(date)
    const dayOfWeek = result.getDay()
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    result.setDate(result.getDate() + daysToMonday)
    result.setHours(0, 0, 0, 0)
    return result
  }

  // Find the Monday of the first week (week 1 = 7 days after sign date)
  const firstWeekDate = new Date(signDate)
  firstWeekDate.setDate(firstWeekDate.getDate() + 7)
  const firstWeekMonday = getMondayOfWeek(firstWeekDate)

  // Find payments made before week 1 starts (early payments / same day payments)
  const earlyPayments = sortedPayments.filter((payment) => {
    const paymentDate = new Date(payment.receivedAt)
    return paymentDate < firstWeekMonday
  })

  // Helper to create payment chronology item
  const createPaymentItem = (
    payment: typeof sortedPayments[0],
    options: {
      weekIndex: number
      description: string
      weeklyExpected: number
      weeklyPaid: number
      surplusBefore: number
      surplusAfter: number
      coverageType: CoverageType
    }
  ): PaymentChronologyItem => ({
    id: `payment-${payment.id}`,
    date: payment.receivedAt,
    dateFormatted: payment.receivedAtFormatted || formatDate(payment.receivedAt),
    type: 'PAYMENT',
    description: options.description,
    amount: payment.amount,
    paymentMethod: payment.paymentMethod,
    balanceBefore: payment.balanceBeforePayment,
    balanceAfter: payment.balanceAfterPayment,
    paymentNumber: payment.paymentNumber || 0,
    weekIndex: options.weekIndex,
    weeklyExpected: options.weeklyExpected,
    weeklyPaid: options.weeklyPaid,
    surplusBefore: options.surplusBefore,
    surplusAfter: options.surplusAfter,
    coverageType: options.coverageType,
  })

  // Add early payments to chronology
  earlyPayments.forEach((payment, index) => {
    const paymentAmount = toNumber(payment.amount)
    runningBalance = Math.max(0, runningBalance - paymentAmount)

    const description = earlyPayments.length > 1
      ? `Pago anticipado #${index + 1} (${index + 1}/${earlyPayments.length})`
      : 'Pago anticipado'

    chronology.push(createPaymentItem(payment, {
      weekIndex: 0,
      description,
      weeklyExpected: expectedWeekly,
      weeklyPaid: paymentAmount,
      surplusBefore: 0,
      surplusAfter: paymentAmount,
      coverageType: 'FULL',
    }))
  })

  // Generate chronology week by week (starting at week 1)
  for (let week = 1; week <= totalWeeks; week++) {
    const weekPaymentDate = new Date(signDate)
    weekPaymentDate.setDate(weekPaymentDate.getDate() + week * 7)

    // Calculate Monday and Sunday for the week
    const weekMonday = getMondayOfWeek(weekPaymentDate)
    const weekSunday = new Date(weekMonday)
    weekSunday.setDate(weekSunday.getDate() + 6)
    weekSunday.setHours(23, 59, 59, 999)

    // Find all payments in this week
    const paymentsInWeek = sortedPayments.filter((payment) => {
      const paymentDate = new Date(payment.receivedAt)
      return paymentDate >= weekMonday && paymentDate <= weekSunday
    })

    // Calculate paid before and in the week
    const paidBeforeWeek = (loan.payments || []).reduce((sum, p) => {
      const d = new Date(p.receivedAt).getTime()
      return d < weekMonday.getTime() ? sum + toNumber(p.amount) : sum
    }, 0)

    const weeklyPaid = paymentsInWeek.reduce(
      (sum, p) => sum + toNumber(p.amount),
      0
    )
    const expectedBefore = (week - 1) * expectedWeekly
    const surplusBefore = paidBeforeWeek - expectedBefore

    // Calculate coverage type based on payment and surplus
    const getCoverageType = (): CoverageType => {
      if (weeklyPaid >= expectedWeekly) return 'FULL'
      if (weeklyPaid > 0) return 'PARTIAL'
      if (surplusBefore >= expectedWeekly && expectedWeekly > 0) return 'COVERED_BY_SURPLUS'
      return 'MISS'
    }

    const coverageType = getCoverageType()

    // Calculate balance before this week (before any payments in this week)
    const balanceBeforeWeek = runningBalance

    // Add payments found in this week
    if (paymentsInWeek.length > 0) {
      paymentsInWeek.forEach((payment, index) => {
        const paymentAmount = toNumber(payment.amount)
        runningBalance = Math.max(0, runningBalance - paymentAmount)

        const description = paymentsInWeek.length > 1
          ? `Pago #${index + 1} (${index + 1}/${paymentsInWeek.length})`
          : `Pago #${payment.paymentNumber || index + 1}`

        chronology.push(createPaymentItem(payment, {
          weekIndex: week,
          description,
          weeklyExpected: expectedWeekly,
          weeklyPaid,
          surplusBefore,
          surplusAfter: surplusBefore + weeklyPaid - expectedWeekly,
          coverageType,
        }))
      })
    } else {
      // Helper to check if we should show "no payment" for this week
      const shouldShowNoPayment = (): boolean => {
        if (isFinished || isRenewed) return false
        if (now <= weekSunday) return false
        if (finishedDate && weekPaymentDate > finishedDate) return false
        if (loan.badDebtDate && weekPaymentDate > new Date(loan.badDebtDate)) return false
        return true
      }

      if (shouldShowNoPayment()) {
        const coverageForNoPayment: CoverageType =
          surplusBefore >= expectedWeekly && expectedWeekly > 0
            ? 'COVERED_BY_SURPLUS'
            : 'MISS'

        const description = coverageForNoPayment === 'COVERED_BY_SURPLUS'
          ? 'Sin pago (cubierto por sobrepago)'
          : 'Sin pago'

        chronology.push({
          id: `no-payment-${week}`,
          date: weekPaymentDate.toISOString(),
          dateFormatted: formatDate(weekPaymentDate.toISOString()),
          type: 'NO_PAYMENT',
          description,
          weekCount: 1,
          weekIndex: week,
          weeklyExpected: expectedWeekly,
          weeklyPaid: 0,
          surplusBefore,
          surplusAfter: surplusBefore - expectedWeekly,
          coverageType: coverageForNoPayment,
          balanceBefore: balanceBeforeWeek,
          balanceAfter: runningBalance,
        })
      }
    }
  }

  // Helper to create condensed no-payment item from group
  const createCondensedNoPayment = (group: PaymentChronologyItem[]): PaymentChronologyItem => {
    const firstWeek = group[0]
    const lastWeek = group[group.length - 1]
    const totalWeeks = group.length
    const coverageType = group.every(n => n.coverageType === 'COVERED_BY_SURPLUS')
      ? 'COVERED_BY_SURPLUS'
      : 'MISS'

    return {
      id: `no-payment-condensed-${firstWeek.weekIndex}-${lastWeek.weekIndex}`,
      date: firstWeek.date,
      dateFormatted: `${formatDate(firstWeek.date)} - ${formatDate(lastWeek.date)}`,
      type: 'NO_PAYMENT',
      description: coverageType === 'COVERED_BY_SURPLUS'
        ? `${totalWeeks} semanas sin pago (cubierto por sobrepago)`
        : `${totalWeeks} semanas sin pago`,
      weekCount: totalWeeks,
      weekIndex: firstWeek.weekIndex,
      weeklyExpected: firstWeek.weeklyExpected || 0,
      weeklyPaid: 0,
      surplusBefore: firstWeek.surplusBefore || 0,
      surplusAfter: lastWeek.surplusAfter || 0,
      coverageType,
      balanceBefore: firstWeek.balanceBefore,
      balanceAfter: lastWeek.balanceAfter,
    }
  }

  // Helper to process accumulated no-payment group
  const processNoPaymentGroup = (
    group: PaymentChronologyItem[],
    result: PaymentChronologyItem[]
  ): void => {
    if (group.length > 4) {
      result.push(createCondensedNoPayment(group))
    } else if (group.length > 0) {
      result.push(...group)
    }
  }

  // Helper to check if two items are consecutive no-payments
  const isConsecutiveNoPayment = (prev: PaymentChronologyItem | null, current: PaymentChronologyItem): boolean => {
    if (!prev || prev.type !== 'NO_PAYMENT' || current.type !== 'NO_PAYMENT') return false
    if (prev.weekIndex === undefined || current.weekIndex === undefined) return false
    return current.weekIndex === (prev.weekIndex || 0) + 1
  }

  // Condense consecutive "no payment" weeks (more than 4)
  const condensedChronology: PaymentChronologyItem[] = []
  let noPaymentGroup: PaymentChronologyItem[] = []

  for (let i = 0; i < chronology.length; i++) {
    const item = chronology[i]
    const prevItem = i > 0 ? chronology[i - 1] : null
    const isNoPayment = item.type === 'NO_PAYMENT'

    if (isNoPayment) {
      if (isConsecutiveNoPayment(prevItem, item) || noPaymentGroup.length === 0) {
        noPaymentGroup.push(item)
      } else {
        processNoPaymentGroup(noPaymentGroup, condensedChronology)
        noPaymentGroup = [item]
      }
    } else {
      processNoPaymentGroup(noPaymentGroup, condensedChronology)
      noPaymentGroup = []
      condensedChronology.push(item)
    }
  }

  // Handle remaining group
  processNoPaymentGroup(noPaymentGroup, condensedChronology)

  // Sort condensed chronology by date
  return condensedChronology.sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  )
}

// ============================================================
// UI HELPER FUNCTIONS
// ============================================================

/**
 * Get the effective loan status considering wasRenewed flag
 * Uses constants from ./constants.ts for theme-aware styling
 */
export const getEffectiveLoanStatus = (
  apiStatus: string,
  wasRenewed: boolean
): LoanStatusType => {
  return mapApiStatus(apiStatus, wasRenewed)
}

/**
 * Get badge variant for a loan status
 * @deprecated Use statusToBadgeVariant from constants directly
 */
export const getStatusBadgeVariant = (
  status: string
): BadgeVariant => {
  const effectiveStatus = mapApiStatus(status, false)
  return statusToBadgeVariant[effectiveStatus]
}

/**
 * Get row style class for a coverage type (theme-aware)
 * Uses CSS variables that work in both light and dark mode
 */
export const getCoverageRowStyle = (
  coverage: CoverageType | undefined
): string => {
  if (!coverage) return ''
  return coverageRowStyles[coverage] || ''
}

// Map loan from API to card format
export const mapLoanToCardData = (loan: LoanHistoryDetail) => {
  const chronology = generatePaymentChronology({
    signDate: loan.signDate,
    finishedDate: loan.finishedDate,
    status: loan.status,
    amountGived: loan.amountRequested,
    profitAmount: loan.interestAmount,
    totalAmountDue: loan.totalAmountDue,
    weekDuration: loan.weekDuration,
    payments: loan.payments.map((p) => ({
      id: p.id,
      receivedAt: p.receivedAt,
      receivedAtFormatted: p.receivedAtFormatted,
      amount: p.amount,
      paymentMethod: p.paymentMethod,
      balanceBeforePayment: p.balanceBeforePayment,
      balanceAfterPayment: p.balanceAfterPayment,
      paymentNumber: p.paymentNumber,
    })),
  })

  const payments = chronology.map((item, idx) => ({
    id: item.paymentNumber || idx + 1,
    date: item.dateFormatted,
    expected: item.weeklyExpected || 0,
    paid: item.amount || 0,
    surplus: item.surplusAfter || 0,
    status: getPaymentStatus(item),
  }))

  let status: 'active' | 'finished' = 'active'
  if (loan.status === 'FINISHED') status = 'finished'

  return {
    id: loan.id,
    date: loan.signDateFormatted,
    status,
    wasRenewed: loan.wasRenewed || false,
    amount: loan.amountRequested,
    totalAmount: loan.totalAmountDue,
    paidAmount: loan.totalPaid,
    remainingAmount: loan.pendingDebt,
    guarantor: {
      name: loan.avalName || 'N/A',
      phone: loan.avalPhone || 'N/A',
    },
    weekCount: loan.weekDuration,
    interestRate: loan.rate,
    interestAmount: loan.interestAmount,
    payments,
    renovationId: loan.renewedFrom || undefined,
  }
}

const getPaymentStatus = (
  item: PaymentChronologyItem
): 'paid' | 'partial' | 'missed' | 'overpaid' | 'upcoming' => {
  if (item.type === 'NO_PAYMENT') {
    return item.coverageType === 'COVERED_BY_SURPLUS' ? 'paid' : 'missed'
  }
  if (item.coverageType === 'FULL') return 'overpaid'
  if (item.coverageType === 'PARTIAL') return 'partial'
  if (item.coverageType === 'COVERED_BY_SURPLUS') return 'paid'
  return 'paid'
}
