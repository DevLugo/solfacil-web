import type { ActiveLoan, PaymentEntry, CommissionHighlight } from './types'
import {
  loanPaymentRowStyles,
  type LoanPaymentRowState,
} from '../shared/theme'

export function getCommissionHighlight(
  payment: PaymentEntry | undefined,
  loan: ActiveLoan,
  baseCommissionOverride?: number
): CommissionHighlight {
  if (!payment || payment.isNoPayment) return 'none'

  const amount = parseFloat(payment.amount || '0')
  const commission = parseFloat(payment.commission || '0')
  const expectedWeekly = parseFloat(loan.expectedWeeklyPayment || '0')
  const loantypeCommission = parseFloat(loan.loantype?.loanPaymentComission || '0')
  // Only use override if the loantype has a commission > 0
  const baseCommission = (baseCommissionOverride && baseCommissionOverride > 0 && loantypeCommission > 0)
    ? baseCommissionOverride
    : loantypeCommission

  if (amount <= 0 || expectedWeekly <= 0 || baseCommission <= 0) return 'none'

  const multiplier = Math.floor(amount / expectedWeekly)
  const expectedCommission = multiplier >= 1 ? baseCommission * multiplier : 0

  // Commission is $0 but should have been > $0
  if (commission === 0 && expectedCommission > 0) return 'zero-removed'
  // Commission is less than expected (partial)
  if (commission > 0 && commission < expectedCommission) return 'reduced'
  // Commission is more than expected (extra / double+)
  if (commission > expectedCommission) return 'extra'

  return 'none'
}

export function hasIncompleteAval(loan: ActiveLoan): boolean {
  if (!loan.collaterals || loan.collaterals.length === 0) {
    return true
  }
  const firstCollateral = loan.collaterals[0]
  const avalName = firstCollateral?.fullName || ''
  const avalPhone = firstCollateral?.phones?.[0]?.number || ''
  return !avalName || avalName.trim() === '' || !avalPhone || avalPhone.trim() === ''
}

export function hasIncompletePhone(loan: ActiveLoan): boolean {
  const phone = loan.borrower?.personalData?.phones?.[0]?.number
  return !phone || phone.trim() === ''
}

interface GetRowStyleParams {
  isMarkedForDeletion: boolean
  isEditing: boolean
  isRegistered: boolean
  isNoPayment: boolean
  isIncomplete: boolean
  hasPayment: boolean
  hasZeroCommission: boolean
  isTransfer: boolean
  isCash: boolean
}

/**
 * Get the row state for loan payment rows
 * Returns the state key for use with loanPaymentRowStyles
 */
export function getRowState(params: GetRowStyleParams): LoanPaymentRowState {
  const {
    isMarkedForDeletion,
    isEditing,
    isRegistered,
    isNoPayment,
    isIncomplete,
    hasPayment,
    hasZeroCommission,
    isTransfer,
    isCash,
  } = params

  if (isMarkedForDeletion) return 'deleted'
  if (isEditing) return 'editing'
  if (isRegistered) return 'registered'
  if (isNoPayment) return 'noPayment'
  if (isIncomplete && !hasPayment) return 'incomplete'
  if (hasZeroCommission) return 'zeroCommission'
  if (hasPayment && isTransfer) return 'transfer'
  if (hasPayment && isCash) return 'cash'
  return 'default'
}

/**
 * Get the row className for loan payment rows
 * Uses centralized theme constants
 */
export function getRowClassName(params: GetRowStyleParams): string {
  const state = getRowState(params)
  return loanPaymentRowStyles[state]
}
