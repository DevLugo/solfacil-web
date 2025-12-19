'use client'

import { useState, useMemo } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { DollarSign, Ban } from 'lucide-react'
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

  // Multa modal state
  const [showMultaModal, setShowMultaModal] = useState(false)
  const [multaAmount, setMultaAmount] = useState('')
  const [selectedAccountId, setSelectedAccountId] = useState<string>('')
  const [isCreatingMulta, setIsCreatingMulta] = useState(false)

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
    globalCommission,
  })

  // Totals calculation
  const { totals, registeredTotals, combinedTotals, modalTotals } = useTotals({
    payments,
    editedPayments,
    userAddedPayments,
    registeredPaymentsMap,
  })

  // Filter loans
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

    return filtered
  }, [loans, searchTerm, showOnlyIncomplete])

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
    setShowDistributionModal(true)
  }

  const handleConfirmSave = async () => {
    const validPayments = Object.values(payments).filter(
      (p) => !p.isNoPayment && p.amount && parseFloat(p.amount) > 0
    )

    const validUserAddedPayments = userAddedPayments.filter(
      (p) => p.loanId && p.amount && parseFloat(p.amount) > 0
    )

    const allPaymentsToSave = [
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

    if (allPaymentsToSave.length === 0) {
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
      const cashValue = totals.cash - bankTransferValue

      await createLeadPaymentReceived({
        variables: {
          input: {
            leadId: selectedLeadId,
            agentId: selectedLeadId,
            expectedAmount: totals.total.toString(),
            paidAmount: totals.total.toString(),
            cashPaidAmount: cashValue.toString(),
            bankPaidAmount: (totals.bank + bankTransferValue).toString(),
            falcoAmount: '0',
            paymentDate: selectedDate.toISOString(),
            payments: allPaymentsToSave,
          },
        },
      })

      setSavingProgress({ current: 1, total: 1 })
      setSavedCount(allPaymentsToSave.length)
      setShowDistributionModal(false)
      setShowSuccessDialog(true)
      resetPayments()
      clearUserAddedPayments()
      setLastSelectedIndex(null)

      await refetchAll()

      toast({
        title: 'Abonos guardados',
        description: `Se guardaron ${allPaymentsToSave.length} abono(s) correctamente.`,
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

      await updateLeadPaymentReceived({
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

      toast({
        title: 'Cambios guardados',
        description: `Se actualizaron ${editedCount} pago(s)${deletedCount > 0 ? ` y eliminaron ${deletedCount}` : ''}.`,
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
              onClearAll={handleClearAll}
              onAddPayment={handleAddPayment}
              onOpenMultaModal={handleOpenMultaModal}
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

                {/* Loan rows */}
                {filteredLoans.map((loan, index) => (
                  <LoanPaymentRow
                    key={loan.id}
                    loan={loan}
                    index={index}
                    payment={payments[loan.id]}
                    registeredPayment={registeredPaymentsMap.get(loan.id)}
                    editedPayment={editedPayments[loan.id]}
                    leadPaymentReceivedId={leadPaymentReceivedId}
                    isAdmin={isAdmin}
                    onPaymentChange={(amount) => handlePaymentChange(loan.id, amount)}
                    onCommissionChange={(commission) => handleCommissionChange(loan.id, commission)}
                    onPaymentMethodChange={(method) => handlePaymentMethodChange(loan.id, method)}
                    onToggleNoPayment={(shiftKey) => handleToggleNoPaymentWithShift(loan.id, index, shiftKey, filteredLoans)}
                    onStartEdit={() => handleStartEditPayment(loan.id, registeredPaymentsMap.get(loan.id)!)}
                    onEditChange={(field, value) => handleEditPaymentChange(loan.id, field, value)}
                    onToggleDelete={() => handleToggleDeletePayment(loan.id)}
                    onCancelEdit={() => handleCancelEditPayment(loan.id)}
                  />
                ))}
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
    </div>
  )
}
