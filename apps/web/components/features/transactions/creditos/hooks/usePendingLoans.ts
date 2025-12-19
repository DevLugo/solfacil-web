'use client'

import { useState, useCallback, useMemo } from 'react'
import type { PendingLoan } from '../types'

export function usePendingLoans() {
  const [pendingLoans, setPendingLoans] = useState<PendingLoan[]>([])

  const addPendingLoan = useCallback((loan: PendingLoan) => {
    setPendingLoans((prev) => [...prev, loan])
  }, [])

  const removePendingLoan = useCallback((tempId: string) => {
    setPendingLoans((prev) => prev.filter((l) => l.tempId !== tempId))
  }, [])

  const updatePendingLoan = useCallback((tempId: string, updates: Partial<PendingLoan>) => {
    setPendingLoans((prev) =>
      prev.map((l) => (l.tempId === tempId ? { ...l, ...updates } : l))
    )
  }, [])

  const clearPendingLoans = useCallback(() => {
    setPendingLoans([])
  }, [])

  // Calculate totals
  const totals = useMemo(() => {
    return pendingLoans.reduce(
      (acc, loan) => {
        const amount = parseFloat(loan.amountGived) || 0
        acc.totalAmount += amount
        acc.count += 1
        if (loan.isRenewal) {
          acc.renewals += 1
        } else {
          acc.newLoans += 1
        }
        return acc
      },
      { totalAmount: 0, count: 0, renewals: 0, newLoans: 0 }
    )
  }, [pendingLoans])

  // Generate unique tempId
  const generateTempId = useCallback(() => {
    return `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }, [])

  return {
    pendingLoans,
    addPendingLoan,
    removePendingLoan,
    updatePendingLoan,
    clearPendingLoans,
    totals,
    generateTempId,
  }
}
