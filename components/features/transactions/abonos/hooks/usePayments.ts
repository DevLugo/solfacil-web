'use client'

import { useState, useEffect, useCallback } from 'react'
import type { ActiveLoan, PaymentEntry, EditedPayment, UserAddedPayment, LoanPayment } from '../types'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency } from '@/lib/utils'

interface UsePaymentsParams {
  loans: ActiveLoan[]
  selectedLeadId: string | null
  globalCommission: string
}

export function usePayments({ loans, selectedLeadId, globalCommission }: UsePaymentsParams) {
  const { toast } = useToast()
  const [payments, setPayments] = useState<Record<string, PaymentEntry>>({})
  const [editedPayments, setEditedPayments] = useState<Record<string, EditedPayment>>({})
  const [userAddedPayments, setUserAddedPayments] = useState<UserAddedPayment[]>([])
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null)

  // Initialize payments when loans are loaded
  useEffect(() => {
    if (loans.length > 0 && Object.keys(payments).length === 0) {
      const initialPayments: Record<string, PaymentEntry> = {}
      loans.forEach((loan) => {
        const defaultCommission = loan.loantype?.loanPaymentComission
          ? Math.round(parseFloat(loan.loantype.loanPaymentComission)).toString()
          : '0'

        initialPayments[loan.id] = {
          loanId: loan.id,
          amount: loan.expectedWeeklyPayment || '0',
          commission: defaultCommission,
          initialCommission: defaultCommission,
          paymentMethod: 'CASH',
          isNoPayment: false,
        }
      })
      setPayments(initialPayments)
    }
  }, [loans])

  // Reset when lead changes
  useEffect(() => {
    setPayments({})
    setLastSelectedIndex(null)
    setUserAddedPayments([])
    setEditedPayments({})
  }, [selectedLeadId])

  // Payment change handler
  const handlePaymentChange = useCallback((loanId: string, amount: string) => {
    setPayments((prev) => {
      const loan = loans.find((l) => l.id === loanId)
      const expectedWeekly = parseFloat(loan?.expectedWeeklyPayment || '0')
      const baseCommission = parseFloat(loan?.loantype?.loanPaymentComission || '0')
      const amountNum = parseFloat(amount || '0')
      const initialCommission = prev[loanId]?.initialCommission ||
        (loan?.loantype?.loanPaymentComission
          ? Math.round(parseFloat(loan.loantype.loanPaymentComission)).toString()
          : '0')

      let commission = '0'
      if (expectedWeekly > 0 && baseCommission > 0 && amountNum > 0) {
        const multiplier = Math.floor(amountNum / expectedWeekly)
        commission = (multiplier >= 1 ? baseCommission * multiplier : 0).toString()
      }

      return {
        ...prev,
        [loanId]: {
          ...prev[loanId],
          loanId,
          amount,
          commission,
          initialCommission,
          paymentMethod: prev[loanId]?.paymentMethod || 'CASH',
          isNoPayment: false,
        },
      }
    })
  }, [loans])

  // Commission change handler
  const handleCommissionChange = useCallback((loanId: string, commission: string) => {
    setPayments((prev) => ({
      ...prev,
      [loanId]: {
        ...prev[loanId],
        commission,
      },
    }))
  }, [])

  // Payment method change handler
  const handlePaymentMethodChange = useCallback((loanId: string, method: 'CASH' | 'MONEY_TRANSFER') => {
    setPayments((prev) => ({
      ...prev,
      [loanId]: {
        ...prev[loanId],
        loanId,
        paymentMethod: method,
      },
    }))
  }, [])

  // Toggle no payment
  const handleToggleNoPayment = useCallback((loanId: string) => {
    setPayments((prev) => {
      const current = prev[loanId]
      const isCurrentlyNoPayment = current?.isNoPayment

      if (isCurrentlyNoPayment) {
        const loan = loans.find((l) => l.id === loanId)
        const defaultCommission = loan?.loantype?.loanPaymentComission
          ? Math.round(parseFloat(loan.loantype.loanPaymentComission)).toString()
          : '0'

        return {
          ...prev,
          [loanId]: {
            loanId,
            amount: loan?.expectedWeeklyPayment || '0',
            commission: defaultCommission,
            initialCommission: current?.initialCommission || defaultCommission,
            paymentMethod: current?.paymentMethod || 'CASH',
            isNoPayment: false,
          },
        }
      } else {
        return {
          ...prev,
          [loanId]: {
            ...current,
            loanId,
            amount: '0',
            commission: '0',
            initialCommission: current?.initialCommission || '0',
            isNoPayment: true,
          },
        }
      }
    })
  }, [loans])

  // Toggle no payment with shift support
  const handleToggleNoPaymentWithShift = useCallback((
    loanId: string,
    index: number,
    shiftKey: boolean,
    filteredLoans: ActiveLoan[]
  ) => {
    if (shiftKey && lastSelectedIndex !== null) {
      const start = Math.min(lastSelectedIndex, index)
      const end = Math.max(lastSelectedIndex, index)

      setPayments((prev) => {
        const updated = { ...prev }
        for (let i = start; i <= end; i++) {
          const loan = filteredLoans[i]
          if (loan) {
            const initialCommission = prev[loan.id]?.initialCommission ||
              (loan.loantype?.loanPaymentComission
                ? Math.round(parseFloat(loan.loantype.loanPaymentComission)).toString()
                : '0')

            updated[loan.id] = {
              ...updated[loan.id],
              loanId: loan.id,
              amount: '0',
              commission: '0',
              initialCommission,
              paymentMethod: updated[loan.id]?.paymentMethod || 'CASH',
              isNoPayment: true,
            }
          }
        }
        return updated
      })

      toast({
        title: 'Sin pago marcado',
        description: `${end - start + 1} préstamo(s) marcado(s) como sin pago.`,
      })
    } else {
      handleToggleNoPayment(loanId)
    }

    setLastSelectedIndex(index)
  }, [lastSelectedIndex, handleToggleNoPayment, toast])

  // Set all to weekly payment
  const handleSetAllWeekly = useCallback((filteredLoans: ActiveLoan[]) => {
    const newPayments: Record<string, PaymentEntry> = {}
    filteredLoans.forEach((loan) => {
      const defaultCommission = loan.loantype?.loanPaymentComission
        ? Math.round(parseFloat(loan.loantype.loanPaymentComission)).toString()
        : '0'

      newPayments[loan.id] = {
        loanId: loan.id,
        amount: loan.expectedWeeklyPayment,
        commission: defaultCommission,
        initialCommission: defaultCommission,
        paymentMethod: payments[loan.id]?.paymentMethod || 'CASH',
        isNoPayment: false,
      }
    })
    setPayments(newPayments)
  }, [payments])

  // Clear all
  const handleClearAll = useCallback(() => {
    setPayments({})
    setUserAddedPayments([])
    setLastSelectedIndex(null)
  }, [])

  // Apply global commission
  const handleApplyGlobalCommission = useCallback((globalComm: string) => {
    if (!globalComm) return

    let appliedCount = 0
    let skippedCount = 0

    setPayments((prev) => {
      const updated = { ...prev }
      Object.keys(updated).forEach((loanId) => {
        const payment = updated[loanId]
        const hasAmount = !payment.isNoPayment && parseFloat(payment.amount || '0') > 0
        const hadCommission = parseFloat(payment.initialCommission || '0') > 0

        if (hasAmount && hadCommission) {
          updated[loanId] = {
            ...updated[loanId],
            commission: globalComm,
          }
          appliedCount++
        } else if (hasAmount && !hadCommission) {
          skippedCount++
        }
      })
      return updated
    })

    const message = skippedCount > 0
      ? `Aplicada a ${appliedCount} abono(s). ${skippedCount} omitido(s) por tener comisión $0.`
      : `Aplicada a ${appliedCount} abono(s).`

    toast({
      title: 'Comisión aplicada',
      description: `Comisión de ${formatCurrency(parseFloat(globalComm))}. ${message}`,
    })
  }, [toast])

  // === Edited Payments ===
  const handleStartEditPayment = useCallback((loanId: string, registeredPayment: LoanPayment) => {
    setEditedPayments((prev) => ({
      ...prev,
      [loanId]: {
        paymentId: registeredPayment.id,
        loanId,
        amount: registeredPayment.amount,
        comission: registeredPayment.comission,
        paymentMethod: registeredPayment.paymentMethod,
        isDeleted: false,
      },
    }))
  }, [])

  const handleEditPaymentChange = useCallback((
    loanId: string,
    field: keyof EditedPayment,
    value: string | boolean
  ) => {
    setEditedPayments((prev) => ({
      ...prev,
      [loanId]: {
        ...prev[loanId],
        [field]: value,
      },
    }))
  }, [])

  const handleToggleDeletePayment = useCallback((loanId: string) => {
    setEditedPayments((prev) => ({
      ...prev,
      [loanId]: {
        ...prev[loanId],
        isDeleted: !prev[loanId]?.isDeleted,
      },
    }))
  }, [])

  const handleCancelEditPayment = useCallback((loanId: string) => {
    setEditedPayments((prev) => {
      const updated = { ...prev }
      delete updated[loanId]
      return updated
    })
  }, [])

  const clearEditedPayments = useCallback(() => {
    setEditedPayments({})
  }, [])

  // === User Added Payments ===
  const handleAddPayment = useCallback(() => {
    const tempId = `temp-${Date.now()}`
    setUserAddedPayments((prev) => [
      {
        tempId,
        loanId: '',
        amount: '',
        commission: globalCommission || '0',
        paymentMethod: 'CASH',
      },
      ...prev,
    ])
  }, [globalCommission])

  const handleUserAddedPaymentChange = useCallback((
    tempId: string,
    field: keyof Omit<UserAddedPayment, 'tempId'>,
    value: string
  ) => {
    setUserAddedPayments((prev) =>
      prev.map((p) => {
        if (p.tempId !== tempId) return p

        if (field === 'loanId') {
          const selectedLoan = loans.find((l) => l.id === value)
          const loanCommission = selectedLoan?.loantype?.loanPaymentComission
            ? Math.round(parseFloat(selectedLoan.loantype.loanPaymentComission)).toString()
            : globalCommission || '0'

          return {
            ...p,
            loanId: value,
            commission: loanCommission,
            amount: p.amount || selectedLoan?.expectedWeeklyPayment || '',
          }
        }

        return { ...p, [field]: value }
      })
    )
  }, [loans, globalCommission])

  const handleRemoveUserAddedPayment = useCallback((tempId: string) => {
    setUserAddedPayments((prev) => prev.filter((p) => p.tempId !== tempId))
  }, [])

  const getAvailableLoansForRow = useCallback((currentTempId: string) => {
    const usedLoanIds = new Set(
      userAddedPayments
        .filter((p) => p.tempId !== currentTempId && p.loanId)
        .map((p) => p.loanId)
    )
    return loans.filter((loan) => !usedLoanIds.has(loan.id))
  }, [loans, userAddedPayments])

  const clearUserAddedPayments = useCallback(() => {
    setUserAddedPayments([])
  }, [])

  // Reset payments state
  const resetPayments = useCallback(() => {
    setPayments({})
    setLastSelectedIndex(null)
  }, [])

  return {
    // State
    payments,
    editedPayments,
    userAddedPayments,
    lastSelectedIndex,
    // Payment handlers
    handlePaymentChange,
    handleCommissionChange,
    handlePaymentMethodChange,
    handleToggleNoPayment,
    handleToggleNoPaymentWithShift,
    handleSetAllWeekly,
    handleClearAll,
    handleApplyGlobalCommission,
    resetPayments,
    // Edited payment handlers
    handleStartEditPayment,
    handleEditPaymentChange,
    handleToggleDeletePayment,
    handleCancelEditPayment,
    clearEditedPayments,
    // User added payment handlers
    handleAddPayment,
    handleUserAddedPaymentChange,
    handleRemoveUserAddedPayment,
    getAvailableLoansForRow,
    clearUserAddedPayments,
    // Setters for external use
    setLastSelectedIndex,
  }
}
