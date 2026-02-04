'use client'

import { useState, useEffect, useCallback } from 'react'
import type { ActiveLoan, PaymentEntry, EditedPayment, LoanPayment } from '../types'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency } from '@/lib/utils'

// A loan with a rowKey for payment state tracking
// rowKey can be loan.id (for regular loans) or a unique instanceId (for extra loans)
export interface LoanWithKey {
  rowKey: string
  loan: ActiveLoan
  isExtra?: boolean
  // For registered payment rows beyond the first, store the payment index
  registeredPaymentIndex?: number
}

interface UsePaymentsParams {
  loansWithKeys: LoanWithKey[]
  selectedLeadId: string | null
  selectedDate: Date
  globalCommission: string
  leadPaymentReceivedId: string | null
  registeredPaymentsMap: Map<string, LoanPayment[]>
}

export function usePayments({
  loansWithKeys,
  selectedLeadId,
  selectedDate,
  globalCommission,
  leadPaymentReceivedId,
  registeredPaymentsMap,
}: UsePaymentsParams) {
  const { toast } = useToast()
  const [payments, setPayments] = useState<Record<string, PaymentEntry>>({})
  const [editedPayments, setEditedPayments] = useState<Record<string, EditedPayment>>({})
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null)
  // Counter to force re-initialization after reset
  const [resetCounter, setResetCounter] = useState(0)

  // Function to initialize payments for pending loans
  const initializePayments = useCallback(() => {
    if (loansWithKeys.length === 0) {
      setPayments({})
      return
    }

    const isDayCaptured = !!leadPaymentReceivedId
    const initialPayments: Record<string, PaymentEntry> = {}

    loansWithKeys.forEach(({ rowKey, loan, isExtra }) => {
      // For extra loans, always initialize (they're new rows for additional payments)
      if (isExtra) {
        const defaultCommission = loan.loantype?.loanPaymentComission
          ? Math.round(parseFloat(loan.loantype.loanPaymentComission)).toString()
          : '0'

        initialPayments[rowKey] = {
          loanId: loan.id,
          amount: loan.expectedWeeklyPayment || '0',
          commission: defaultCommission,
          initialCommission: defaultCommission,
          paymentMethod: 'CASH',
          isNoPayment: false,
        }
        return
      }

      // For regular loans, skip if already registered or is a falta
      const hasRegisteredPayment = registeredPaymentsMap.has(loan.id)
      const isFalta = isDayCaptured && !hasRegisteredPayment

      // Skip initialization for registered payments and faltas
      // They don't need payment state because they're already "captured"
      if (hasRegisteredPayment || isFalta) {
        return
      }

      const defaultCommission = loan.loantype?.loanPaymentComission
        ? Math.round(parseFloat(loan.loantype.loanPaymentComission)).toString()
        : '0'

      initialPayments[rowKey] = {
        loanId: loan.id,
        amount: loan.expectedWeeklyPayment || '0',
        commission: defaultCommission,
        initialCommission: defaultCommission,
        paymentMethod: 'CASH',
        isNoPayment: false,
      }
    })

    // Merge new payments with existing ones
    // Only add entries for loans that don't already have a payment entry
    // This preserves user edits when new loans are added
    setPayments((prev) => {
      const newEntries: Record<string, PaymentEntry> = {}
      let hasNewEntries = false

      Object.entries(initialPayments).forEach(([key, value]) => {
        // Only add if this rowKey doesn't exist in previous state
        if (!prev[key]) {
          newEntries[key] = value
          hasNewEntries = true
        }
      })

      // If no new entries, return previous state unchanged
      if (!hasNewEntries) {
        return prev
      }

      // Merge: keep existing payments, add new ones
      return { ...prev, ...newEntries }
    })
  }, [loansWithKeys, leadPaymentReceivedId, registeredPaymentsMap])

  // Initialize payments when loans are loaded or after reset
  // IMPORTANT: Only initialize for PENDING loans (not captured or registered)
  // Faltas (captured day + no registered payment) should NOT be initialized
  useEffect(() => {
    initializePayments()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loansWithKeys.length, leadPaymentReceivedId, registeredPaymentsMap.size, resetCounter])

  // Reset when lead or date changes
  useEffect(() => {
    setPayments({})
    setLastSelectedIndex(null)
    setEditedPayments({})
  }, [selectedLeadId, selectedDate])

  // Payment change handler - uses rowKey for state key but stores loanId in entry
  const handlePaymentChange = useCallback((rowKey: string, amount: string) => {
    setPayments((prev) => {
      const loanWithKey = loansWithKeys.find((l) => l.rowKey === rowKey)
      const loan = loanWithKey?.loan
      const loanId = loan?.id || prev[rowKey]?.loanId || rowKey
      const expectedWeekly = parseFloat(loan?.expectedWeeklyPayment || '0')
      const baseCommission = parseFloat(loan?.loantype?.loanPaymentComission || '0')
      const amountNum = parseFloat(amount || '0')
      const initialCommission = prev[rowKey]?.initialCommission ||
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
        [rowKey]: {
          ...prev[rowKey],
          loanId,
          amount,
          commission,
          initialCommission,
          paymentMethod: prev[rowKey]?.paymentMethod || 'CASH',
          isNoPayment: false,
        },
      }
    })
  }, [loansWithKeys])

  // Commission change handler
  const handleCommissionChange = useCallback((rowKey: string, commission: string) => {
    setPayments((prev) => ({
      ...prev,
      [rowKey]: {
        ...prev[rowKey],
        commission,
      },
    }))
  }, [])

  // Payment method change handler
  const handlePaymentMethodChange = useCallback((rowKey: string, method: 'CASH' | 'MONEY_TRANSFER') => {
    setPayments((prev) => {
      const loanId = prev[rowKey]?.loanId || rowKey
      return {
        ...prev,
        [rowKey]: {
          ...prev[rowKey],
          loanId,
          paymentMethod: method,
        },
      }
    })
  }, [])

  // Toggle no payment
  const handleToggleNoPayment = useCallback((rowKey: string) => {
    setPayments((prev) => {
      const current = prev[rowKey]
      const loanWithKey = loansWithKeys.find((l) => l.rowKey === rowKey)
      const loan = loanWithKey?.loan
      const loanId = loan?.id || current?.loanId || rowKey

      // Special case: for faltas (no payment state exists yet)
      // First click means "add a payment" (isNoPayment: false)
      if (!current) {
        const defaultCommission = loan?.loantype?.loanPaymentComission
          ? Math.round(parseFloat(loan.loantype.loanPaymentComission)).toString()
          : '0'

        return {
          ...prev,
          [rowKey]: {
            loanId,
            amount: loan?.expectedWeeklyPayment || '0',
            commission: defaultCommission,
            initialCommission: defaultCommission,
            paymentMethod: 'CASH',
            isNoPayment: false, // Adding a payment to the falta
          },
        }
      }

      const isCurrentlyNoPayment = current.isNoPayment

      if (isCurrentlyNoPayment) {
        const defaultCommission = loan?.loantype?.loanPaymentComission
          ? Math.round(parseFloat(loan.loantype.loanPaymentComission)).toString()
          : '0'

        return {
          ...prev,
          [rowKey]: {
            loanId,
            amount: loan?.expectedWeeklyPayment || '0',
            commission: defaultCommission,
            initialCommission: current.initialCommission || defaultCommission,
            paymentMethod: current.paymentMethod || 'CASH',
            isNoPayment: false,
          },
        }
      } else {
        return {
          ...prev,
          [rowKey]: {
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
  }, [loansWithKeys])

  // Toggle no payment with shift support
  const handleToggleNoPaymentWithShift = useCallback((
    rowKey: string,
    index: number,
    shiftKey: boolean,
    filteredLoansWithKeys: LoanWithKey[]
  ) => {
    if (shiftKey && lastSelectedIndex !== null) {
      const start = Math.min(lastSelectedIndex, index)
      const end = Math.max(lastSelectedIndex, index)

      setPayments((prev) => {
        const updated = { ...prev }
        for (let i = start; i <= end; i++) {
          const item = filteredLoansWithKeys[i]
          if (item) {
            const { rowKey: itemRowKey, loan } = item
            const initialCommission = prev[itemRowKey]?.initialCommission ||
              (loan.loantype?.loanPaymentComission
                ? Math.round(parseFloat(loan.loantype.loanPaymentComission)).toString()
                : '0')

            updated[itemRowKey] = {
              ...updated[itemRowKey],
              loanId: loan.id,
              amount: '0',
              commission: '0',
              initialCommission,
              paymentMethod: updated[itemRowKey]?.paymentMethod || 'CASH',
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
      handleToggleNoPayment(rowKey)
    }

    setLastSelectedIndex(index)
  }, [lastSelectedIndex, handleToggleNoPayment, toast])

  // Set all to weekly payment
  const handleSetAllWeekly = useCallback((filteredLoansWithKeys: LoanWithKey[]) => {
    const newPayments: Record<string, PaymentEntry> = {}
    filteredLoansWithKeys.forEach(({ rowKey, loan }) => {
      const defaultCommission = loan.loantype?.loanPaymentComission
        ? Math.round(parseFloat(loan.loantype.loanPaymentComission)).toString()
        : '0'

      newPayments[rowKey] = {
        loanId: loan.id,
        amount: loan.expectedWeeklyPayment,
        commission: defaultCommission,
        initialCommission: defaultCommission,
        paymentMethod: payments[rowKey]?.paymentMethod || 'CASH',
        isNoPayment: false,
      }
    })
    setPayments(newPayments)
  }, [payments])

  // Clear all
  const handleClearAll = useCallback(() => {
    setPayments({})
    setLastSelectedIndex(null)
  }, [])

  // Set all to no payment (handles both registered and non-registered)
  const handleSetAllNoPayment = useCallback((
    filteredLoansWithKeys: LoanWithKey[],
    registeredPaymentsMap: Map<string, LoanPayment[]>
  ) => {
    const newPayments: Record<string, PaymentEntry> = {}
    const newEditedPayments: Record<string, EditedPayment> = { ...editedPayments }
    let registeredCount = 0
    let newCount = 0

    // Primero: marcar TODOS los pagos registrados para eliminación
    // (incluyendo los que no están en filteredLoans, ej: préstamos terminados)
    registeredPaymentsMap.forEach((paymentsArray, loanId) => {
      paymentsArray.forEach((registeredPayment) => {
        newEditedPayments[registeredPayment.id] = {
          paymentId: registeredPayment.id,
          loanId,
          amount: registeredPayment.amount,
          comission: registeredPayment.comission,
          paymentMethod: registeredPayment.paymentMethod,
          isDeleted: true,
        }
        registeredCount++
      })
    })

    // Segundo: marcar préstamos sin pago registrado como "sin pago"
    filteredLoansWithKeys.forEach(({ rowKey, loan }) => {
      if (!registeredPaymentsMap.has(loan.id)) {
        const initialCommission = payments[rowKey]?.initialCommission ||
          (loan.loantype?.loanPaymentComission
            ? Math.round(parseFloat(loan.loantype.loanPaymentComission)).toString()
            : '0')

        newPayments[rowKey] = {
          loanId: loan.id,
          amount: '0',
          commission: '0',
          initialCommission,
          paymentMethod: payments[rowKey]?.paymentMethod || 'CASH',
          isNoPayment: true,
        }
        newCount++
      }
    })

    setPayments(newPayments)
    setEditedPayments(newEditedPayments)

    const description = registeredCount > 0
      ? `${registeredCount} pago(s) marcado(s) para eliminar, ${newCount} sin pago.`
      : `${newCount} préstamo(s) marcado(s) como sin pago.`

    toast({
      title: 'Sin pago marcado',
      description,
    })
  }, [payments, editedPayments, toast])

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

  // Distribute total commission across eligible loans (forced exact match)
  const handleDistributeCommissionTotal = useCallback((reportedTotalStr: string, baseCommissionOverride?: string) => {
    const reportedTotal = parseFloat(reportedTotalStr || '0')
    if (isNaN(reportedTotal) || reportedTotal < 0) {
      toast({ title: 'Error', description: 'Ingresa un monto válido de comisión total.', variant: 'destructive' })
      return
    }

    // Build eligible loans with expected commissions
    const eligible: Array<{
      rowKey: string
      expectedCommission: number
      baseCommission: number
      paymentAmount: number
    }> = []

    const overrideValue = baseCommissionOverride ? parseFloat(baseCommissionOverride) : 0
    const hasOverride = overrideValue > 0

    Object.entries(payments).forEach(([rowKey, payment]) => {
      if (payment.isNoPayment) return
      const amountNum = parseFloat(payment.amount || '0')
      if (amountNum <= 0) return

      const loanWithKey = loansWithKeys.find((l) => l.rowKey === rowKey)
      const loan = loanWithKey?.loan
      if (!loan) return

      const expectedWeekly = parseFloat(loan.expectedWeeklyPayment || '0')
      const loantypeCommission = parseFloat(loan.loantype?.loanPaymentComission || '0')
      // Only use override if the loantype has a commission > 0
      const baseCommission = (hasOverride && loantypeCommission > 0) ? overrideValue : loantypeCommission
      if (expectedWeekly <= 0 || baseCommission <= 0) return

      const multiplier = Math.floor(amountNum / expectedWeekly)
      const expectedCommission = multiplier >= 1 ? baseCommission * multiplier : 0

      eligible.push({ rowKey, expectedCommission, baseCommission, paymentAmount: amountNum })
    })

    if (eligible.length === 0) {
      toast({ title: 'Sin comisiones', description: 'No hay préstamos con abono elegibles para comisión.' })
      return
    }

    const expectedTotal = eligible.reduce((sum, l) => sum + l.expectedCommission, 0)

    // Build the final commission map - forced exact match
    const commissionMap = new Map<string, number>()

    if (reportedTotal === 0) {
      // All commissions $0
      eligible.forEach((l) => commissionMap.set(l.rowKey, 0))
    } else if (reportedTotal === expectedTotal) {
      // Exact match - apply expected
      eligible.forEach((l) => commissionMap.set(l.rowKey, l.expectedCommission))
    } else if (reportedTotal < expectedTotal) {
      // DEFICIT: need to reduce. Remove from smallest payments first.
      // If removing a full commission overshoots, partially reduce that loan.
      const sorted = [...eligible].sort((a, b) => a.paymentAmount - b.paymentAmount)
      // Start with all expected
      sorted.forEach((l) => commissionMap.set(l.rowKey, l.expectedCommission))

      let deficit = expectedTotal - reportedTotal
      for (const loan of sorted) {
        if (deficit <= 0) break
        const currentComm = commissionMap.get(loan.rowKey) || 0
        if (currentComm <= 0) continue

        if (deficit >= currentComm) {
          // Remove entire commission
          commissionMap.set(loan.rowKey, 0)
          deficit -= currentComm
        } else {
          // Partial reduction - reduce only what's needed
          commissionMap.set(loan.rowKey, Math.round((currentComm - deficit) * 100) / 100)
          deficit = 0
        }
      }
    } else {
      // SURPLUS: need to add more. Give extra commission units to largest payments first.
      // Start with all expected
      eligible.forEach((l) => commissionMap.set(l.rowKey, l.expectedCommission))

      // Sort by payment amount DESC - biggest payers get extra first
      const sorted = [...eligible].sort((a, b) => b.paymentAmount - a.paymentAmount)
      let surplus = reportedTotal - expectedTotal

      // Keep looping until surplus is consumed (may need multiple passes)
      while (surplus > 0.01) {
        let distributed = false
        for (const loan of sorted) {
          if (surplus <= 0.01) break
          if (surplus >= loan.baseCommission) {
            // Add a full commission unit
            commissionMap.set(loan.rowKey, (commissionMap.get(loan.rowKey) || 0) + loan.baseCommission)
            surplus -= loan.baseCommission
            distributed = true
          } else {
            // Add partial remainder to this loan
            commissionMap.set(loan.rowKey, Math.round(((commissionMap.get(loan.rowKey) || 0) + surplus) * 100) / 100)
            surplus = 0
            distributed = true
          }
        }
        // Safety: if no distribution happened in a full pass, add remainder to first loan
        if (!distributed && surplus > 0.01) {
          const first = sorted[0]
          commissionMap.set(first.rowKey, Math.round(((commissionMap.get(first.rowKey) || 0) + surplus) * 100) / 100)
          surplus = 0
        }
      }
    }

    // Apply to state
    setPayments((prev) => {
      const updated = { ...prev }
      commissionMap.forEach((commission, rowKey) => {
        if (updated[rowKey]) {
          updated[rowKey] = {
            ...updated[rowKey],
            commission: commission.toString(),
          }
        }
      })
      return updated
    })

    // Toast feedback
    const finalTotal = Array.from(commissionMap.values()).reduce((sum, v) => sum + v, 0)
    const zeroCount = Array.from(commissionMap.values()).filter((v) => v === 0).length
    const extraCount = Array.from(commissionMap.entries()).filter(([rowKey, comm]) => {
      const loan = eligible.find((l) => l.rowKey === rowKey)
      return loan && comm > loan.expectedCommission
    }).length
    const reducedCount = Array.from(commissionMap.entries()).filter(([rowKey, comm]) => {
      const loan = eligible.find((l) => l.rowKey === rowKey)
      return loan && comm > 0 && comm < loan.expectedCommission
    }).length

    const parts: string[] = []
    if (extraCount > 0) parts.push(`${extraCount} con comisión extra`)
    if (reducedCount > 0) parts.push(`${reducedCount} con comisión parcial`)
    if (zeroCount > 0) parts.push(`${zeroCount} sin comisión`)

    toast({
      title: 'Comisión distribuida',
      description: `${formatCurrency(Math.round(finalTotal * 100) / 100)} distribuido en ${eligible.length} préstamo(s). ${parts.length > 0 ? parts.join(', ') + '.' : ''}`,
    })
  }, [payments, loansWithKeys, toast])

  // === Edited Payments ===
  // Key by paymentId to support editing any payment (including multiple payments per loan)
  const handleStartEditPayment = useCallback((loanId: string, registeredPayment: LoanPayment, startDeleted: boolean = false) => {
    setEditedPayments((prev) => ({
      ...prev,
      [registeredPayment.id]: {
        paymentId: registeredPayment.id,
        loanId,
        amount: registeredPayment.amount,
        comission: registeredPayment.comission,
        paymentMethod: registeredPayment.paymentMethod,
        isDeleted: startDeleted,
      },
    }))
  }, [])

  const handleEditPaymentChange = useCallback((
    paymentId: string,
    field: keyof EditedPayment,
    value: string | boolean
  ) => {
    setEditedPayments((prev) => ({
      ...prev,
      [paymentId]: {
        ...prev[paymentId],
        [field]: value,
      },
    }))
  }, [])

  const handleToggleDeletePayment = useCallback((paymentId: string) => {
    setEditedPayments((prev) => ({
      ...prev,
      [paymentId]: {
        ...prev[paymentId],
        isDeleted: !prev[paymentId]?.isDeleted,
      },
    }))
  }, [])

  const handleCancelEditPayment = useCallback((paymentId: string) => {
    setEditedPayments((prev) => {
      const updated = { ...prev }
      delete updated[paymentId]
      return updated
    })
  }, [])

  const clearEditedPayments = useCallback(() => {
    setEditedPayments({})
  }, [])

  // Reset payments state and force re-initialization
  const resetPayments = useCallback(() => {
    setPayments({})
    setEditedPayments({})
    setLastSelectedIndex(null)
    // Increment counter to trigger re-initialization effect
    setResetCounter((c) => c + 1)
  }, [])

  return {
    // State
    payments,
    editedPayments,
    lastSelectedIndex,
    // Payment handlers
    handlePaymentChange,
    handleCommissionChange,
    handlePaymentMethodChange,
    handleToggleNoPayment,
    handleToggleNoPaymentWithShift,
    handleSetAllWeekly,
    handleSetAllNoPayment,
    handleClearAll,
    handleApplyGlobalCommission,
    handleDistributeCommissionTotal,
    resetPayments,
    // Edited payment handlers
    handleStartEditPayment,
    handleEditPaymentChange,
    handleToggleDeletePayment,
    handleCancelEditPayment,
    clearEditedPayments,
    // Setters for external use
    setLastSelectedIndex,
  }
}
