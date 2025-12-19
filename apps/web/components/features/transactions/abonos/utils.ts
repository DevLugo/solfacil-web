import type { ActiveLoan } from './types'
import {
  loanPaymentRowStyles,
  type LoanPaymentRowState,
} from '../shared/theme'

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
