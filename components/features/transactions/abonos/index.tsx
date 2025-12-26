'use client'

import { useState, useMemo } from 'react'
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

    // If day is captured, no need to sort - all are captured
    // Otherwise, sort: pending loans first, registered loans last
    const isDayCaptured = !!leadPaymentReceivedId
    if (isDayCaptured) {
      return filtered // All are captured, keep original order
    }

    return filtered.sort((a, b) => {
      const aIsRegistered = registeredPaymentsMap.has(a.id)
      const bIsRegistered = registeredPaymentsMap.has(b.id)
      if (aIsRegistered === bIsRegistered) return 0
      return aIsRegistered ? 1 : -1
    })
  }, [loans, searchTerm, showOnlyIncomplete, registeredPaymentsMap, leadPaymentReceivedId])

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

  const registeredCount = registeredPaymentsMap.size
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
        const existingPayments = Array.from(registeredPaymentsMap.entries()).map(
          ([loanId, payment]) => ({
            paymentId: payment.id,
            loanId,
            amount: payment.amount,
            comission: payment.comission || '0',
            paymentMethod: payment.paymentMethod,
            isDeleted: false,
          })
        )

        // New payments don't have a paymentId
        const newPaymentsForUpdate = newPaymentsToSave.map((p) => ({
          loanId: p.loanId,
          amount: p.amount,
          comission: p.comission,
          paymentMethod: p.paymentMethod,
        }))

        // Calculate combined totals
        const existingTotal = Array.from(registeredPaymentsMap.values()).reduce(
          (sum, p) => sum + parseFloat(p.amount || '0'),
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
      resetPayments()
      clearUserAddedPayments()
      setLastSelectedIndex(null)

      await refetchAll()

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
    setBankTransferAmount('0')
    setFalcoEnabled(false)
    setFalcoAmount('0')
    setShowDistributionModal(true)
  }

  const handleConfirmSaveEdits = async () => {
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
      const paymentsToUpdate: {
        paymentId?: string
        loanId: string
        amount: string
        comission?: string
        paymentMethod: 'CASH' | 'MONEY_TRANSFER'
        isDeleted?: boolean
      }[] = []

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

      registeredPaymentsMap.forEach((payment, loanId) => {
        if (!editedPayments[loanId]) {
          paymentsToUpdate.push({
            paymentId: payment.id,
            loanId,
            amount: payment.amount,
            comission: payment.comission,
            paymentMethod: payment.paymentMethod,
            isDeleted: false,
          })
        }
      })

      const bankTransferValue = parseFloat(bankTransferAmount || '0')
      let cashTotal = 0
      let bankTotal = 0

      paymentsToUpdate.forEach((p) => {
        if (p.isDeleted) return
        const amount = parseFloat(p.amount || '0')
        if (p.paymentMethod === 'CASH') {
          cashTotal += amount
        } else {
          bankTotal += amount
        }
      })

      const cashValue = cashTotal - bankTransferValue
      const totalPaid = cashTotal + bankTotal

      console.log('[AbonosTab] Sending updateLeadPaymentReceived with:', {
        id: leadPaymentReceivedId,
        totalPaid: totalPaid.toString(),
        cashPaidAmount: cashValue.toString(),
        bankPaidAmount: (bankTotal + bankTransferValue).toString(),
        bankTransferValue,
        totalPayments: paymentsToUpdate.length,
        deletedPayments: paymentsToUpdate.filter(p => p.isDeleted).length,
        updatedPayments: paymentsToUpdate.filter(p => !p.isDeleted).length,
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
            paidAmount: totalPaid.toString(),
            cashPaidAmount: cashValue.toString(),
            bankPaidAmount: (bankTotal + bankTransferValue).toString(),
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
                  return (
                    <LoanPaymentRow
                      key={loan.id}
                      loan={loan}
                      index={globalIndex}
                      displayIndex={index + 1}
                      payment={payments[loan.id]}
                      registeredPayment={registeredPaymentsMap.get(loan.id)}
                      editedPayment={editedPayments[loan.id]}
                      leadPaymentReceivedId={leadPaymentReceivedId}
                      isAdmin={isAdmin}
                      onPaymentChange={(amount) => handlePaymentChange(loan.id, amount)}
                      onCommissionChange={(commission) => handleCommissionChange(loan.id, commission)}
                      onPaymentMethodChange={(method) => handlePaymentMethodChange(loan.id, method)}
                      onToggleNoPayment={(shiftKey) => handleToggleNoPaymentWithShift(loan.id, globalIndex, shiftKey, filteredLoans)}
                      onStartEdit={() => handleStartEditPayment(loan.id, registeredPaymentsMap.get(loan.id)!)}
                      onEditChange={(field, value) => handleEditPaymentChange(loan.id, field, value)}
                      onToggleDelete={() => handleToggleDeletePayment(loan.id)}
                      onCancelEdit={() => handleCancelEditPayment(loan.id)}
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
                  return (
                    <LoanPaymentRow
                      key={loan.id}
                      loan={loan}
                      index={globalIndex}
                      displayIndex={pendingLoans.length + index + 1}
                      payment={payments[loan.id]}
                      registeredPayment={registeredPaymentsMap.get(loan.id)}
                      editedPayment={editedPayments[loan.id]}
                      leadPaymentReceivedId={leadPaymentReceivedId}
                      isAdmin={isAdmin}
                      onPaymentChange={(amount) => handlePaymentChange(loan.id, amount)}
                      onCommissionChange={(commission) => handleCommissionChange(loan.id, commission)}
                      onPaymentMethodChange={(method) => handlePaymentMethodChange(loan.id, method)}
                      onToggleNoPayment={(shiftKey) => handleToggleNoPaymentWithShift(loan.id, globalIndex, shiftKey, filteredLoans)}
                      onStartEdit={() => handleStartEditPayment(loan.id, registeredPaymentsMap.get(loan.id)!)}
                      onEditChange={(field, value) => handleEditPaymentChange(loan.id, field, value)}
                      onToggleDelete={() => handleToggleDeletePayment(loan.id)}
                      onCancelEdit={() => handleCancelEditPayment(loan.id)}
                    />
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
        onOpenChange={setShowDistributionModal}
        isSubmitting={isSubmitting}
        isSavingEdits={isSavingEdits}
        savingProgress={savingProgress}
        modalTotals={modalTotals}
        bankTransferAmount={bankTransferAmount}
        onBankTransferAmountChange={setBankTransferAmount}
        hasEditedPayments={hasEditedPayments}
        onConfirm={hasEditedPayments ? handleConfirmSaveEdits : handleConfirmSave}
        falcoEnabled={falcoEnabled}
        falcoAmount={falcoAmount}
        onFalcoEnabledChange={setFalcoEnabled}
        onFalcoAmountChange={setFalcoAmount}
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
