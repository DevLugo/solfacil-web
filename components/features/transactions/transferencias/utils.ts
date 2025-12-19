import type { Account, Transfer, TransferFormData } from './types'

/**
 * Calculate total amount from transfers
 */
export function calculateTransfersTotal(transfers: Transfer[]): number {
  return transfers.reduce((sum, t) => sum + parseFloat(t.amount || '0'), 0)
}

/**
 * Get available balance from source account
 */
export function getAvailableBalance(accounts: Account[], sourceAccountId: string): number {
  const sourceAccount = accounts.find((acc) => acc.id === sourceAccountId)
  return sourceAccount ? parseFloat(sourceAccount.amount || '0') : 0
}

/**
 * Validate transfer amount against available balance
 */
export function validateAmount(
  amount: string,
  availableBalance: number,
  isCapitalInvestment: boolean
): boolean {
  if (isCapitalInvestment) return true
  if (!amount) return true
  return parseFloat(amount) <= availableBalance
}

/**
 * Validate the entire transfer form
 */
export function validateTransferForm(
  formData: TransferFormData,
  selectedRouteId: string | null,
  isAmountValid: boolean
): boolean {
  if (!selectedRouteId) return false
  if (!formData.destinationAccountId) return false
  if (!formData.amount || parseFloat(formData.amount) <= 0) return false
  if (!formData.isCapitalInvestment && !formData.sourceAccountId) return false
  if (!formData.isCapitalInvestment && !isAmountValid) return false
  return true
}

/**
 * Filter destination account options (exclude source account)
 */
export function getDestinationOptions(accounts: Account[], sourceAccountId: string): Account[] {
  if (sourceAccountId) {
    return accounts.filter((acc) => acc.id !== sourceAccountId)
  }
  return accounts
}

/**
 * Get initial form state
 */
export function getInitialFormData(): TransferFormData {
  return {
    isCapitalInvestment: false,
    sourceAccountId: '',
    destinationAccountId: '',
    amount: '',
    description: '',
  }
}
