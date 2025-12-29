'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { DollarSign, Ban } from 'lucide-react'
import { useQuery } from '@apollo/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useTransactionContext } from '../transaction-context'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/use-auth'
import { FALCOS_PENDIENTES_QUERY } from '@/graphql/queries/transactions'

// Local imports
import { useAbonosQueries, usePayments, useTotals } from './hooks'
import {
  EmptyState,
  LoadingState,
  KPIBadges,
  ActionBar,
  DistributionModal,
  MultaModal,
  SuccessDialog,
  UserAddedPaymentRow,
  LoanPaymentRow,
  FalcosPendientesDrawer,
  RegisteredSectionHeader,
} from './components'
import { hasIncompleteAval, hasIncompletePhone } from './utils'
import type { ActiveLoan } from './types'

export function AbonosTab() {
  const { selectedRouteId, selectedDate, selectedLeadId } = useTransactionContext()
  const { toast } = useToast()
  const { user } = useAuth()
  const isAdmin = user?.role === 'ADMIN'

  // UI State
  const [searchTerm, setSearchTerm] = useState('')
  const [showOnlyIncomplete, setShowOnlyIncomplete] = useState(false)
  const [globalCommission, setGlobalCommission] = useState('')
  const [showDistributionModal, setShowDistributionModal] = useState(false)
  const [isEditingDistributionOnly, setIsEditingDistributionOnly] = useState(false)
  // For edit distribution mode: store the original cash (before distribution) and money transfer sum
  const [editDistributionData, setEditDistributionData] = useState<{ originalCash: number; moneyTransferSum: number } | null>(null)
  const [bankTransferAmount, setBankTransferAmount] = useState('0')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSavingEdits, setIsSavingEdits] = useState(false)
  const [savingProgress, setSavingProgress] = useState<{ current: number; total: number } | null>(null)
  const [showSuccessDialog, setShowSuccessDialog] = useState(false)
  const [savedCount, setSavedCount] = useState(0)

  // Falco state
  const [falcoEnabled, setFalcoEnabled] = useState(false)
  const [falcoAmount, setFalcoAmount] = useState('0')

  // Multa modal state
  const [showMultaModal, setShowMultaModal] = useState(false)
  const [multaAmount, setMultaAmount] = useState('')
  const [selectedAccountId, setSelectedAccountId] = useState<string>('')
  const [isCreatingMulta, setIsCreatingMulta] = useState(false)

  // Falcos drawer state
  const [showFalcosDrawer, setShowFalcosDrawer] = useState(false)

  // Queries
  const {
    loans,
    loansLoading,
    registeredPaymentsMap,
    leadPaymentReceivedId,
    leadPaymentData,
    cashAccounts,
    startDateUTC,
    endDateUTC,
    createTransaction,
    createLeadPaymentReceived,
    updateLeadPaymentReceived,
    refetchAll,
    fetchLeadPaymentById,
  } = useAbonosQueries({
    selectedRouteId,
    selectedLeadId,
    selectedDate,
  })

  // Falcos pendientes query
  const { data: falcosData, loading: falcosLoading, refetch: refetchFalcos } = useQuery(
    FALCOS_PENDIENTES_QUERY,
    {
      variables: { routeId: selectedRouteId },
      skip: !selectedRouteId,
    }
  )

  const falcosPendientes = falcosData?.falcosPendientes || []

  // Payments management
  const {
    payments,
    editedPayments,
    userAddedPayments,
    handlePaymentChange,
    handleCommissionChange,
    handlePaymentMethodChange,
    handleToggleNoPaymentWithShift,
    handleSetAllWeekly,
    handleSetAllNoPayment,
    handleClearAll,
    handleApplyGlobalCommission,
    handleStartEditPayment,
    handleEditPaymentChange,
    handleToggleDeletePayment,
    handleCancelEditPayment,
    clearEditedPayments,
    handleAddPayment,
    handleUserAddedPaymentChange,
    handleRemoveUserAddedPayment,
    getAvailableLoansForRow,
    clearUserAddedPayments,
    resetPayments,
    setLastSelectedIndex,
  } = usePayments({
    loans,
    selectedLeadId,
    selectedDate,
    globalCommission,
    leadPaymentReceivedId,
    registeredPaymentsMap,
  })

  // Totals calculation
  const { totals, registeredTotals, combinedTotals, modalTotals } = useTotals({
    payments,
    editedPayments,
    userAddedPayments,
    registeredPaymentsMap,
  })

  // NOTE: We intentionally do NOT auto-cap bankTransferAmount when available cash changes
  // The modal's validation will show an error if transfer exceeds available cash
  // This allows the user to see their previous transfer value and decide what to do

  // Filter and sort loans - pending (not captured) first, captured last
  // If the day is captured (leadPaymentReceivedId exists), ALL loans are captured
  const filteredLoans = useMemo(() => {
    let filtered = loans

    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (loan) =>
          loan.borrower.personalData?.fullName?.toLowerCase().includes(term) ||
          loan.collaterals?.some((c) => c.fullName?.toLowerCase().includes(term))
      )
    }

    if (showOnlyIncomplete) {
      filtered = filtered.filter((loan) => hasIncompleteAval(loan) || hasIncompletePhone(loan))
    }

    // Keep original order (by signDate) always - don't group by registered/pending
    // This allows comparing against manual PDFs from workers
    return filtered
  }, [loans, searchTerm, showOnlyIncomplete])

  // Separate loans into pending and captured for rendering
  // A loan is "captured" if:
  // 1. It has a registered payment, OR
  // 2. The day was captured (leadPaymentReceivedId exists) but no payment for this loan (it was a "falta")
  const { pendingLoans, capturedLoans } = useMemo(() => {
    const pending: ActiveLoan[] = []
    const captured: ActiveLoan[] = []
    const isDayCaptured = !!leadPaymentReceivedId

    filteredLoans.forEach((loan) => {
      const hasRegisteredPayment = registeredPaymentsMap.has(loan.id)
      // If day is captured, ALL loans are considered captured (either with payment or as "falta")
      if (hasRegisteredPayment || isDayCaptured) {
        captured.push(loan)
      } else {
        pending.push(loan)
      }
    })

    return { pendingLoans: pending, capturedLoans: captured }
  }, [filteredLoans, registeredPaymentsMap, leadPaymentReceivedId])

  // Counts
  const incompleteCount = useMemo(() => {
    return loans.filter((loan) => hasIncompleteAval(loan) || hasIncompletePhone(loan)).length
  }, [loans])

  // Count total registered payments (not just loans with payments)
  const registeredCount = useMemo(() => {
    let count = 0
    registeredPaymentsMap.forEach((payments) => {
      count += payments.length
    })
    return count
  }, [registeredPaymentsMap])
  const hasEditedPayments = Object.keys(editedPayments).length > 0
  const editedCount = Object.values(editedPayments).filter((p) => !p.isDeleted).length
  const deletedCount = Object.values(editedPayments).filter((p) => p.isDeleted).length

  // Handlers
  const handleSaveAll = () => {
    const validPayments = Object.values(payments).filter(
      (p) => !p.isNoPayment && p.amount && parseFloat(p.amount) > 0
    )

    if (validPayments.length === 0) {
      toast({
        title: 'Sin abonos',
        description: 'No hay abonos para guardar.',
        variant: 'destructive',
      })
      return
    }

    setBankTransferAmount('0')
    setFalcoEnabled(false)
    setFalcoAmount('0')
    setShowDistributionModal(true)
  }

  const handleConfirmSave = async () => {
    const validPayments = Object.values(payments).filter(
      (p) => !p.isNoPayment && p.amount && parseFloat(p.amount) > 0
    )

    const validUserAddedPayments = userAddedPayments.filter(
      (p) => p.loanId && p.amount && parseFloat(p.amount) > 0
    )

    const newPaymentsToSave = [
      ...validPayments.map((p) => ({
        loanId: p.loanId,
        amount: p.amount,
        comission: p.commission || '0',
        paymentMethod: p.paymentMethod,
      })),
      ...validUserAddedPayments.map((p) => ({
        loanId: p.loanId,
        amount: p.amount,
        comission: p.commission || '0',
        paymentMethod: p.paymentMethod,
      })),
    ]

    if (newPaymentsToSave.length === 0) {
      toast({
        title: 'Sin pagos',
        description: 'No hay pagos válidos para guardar.',
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)
    setSavingProgress({ current: 0, total: 1 })

    try {
      const bankTransferValue = parseFloat(bankTransferAmount || '0')
      const falcoValue = falcoEnabled ? parseFloat(falcoAmount || '0') : 0

      // If there's already a LeadPaymentReceived for this day, update it instead of creating a new one
      if (leadPaymentReceivedId) {
        // Build the complete list of payments: existing + new
        // Flatten the array since registeredPaymentsMap now stores LoanPayment[] per loan
        const existingPayments = Array.from(registeredPaymentsMap.entries()).flatMap(
          ([loanId, payments]) => payments.map(payment => ({
            paymentId: payment.id,
            loanId,
            amount: payment.amount,
            comission: payment.comission || '0',
            paymentMethod: payment.paymentMethod,
            isDeleted: false,
          }))
        )

        // New payments don't have a paymentId
        const newPaymentsForUpdate = newPaymentsToSave.map((p) => ({
          loanId: p.loanId,
          amount: p.amount,
          comission: p.comission,
          paymentMethod: p.paymentMethod,
        }))

        // Calculate combined totals (flatten payments arrays)
        const existingTotal = Array.from(registeredPaymentsMap.values()).reduce(
          (sum, payments) => sum + payments.reduce((s, p) => s + parseFloat(p.amount || '0'), 0),
          0
        )
        const newTotal = newPaymentsToSave.reduce(
          (sum, p) => sum + parseFloat(p.amount || '0'),
          0
        )
        const combinedTotal = existingTotal + newTotal

        // Calculate cash vs bank for new payments
        let newCash = 0
        let newBank = 0
        newPaymentsToSave.forEach((p) => {
          const amount = parseFloat(p.amount || '0')
          if (p.paymentMethod === 'CASH') {
            newCash += amount
          } else {
            newBank += amount
          }
        })

        // Get existing cash/bank from leadPaymentData
        const existingCashPaid = parseFloat(leadPaymentData?.leadPaymentReceivedByLeadAndDate?.cashPaidAmount || '0')
        const existingBankPaid = parseFloat(leadPaymentData?.leadPaymentReceivedByLeadAndDate?.bankPaidAmount || '0')

        const totalCash = existingCashPaid + newCash - bankTransferValue - falcoValue
        const totalBank = existingBankPaid + newBank + bankTransferValue

        await updateLeadPaymentReceived({
          variables: {
            id: leadPaymentReceivedId,
            input: {
              paidAmount: combinedTotal.toString(),
              cashPaidAmount: totalCash.toString(),
              bankPaidAmount: totalBank.toString(),
              payments: [...existingPayments, ...newPaymentsForUpdate],
            },
          },
        })
      } else {
        // No existing LeadPaymentReceived, create a new one
        const cashValue = totals.cash - bankTransferValue - falcoValue

        await createLeadPaymentReceived({
          variables: {
            input: {
              leadId: selectedLeadId,
              agentId: selectedLeadId,
              expectedAmount: totals.total.toString(),
              paidAmount: totals.total.toString(),
              cashPaidAmount: cashValue.toString(),
              bankPaidAmount: (totals.bank + bankTransferValue).toString(),
              falcoAmount: falcoValue.toString(),
              paymentDate: selectedDate.toISOString(),
              payments: newPaymentsToSave,
            },
          },
        })
      }

      setSavingProgress({ current: 1, total: 1 })
      setSavedCount(newPaymentsToSave.length)
      setShowDistributionModal(false)
      setShowSuccessDialog(true)

      // Refetch first, then reset to ensure clean state with fresh data
      await refetchAll()
      resetPayments()

      toast({
        title: 'Abonos guardados',
        description: `Se guardaron ${newPaymentsToSave.length} abono(s) correctamente.`,
      })
    } catch (error) {
      console.error('Error al guardar abonos:', error)
      toast({
        title: 'Error',
        description: 'No se pudieron guardar los abonos. Intenta de nuevo.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
      setSavingProgress(null)
    }
  }

  const handleSaveEditedPayments = () => {
    const editsToSave = Object.values(editedPayments)
    if (editsToSave.length === 0) return

    // Check if changes are ONLY commissions (no amount or payment method changes)
    let hasAmountOrMethodChanges = false
    for (const edit of editsToSave) {
      // Find the original payment
      let originalPayment: { amount: string; paymentMethod: string } | undefined
      registeredPaymentsMap.forEach((payments) => {
        const found = payments.find(p => p.id === edit.paymentId)
        if (found) originalPayment = found
      })

      if (!originalPayment) continue

      // Check for amount changes (including deletions)
      const oldAmount = parseFloat(originalPayment.amount || '0')
      const newAmount = edit.isDeleted ? 0 : parseFloat(edit.amount || '0')
      if (oldAmount !== newAmount) {
        hasAmountOrMethodChanges = true
        break
      }

      // Check for payment method changes
      if (originalPayment.paymentMethod !== edit.paymentMethod) {
        hasAmountOrMethodChanges = true
        break
      }
    }

    // If ONLY commissions changed, save directly without showing distribution modal
    if (!hasAmountOrMethodChanges) {
      handleConfirmSaveEditsDirectly()
      return
    }

    // Otherwise, show distribution modal for user to confirm distribution
    // Pre-load the current cashToBank value from the existing distribution
    // This preserves the user's previous transfer intention
    const existingRecord = leadPaymentData?.leadPaymentReceivedByLeadAndDate
    if (existingRecord) {
      // Calculate current moneyTransferSum from registered payments
      let currentMoneyTransferSum = 0
      registeredPaymentsMap.forEach((payments) => {
        payments.forEach((payment) => {
          // Check if this payment has a pending edit
          const edit = editedPayments[payment.id]
          // Use the NEW method if edited, otherwise use the original
          const method = edit ? edit.paymentMethod : payment.paymentMethod
          const amount = edit?.isDeleted ? 0 : (edit ? parseFloat(edit.amount || '0') : parseFloat(payment.amount || '0'))
          if (method === 'MONEY_TRANSFER') {
            currentMoneyTransferSum += amount
          }
        })
      })

      // Current cashToBank = bankPaidAmount - moneyTransferSum (from original, not edited)
      const existingBankPaid = parseFloat(existingRecord.bankPaidAmount || '0')
      const existingMoneyTransferSum = Array.from(registeredPaymentsMap.values())
        .flat()
        .filter(p => p.paymentMethod === 'MONEY_TRANSFER')
        .reduce((sum, p) => sum + parseFloat(p.amount || '0'), 0)
      const existingCashToBank = existingBankPaid - existingMoneyTransferSum

      console.log('[handleSaveEditedPayments] Pre-loading distribution:', {
        existingBankPaid,
        existingMoneyTransferSum,
        existingCashToBank,
        newMoneyTransferSum: currentMoneyTransferSum,
      })

      // Pre-load with the existing cashToBank value (what leader previously transferred)
      setBankTransferAmount(Math.max(0, existingCashToBank).toString())
    } else {
      setBankTransferAmount('0')
    }

    setFalcoEnabled(false)
    setFalcoAmount('0')
    setShowDistributionModal(true)
  }

  // Direct save when only commissions change (no distribution modal needed)
  const handleConfirmSaveEditsDirectly = async () => {
    if (!leadPaymentReceivedId) {
      toast({
        title: 'Error',
        description: 'No se encontró el registro de pagos del día. Recarga la página e intenta de nuevo.',
        variant: 'destructive',
      })
      return
    }

    setIsSavingEdits(true)

    try {
      const paymentsToUpdate = Object.values(editedPayments).map((edit) => ({
        paymentId: edit.paymentId,
        loanId: edit.loanId,
        amount: edit.amount,
        comission: edit.comission,
        paymentMethod: edit.paymentMethod,
        isDeleted: edit.isDeleted,
      }))

      console.log('[AbonosTab] Saving commission-only changes (no distribution change):', {
        id: leadPaymentReceivedId,
        paymentsCount: paymentsToUpdate.length,
      })

      // Only send payments, NO cashPaidAmount or bankPaidAmount
      // This tells the backend to only update the payments without changing distribution
      const result = await updateLeadPaymentReceived({
        variables: {
          id: leadPaymentReceivedId,
          input: {
            payments: paymentsToUpdate,
          },
        },
      })

      const editedCount = Object.values(editedPayments).filter(e => !e.isDeleted).length
      toast({
        title: 'Cambios guardados',
        description: `Se actualizaron las comisiones de ${editedCount} pago(s).`,
      })

      clearEditedPayments()
      await refetchAll()
    } catch (error) {
      console.error('Error al guardar cambios:', error)
      toast({
        title: 'Error',
        description: 'No se pudieron guardar los cambios. Intenta de nuevo.',
        variant: 'destructive',
      })
    } finally {
      setIsSavingEdits(false)
    }
  }

  // Open modal to edit ONLY the distribution (without modifying payments)
  const handleEditDistribution = async () => {
    if (!leadPaymentReceivedId) {
      toast({
        title: 'Error',
        description: 'No hay pagos registrados para editar la distribución.',
        variant: 'destructive',
      })
      return
    }

    // IMPORTANT: Fetch by ID to ensure we get the correct record
    // This prevents issues when selectedDate changes between saves
    const freshLeadPaymentData = await fetchLeadPaymentById(leadPaymentReceivedId)

    console.log('[handleEditDistribution] Fresh data received by ID:', {
      id: leadPaymentReceivedId,
      freshLeadPaymentData,
      cashPaidAmount: freshLeadPaymentData?.cashPaidAmount,
      bankPaidAmount: freshLeadPaymentData?.bankPaidAmount,
      payments: freshLeadPaymentData?.payments,
    })

    // Calculate the sum of MONEY_TRANSFER payments FROM THE FETCHED RECORD
    // This ensures we use the correct payments even if selectedDate changed
    let moneyTransferSum = 0
    if (freshLeadPaymentData?.payments) {
      freshLeadPaymentData.payments.forEach((payment: { paymentMethod: string; amount: string }) => {
        if (payment.paymentMethod === 'MONEY_TRANSFER') {
          moneyTransferSum += parseFloat(payment.amount || '0')
        }
      })
    }

    // Get current distribution from the FRESH record
    const currentBankPaid = parseFloat(freshLeadPaymentData?.bankPaidAmount || '0')

    // Calculate how much of the cash was transferred to bank by the leader
    // cashToBank = bankPaidAmount - moneyTransferSum
    const cashToBank = currentBankPaid - moneyTransferSum

    // Get current cash distribution
    const currentCashPaid = parseFloat(freshLeadPaymentData?.cashPaidAmount || '0')

    // Original cash = what's currently in cash + what was transferred to bank
    const originalCash = currentCashPaid + cashToBank

    console.log('[handleEditDistribution] Calculated values:', {
      moneyTransferSum,
      currentBankPaid,
      currentCashPaid,
      cashToBank,
      originalCash,
    })

    setIsEditingDistributionOnly(true)
    // Store the original values for the modal
    setEditDistributionData({ originalCash, moneyTransferSum })
    // Pre-load with the current transfer amount (what the leader already transferred from cash)
    setBankTransferAmount(cashToBank.toString())
    setFalcoEnabled(false)
    setFalcoAmount('0')
    setShowDistributionModal(true)
  }

  // Save ONLY distribution changes (no payment modifications)
  const handleConfirmDistributionOnly = async () => {
    if (!leadPaymentReceivedId || !editDistributionData) {
      toast({
        title: 'Error',
        description: 'No se encontró el registro de pagos del día.',
        variant: 'destructive',
      })
      return
    }

    setIsSavingEdits(true)

    try {
      // bankTransferAmount is the TOTAL amount the leader wants to transfer to bank
      // NOT an adjustment - it's the absolute value
      const bankTransferValue = parseFloat(bankTransferAmount || '0')

      // Calculate new distribution based on ORIGINAL values:
      // - originalCash: total cash received from clients (before any transfer to bank)
      // - moneyTransferSum: what clients paid by transfer (this is fixed, goes directly to bank)
      const { originalCash, moneyTransferSum } = editDistributionData

      // New cash = original cash - what the leader transfers to bank
      const newCashPaid = originalCash - bankTransferValue
      // New bank = money transfers from clients + what the leader transfers
      const newBankPaid = moneyTransferSum + bankTransferValue

      console.log('[AbonosTab] Saving distribution-only change:', {
        id: leadPaymentReceivedId,
        originalCash,
        moneyTransferSum,
        leaderTransfer: bankTransferValue,
        new: { cash: newCashPaid, bank: newBankPaid },
      })

      await updateLeadPaymentReceived({
        variables: {
          id: leadPaymentReceivedId,
          input: {
            cashPaidAmount: newCashPaid.toString(),
            bankPaidAmount: newBankPaid.toString(),
            distributionOnlyChange: true,
          },
        },
      })

      toast({
        title: 'Distribución actualizada',
        description: `Efectivo: ${newCashPaid.toLocaleString()}, Banco: ${newBankPaid.toLocaleString()}`,
      })

      setShowDistributionModal(false)
      setIsEditingDistributionOnly(false)
      setEditDistributionData(null)
      await refetchAll()
    } catch (error) {
      console.error('Error al actualizar distribución:', error)
      toast({
        title: 'Error',
        description: 'No se pudo actualizar la distribución. Intenta de nuevo.',
        variant: 'destructive',
      })
    } finally {
      setIsSavingEdits(false)
    }
  }

  const handleConfirmSaveEdits = async () => {
    // If we're editing distribution only, use the dedicated function
    if (isEditingDistributionOnly) {
      await handleConfirmDistributionOnly()
      return
    }

    if (!leadPaymentReceivedId) {
      toast({
        title: 'Error',
        description: 'No se encontró el registro de pagos del día. Recarga la página e intenta de nuevo.',
        variant: 'destructive',
      })
      return
    }

    setIsSavingEdits(true)

    try {
      // ONLY send edited payments to the backend
      // The backend will handle updating only these payments without affecting others
      const paymentsToUpdate: {
        paymentId?: string
        loanId: string
        amount: string
        comission?: string
        paymentMethod: 'CASH' | 'MONEY_TRANSFER'
        isDeleted?: boolean
      }[] = []

      // Only add payments that were actually edited
      Object.values(editedPayments).forEach((edit) => {
        paymentsToUpdate.push({
          paymentId: edit.paymentId,
          loanId: edit.loanId,
          amount: edit.amount,
          comission: edit.comission,
          paymentMethod: edit.paymentMethod,
          isDeleted: edit.isDeleted,
        })
      })

      // Calculate the NEW totals after applying edits
      // IMPORTANT: cashPaidAmount and bankPaidAmount represent how the LEADER distributes money,
      // NOT how individual clients paid. We only update paidAmount based on payment edits.
      // Distribution (cash vs bank) only changes if user explicitly adjusts in the modal.
      const existingCashPaid = parseFloat(leadPaymentData?.leadPaymentReceivedByLeadAndDate?.cashPaidAmount || '0')
      const existingBankPaid = parseFloat(leadPaymentData?.leadPaymentReceivedByLeadAndDate?.bankPaidAmount || '0')
      const existingTotal = parseFloat(leadPaymentData?.leadPaymentReceivedByLeadAndDate?.paidAmount || '0')

      // Calculate delta separately for CASH and BANK payments based on payment method
      let cashDelta = 0
      let bankDelta = 0

      Object.values(editedPayments).forEach((edit) => {
        // Find the original payment to calculate delta
        let originalPayment: { amount: string; paymentMethod: string } | undefined
        registeredPaymentsMap.forEach((payments) => {
          const found = payments.find(p => p.id === edit.paymentId)
          if (found) originalPayment = found
        })

        if (!originalPayment) return

        const oldAmount = parseFloat(originalPayment.amount || '0')
        const newAmount = edit.isDeleted ? 0 : parseFloat(edit.amount || '0')
        const amountDelta = newAmount - oldAmount

        // Determine where the delta goes based on NEW payment method
        // (if method changed, the full amount moves between accounts)
        const oldMethod = originalPayment.paymentMethod
        const newMethod = edit.paymentMethod

        if (oldMethod === newMethod) {
          // Same method: delta goes to the same account
          if (newMethod === 'MONEY_TRANSFER') {
            bankDelta += amountDelta
          } else {
            cashDelta += amountDelta
          }
        } else {
          // Method changed: old amount leaves one account, new amount enters another
          if (oldMethod === 'MONEY_TRANSFER') {
            bankDelta -= oldAmount  // Remove from bank
            cashDelta += newAmount  // Add to cash
          } else {
            cashDelta -= oldAmount  // Remove from cash
            bankDelta += newAmount  // Add to bank
          }
        }
      })

      const totalDelta = cashDelta + bankDelta

      // New total = existing + delta
      const newTotalPaid = existingTotal + totalDelta

      // IMPORTANT: existingCashPaid and existingBankPaid already have the OLD cashToBank baked in:
      // - existingCashPaid = (original CASH payments) - oldCashToBank
      // - existingBankPaid = (original MONEY_TRANSFER payments) + oldCashToBank
      //
      // To correctly apply the NEW bankTransferValue, we need to:
      // 1. Calculate the OLD cashToBank that's already applied
      // 2. Use the DIFFERENCE between new and old cashToBank

      // Calculate OLD cashToBank from existing distribution
      const existingMoneyTransferSum = Array.from(registeredPaymentsMap.values())
        .flat()
        .filter(p => p.paymentMethod === 'MONEY_TRANSFER')
        .reduce((sum, p) => sum + parseFloat(p.amount || '0'), 0)
      const oldCashToBank = existingBankPaid - existingMoneyTransferSum

      // For cash/bank distribution:
      // - cashDelta goes to cash, bankDelta goes to bank (based on payment methods)
      // - bankTransferAmount is the NEW total leader transfer (not a delta)
      let newCashToBank = parseFloat(bankTransferAmount || '0')

      // Calculate the "raw" cash BEFORE any leader transfer
      // This is the cash that would exist if the leader transferred nothing
      const rawCashAfterMethodChanges = existingCashPaid + oldCashToBank + cashDelta

      // Safety check: if newCashToBank exceeds available raw cash, adjust and warn
      if (newCashToBank > rawCashAfterMethodChanges) {
        const adjustedValue = Math.max(0, rawCashAfterMethodChanges)
        console.log('[AbonosTab] Auto-adjusting bankTransferValue:', {
          requested: newCashToBank,
          availableCash: rawCashAfterMethodChanges,
          adjusted: adjustedValue,
        })
        toast({
          title: 'Transferencia ajustada',
          description: `La transferencia se ajustó de ${newCashToBank} a ${adjustedValue} (máximo disponible).`,
          variant: 'default',
        })
        newCashToBank = adjustedValue
      }

      // Calculate NEW distribution using the transfer delta
      // cashToBankDelta = how much MORE/LESS to transfer vs before
      const cashToBankDelta = newCashToBank - oldCashToBank
      const newCashPaid = existingCashPaid + cashDelta - cashToBankDelta
      const newBankPaid = existingBankPaid + bankDelta + cashToBankDelta

      console.log('[AbonosTab] Sending updateLeadPaymentReceived with:', {
        id: leadPaymentReceivedId,
        existing: { total: existingTotal, cash: existingCashPaid, bank: existingBankPaid },
        deltas: { cash: cashDelta, bank: bankDelta, total: totalDelta },
        transfer: {
          existingMoneyTransferSum,
          oldCashToBank,
          newCashToBank,
          cashToBankDelta,
          rawCashAfterMethodChanges,
        },
        new: { total: newTotalPaid, cash: newCashPaid, bank: newBankPaid },
        editedPaymentsCount: paymentsToUpdate.length,
        deletedPayments: paymentsToUpdate.filter(p => p.isDeleted).length,
        payments: paymentsToUpdate.map(p => ({
          paymentId: p.paymentId,
          loanId: p.loanId,
          amount: p.amount,
          comission: p.comission,
          method: p.paymentMethod,
          isDeleted: p.isDeleted,
        })),
      })

      const result = await updateLeadPaymentReceived({
        variables: {
          id: leadPaymentReceivedId,
          input: {
            paidAmount: newTotalPaid.toString(),
            cashPaidAmount: newCashPaid.toString(),
            bankPaidAmount: newBankPaid.toString(),
            payments: paymentsToUpdate,
          },
        },
      })

      // Si se eliminaron todos los pagos, el resultado es null
      const allDeleted = result.data?.updateLeadPaymentReceived === null

      toast({
        title: allDeleted ? 'Pagos eliminados' : 'Cambios guardados',
        description: allDeleted
          ? `Se eliminaron ${deletedCount} pago(s) del día.`
          : `Se actualizaron ${editedCount} pago(s)${deletedCount > 0 ? ` y eliminaron ${deletedCount}` : ''}.`,
      })

      clearEditedPayments()
      setShowDistributionModal(false)

      await refetchAll()
    } catch (error) {
      console.error('Error al guardar cambios:', error)
      toast({
        title: 'Error',
        description: 'No se pudieron guardar los cambios. Intenta de nuevo.',
        variant: 'destructive',
      })
    } finally {
      setIsSavingEdits(false)
    }
  }

  const handleOpenMultaModal = () => {
    setMultaAmount('')
    if (cashAccounts.length > 0) {
      setSelectedAccountId(cashAccounts[0].id)
    }
    setShowMultaModal(true)
  }

  const handleCreateMulta = async () => {
    if (!multaAmount || parseFloat(multaAmount) <= 0) {
      toast({
        title: 'Error',
        description: 'Ingresa un monto válido para la multa.',
        variant: 'destructive',
      })
      return
    }

    if (!selectedAccountId) {
      toast({
        title: 'Error',
        description: 'Selecciona una cuenta de destino.',
        variant: 'destructive',
      })
      return
    }

    setIsCreatingMulta(true)

    try {
      await createTransaction({
        variables: {
          input: {
            amount: multaAmount,
            date: selectedDate.toISOString(),
            type: 'INCOME',
            incomeSource: 'MULTA',
            sourceAccountId: selectedAccountId,
            routeId: selectedRouteId,
            leadId: selectedLeadId,
          },
        },
      })

      toast({
        title: 'Multa registrada',
        description: `Se registró una multa de $${multaAmount}.`,
      })

      setShowMultaModal(false)
      setMultaAmount('')
    } catch (error) {
      console.error('Error al crear multa:', error)
      toast({
        title: 'Error',
        description: 'No se pudo registrar la multa. Intenta de nuevo.',
        variant: 'destructive',
      })
    } finally {
      setIsCreatingMulta(false)
    }
  }

  // Early returns
  if (!selectedRouteId || !selectedLeadId) {
    return <EmptyState />
  }

  if (loansLoading) {
    return <LoadingState />
  }

  return (
    <div className="space-y-4">
      {/* Loans Table */}
      <Card className="relative">
        <div className="sticky top-16 z-20 bg-card rounded-t-lg shadow-sm">
          <CardHeader className="pb-3 border-b">
            {/* Row 1: Title + KPIs */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex-shrink-0">
                <CardTitle>Préstamos Activos</CardTitle>
                <CardDescription>
                  {filteredLoans.length} préstamos • {format(selectedDate, "d 'de' MMMM", { locale: es })}
                </CardDescription>
              </div>
              <KPIBadges
                filteredLoansCount={filteredLoans.length}
                registeredCount={registeredCount}
                totals={totals}
                combinedTotals={combinedTotals}
                incompleteCount={incompleteCount}
                showOnlyIncomplete={showOnlyIncomplete}
                onToggleIncomplete={() => setShowOnlyIncomplete(!showOnlyIncomplete)}
                leadPaymentDistribution={leadPaymentData?.leadPaymentReceivedByLeadAndDate}
                onEditDistribution={handleEditDistribution}
              />
            </div>

            {/* Row 2: Search + Actions */}
            <ActionBar
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              globalCommission={globalCommission}
              onGlobalCommissionChange={setGlobalCommission}
              onApplyGlobalCommission={() => handleApplyGlobalCommission(globalCommission)}
              onSetAllWeekly={() => handleSetAllWeekly(filteredLoans)}
              onSetAllNoPayment={() => handleSetAllNoPayment(filteredLoans, registeredPaymentsMap)}
              onClearAll={handleClearAll}
              onAddPayment={handleAddPayment}
              onOpenMultaModal={handleOpenMultaModal}
              onOpenFalcosDrawer={() => setShowFalcosDrawer(true)}
              falcosPendientesCount={falcosPendientes.length}
              onSaveAll={handleSaveAll}
              onSaveEditedPayments={handleSaveEditedPayments}
              filteredLoansCount={filteredLoans.length}
              totalsCount={totals.count}
              totalsNoPayment={totals.noPayment}
              userAddedPaymentsCount={userAddedPayments.length}
              isSubmitting={isSubmitting}
              isSavingEdits={isSavingEdits}
              hasEditedPayments={hasEditedPayments}
              editedCount={editedCount}
              deletedCount={deletedCount}
            />
          </CardHeader>
        </div>

        <CardContent>
          {filteredLoans.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <DollarSign className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                No hay préstamos activos para esta localidad
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]">
                    <Ban className="h-4 w-4 text-muted-foreground" />
                  </TableHead>
                  <TableHead className="w-[40px]">#</TableHead>
                  <TableHead className="w-[200px]">Cliente</TableHead>
                  <TableHead>Aval</TableHead>
                  <TableHead className="text-right">Fecha Crédito</TableHead>
                  <TableHead className="text-right">Pago Semanal</TableHead>
                  <TableHead className="w-[100px]">Abono</TableHead>
                  <TableHead className="w-[80px]">Comisión</TableHead>
                  <TableHead className="w-[120px]">Método</TableHead>
                  <TableHead className="w-[80px]">Estado</TableHead>
                  {isAdmin && (
                    <>
                      <TableHead className="text-right bg-muted/50 w-[90px]">Ganancia</TableHead>
                      <TableHead className="text-right bg-muted/50 w-[90px]">Capital</TableHead>
                    </>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* User-added payment rows */}
                {userAddedPayments.map((userPayment) => (
                  <UserAddedPaymentRow
                    key={userPayment.tempId}
                    payment={userPayment}
                    availableLoans={getAvailableLoansForRow(userPayment.tempId)}
                    selectedLoan={loans.find((l) => l.id === userPayment.loanId)}
                    isAdmin={isAdmin}
                    onLoanChange={(loanId) => handleUserAddedPaymentChange(userPayment.tempId, 'loanId', loanId)}
                    onAmountChange={(amount) => handleUserAddedPaymentChange(userPayment.tempId, 'amount', amount)}
                    onCommissionChange={(commission) => handleUserAddedPaymentChange(userPayment.tempId, 'commission', commission)}
                    onPaymentMethodChange={(method) => handleUserAddedPaymentChange(userPayment.tempId, 'paymentMethod', method)}
                    onRemove={() => handleRemoveUserAddedPayment(userPayment.tempId)}
                  />
                ))}

                {/* Pending loan rows (not yet registered) */}
                {pendingLoans.map((loan, index) => {
                  const globalIndex = filteredLoans.findIndex((l) => l.id === loan.id)
                  const loanPayments = registeredPaymentsMap.get(loan.id) || []
                  const firstPayment = loanPayments[0]
                  return (
                    <LoanPaymentRow
                      key={loan.id}
                      loan={loan}
                      index={globalIndex}
                      displayIndex={index + 1}
                      payment={payments[loan.id]}
                      registeredPayment={firstPayment}
                      editedPayment={firstPayment ? editedPayments[firstPayment.id] : undefined}
                      leadPaymentReceivedId={leadPaymentReceivedId}
                      isAdmin={isAdmin}
                      onPaymentChange={(amount) => handlePaymentChange(loan.id, amount)}
                      onCommissionChange={(commission) => handleCommissionChange(loan.id, commission)}
                      onPaymentMethodChange={(method) => handlePaymentMethodChange(loan.id, method)}
                      onToggleNoPayment={(shiftKey) => handleToggleNoPaymentWithShift(loan.id, globalIndex, shiftKey, filteredLoans)}
                      onStartEdit={() => handleStartEditPayment(loan.id, firstPayment!)}
                      onEditChange={(field, value) => handleEditPaymentChange(firstPayment!.id, field, value)}
                      onToggleDelete={() => handleToggleDeletePayment(firstPayment!.id)}
                      onCancelEdit={() => handleCancelEditPayment(firstPayment!.id)}
                    />
                  )
                })}

                {/* Section header for captured payments */}
                {capturedLoans.length > 0 && (
                  <RegisteredSectionHeader
                    registeredCount={capturedLoans.length}
                    isAdmin={isAdmin}
                  />
                )}

                {/* Captured loan rows (already registered or marked as falta) */}
                {capturedLoans.map((loan, index) => {
                  const globalIndex = filteredLoans.findIndex((l) => l.id === loan.id)
                  const loanPayments = registeredPaymentsMap.get(loan.id) || []
                  const firstPayment = loanPayments[0]
                  const additionalPayments = loanPayments.slice(1)

                  return (
                    <React.Fragment key={loan.id}>
                      {/* Main row with first payment */}
                      <LoanPaymentRow
                        loan={loan}
                        index={globalIndex}
                        displayIndex={pendingLoans.length + index + 1}
                        payment={payments[loan.id]}
                        registeredPayment={firstPayment}
                        editedPayment={firstPayment ? editedPayments[firstPayment.id] : undefined}
                        leadPaymentReceivedId={leadPaymentReceivedId}
                        isAdmin={isAdmin}
                        onPaymentChange={(amount) => handlePaymentChange(loan.id, amount)}
                        onCommissionChange={(commission) => handleCommissionChange(loan.id, commission)}
                        onPaymentMethodChange={(method) => handlePaymentMethodChange(loan.id, method)}
                        onToggleNoPayment={(shiftKey) => handleToggleNoPaymentWithShift(loan.id, globalIndex, shiftKey, filteredLoans)}
                        onStartEdit={() => handleStartEditPayment(loan.id, firstPayment!)}
                        onEditChange={(field, value) => handleEditPaymentChange(firstPayment!.id, field, value)}
                        onToggleDelete={() => handleToggleDeletePayment(firstPayment!.id)}
                        onCancelEdit={() => handleCancelEditPayment(firstPayment!.id)}
                      />
                      {/* Additional payment rows for the same loan */}
                      {additionalPayments.map((payment, paymentIndex) => (
                        <LoanPaymentRow
                          key={`${loan.id}-payment-${paymentIndex + 1}`}
                          loan={loan}
                          index={globalIndex}
                          displayIndex={pendingLoans.length + index + 1}
                          payment={undefined}
                          registeredPayment={payment}
                          editedPayment={editedPayments[payment.id]}
                          leadPaymentReceivedId={leadPaymentReceivedId}
                          isAdmin={isAdmin}
                          isAdditionalPayment={true}
                          onPaymentChange={() => {}}
                          onCommissionChange={() => {}}
                          onPaymentMethodChange={() => {}}
                          onToggleNoPayment={() => {}}
                          onStartEdit={() => handleStartEditPayment(loan.id, payment)}
                          onEditChange={(field, value) => handleEditPaymentChange(payment.id, field, value)}
                          onToggleDelete={() => handleToggleDeletePayment(payment.id)}
                          onCancelEdit={() => handleCancelEditPayment(payment.id)}
                        />
                      ))}
                    </React.Fragment>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      <DistributionModal
        open={showDistributionModal}
        onOpenChange={(open) => {
          setShowDistributionModal(open)
          if (!open) {
            setIsEditingDistributionOnly(false)
            setEditDistributionData(null)
          }
        }}
        isSubmitting={isSubmitting}
        isSavingEdits={isSavingEdits}
        savingProgress={savingProgress}
        modalTotals={isEditingDistributionOnly && editDistributionData ? {
          // When editing distribution only:
          // - cash: the ORIGINAL cash received (before any was transferred to bank)
          // - bank: only MONEY_TRANSFER payments (what clients paid by transfer - not editable)
          // - total: total of all payments
          total: parseFloat(leadPaymentData?.leadPaymentReceivedByLeadAndDate?.paidAmount || '0'),
          cash: editDistributionData.originalCash,
          bank: editDistributionData.moneyTransferSum,
          commission: 0,
          count: 0,
          noPayment: 0,
          deleted: 0,
        } : modalTotals}
        bankTransferAmount={bankTransferAmount}
        onBankTransferAmountChange={setBankTransferAmount}
        hasEditedPayments={hasEditedPayments || isEditingDistributionOnly}
        onConfirm={
          isEditingDistributionOnly
            ? handleConfirmDistributionOnly
            : (hasEditedPayments ? handleConfirmSaveEdits : handleConfirmSave)
        }
        falcoEnabled={falcoEnabled}
        falcoAmount={falcoAmount}
        onFalcoEnabledChange={setFalcoEnabled}
        onFalcoAmountChange={setFalcoAmount}
        isEditingDistributionOnly={isEditingDistributionOnly}
      />

      <SuccessDialog
        open={showSuccessDialog}
        onOpenChange={setShowSuccessDialog}
        savedCount={savedCount}
      />

      <MultaModal
        open={showMultaModal}
        onOpenChange={setShowMultaModal}
        multaAmount={multaAmount}
        onMultaAmountChange={setMultaAmount}
        selectedAccountId={selectedAccountId}
        onSelectedAccountIdChange={setSelectedAccountId}
        cashAccounts={cashAccounts}
        selectedDate={selectedDate}
        isCreating={isCreatingMulta}
        onConfirm={handleCreateMulta}
      />

      <FalcosPendientesDrawer
        open={showFalcosDrawer}
        onOpenChange={setShowFalcosDrawer}
        falcosPendientes={falcosPendientes}
        isLoading={falcosLoading}
        onCompensationCreated={() => refetchFalcos()}
      />
    </div>
  )
}
