'use client'

import { useMemo } from 'react'
import type {
  PaymentEntry,
  EditedPayment,
  UserAddedPayment,
  LoanPayment,
  PaymentTotals,
  RegisteredTotals,
  CombinedTotals,
  ModalTotals,
} from '../types'

interface UseTotalsParams {
  payments: Record<string, PaymentEntry>
  editedPayments: Record<string, EditedPayment>
  userAddedPayments: UserAddedPayment[]
  registeredPaymentsMap: Map<string, LoanPayment>
}

export function useTotals({
  payments,
  editedPayments,
  userAddedPayments,
  registeredPaymentsMap,
}: UseTotalsParams) {
  // Calculate totals for NEW payments (not yet registered)
  const totals: PaymentTotals = useMemo(() => {
    let cashTotal = 0
    let bankTotal = 0
    let paymentsCount = 0
    let noPaymentCount = 0
    let commissionTotal = 0

    Object.entries(payments).forEach(([loanId, payment]) => {
      if (registeredPaymentsMap.has(loanId)) return

      if (payment.isNoPayment) {
        noPaymentCount++
        return
      }

      const amount = parseFloat(payment.amount || '0')
      const commission = parseFloat(payment.commission || '0')

      if (amount > 0) {
        paymentsCount++
        commissionTotal += commission
        if (payment.paymentMethod === 'CASH') {
          cashTotal += amount
        } else {
          bankTotal += amount
        }
      }
    })

    userAddedPayments.forEach((payment) => {
      const amount = parseFloat(payment.amount || '0')
      const commission = parseFloat(payment.commission || '0')

      if (amount > 0 && payment.loanId) {
        paymentsCount++
        commissionTotal += commission
        if (payment.paymentMethod === 'CASH') {
          cashTotal += amount
        } else {
          bankTotal += amount
        }
      }
    })

    return {
      cash: cashTotal,
      bank: bankTotal,
      total: cashTotal + bankTotal,
      count: paymentsCount,
      noPayment: noPaymentCount,
      commission: commissionTotal,
    }
  }, [payments, userAddedPayments, registeredPaymentsMap])

  // Calculate totals for REGISTERED payments (already saved) - considering edits
  const registeredTotals: RegisteredTotals = useMemo(() => {
    let cashTotal = 0
    let bankTotal = 0
    let paymentsCount = 0
    let deletedCount = 0
    let commissionTotal = 0

    registeredPaymentsMap.forEach((payment, loanId) => {
      const edited = editedPayments[loanId]

      if (edited?.isDeleted) {
        deletedCount++
        return
      }

      const amount = edited ? parseFloat(edited.amount || '0') : parseFloat(payment.amount || '0')
      const commission = edited ? parseFloat(edited.comission || '0') : parseFloat(payment.comission || '0')
      const method = edited ? edited.paymentMethod : payment.paymentMethod

      if (amount > 0) {
        paymentsCount++
        commissionTotal += commission
        if (method === 'CASH') {
          cashTotal += amount
        } else {
          bankTotal += amount
        }
      }
    })

    return {
      cash: cashTotal,
      bank: bankTotal,
      total: cashTotal + bankTotal,
      count: paymentsCount,
      deleted: deletedCount,
      commission: commissionTotal,
    }
  }, [registeredPaymentsMap, editedPayments])

  // Combined totals (new + registered considering edits)
  const combinedTotals: CombinedTotals = useMemo(() => {
    return {
      cash: totals.cash + registeredTotals.cash,
      bank: totals.bank + registeredTotals.bank,
      total: totals.total + registeredTotals.total,
      count: totals.count + registeredTotals.count,
      noPayment: totals.noPayment,
      deleted: registeredTotals.deleted,
      commission: totals.commission + registeredTotals.commission,
    }
  }, [totals, registeredTotals])

  // Modal totals - uses registeredTotals when editing, totals when saving new
  const modalTotals: ModalTotals = useMemo(() => {
    const hasEdits = Object.keys(editedPayments).length > 0
    if (hasEdits) {
      return {
        cash: registeredTotals.cash,
        bank: registeredTotals.bank,
        total: registeredTotals.total,
        count: registeredTotals.count,
        deleted: registeredTotals.deleted,
        commission: registeredTotals.commission,
        noPayment: 0,
      }
    }
    return {
      cash: totals.cash,
      bank: totals.bank,
      total: totals.total,
      count: totals.count,
      deleted: 0,
      commission: totals.commission,
      noPayment: totals.noPayment,
    }
  }, [editedPayments, registeredTotals, totals])

  return {
    totals,
    registeredTotals,
    combinedTotals,
    modalTotals,
  }
}
