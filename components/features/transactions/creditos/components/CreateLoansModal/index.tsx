'use client'

import { useState, useMemo, useEffect } from 'react'
import { useMutation } from '@apollo/client'
import { Plus, Save, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency } from '@/lib/utils'
import { UnifiedClientAutocomplete } from '../UnifiedClientAutocomplete'
import { LocationWarning } from '../LocationWarning'
import { usePendingLoans } from '../../hooks/usePendingLoans'
import { CREATE_LOANS_IN_BATCH } from '@/graphql/mutations/transactions'

import { PendingLoanCard } from './PendingLoanCard'
import { AccountBalanceInfo } from './AccountBalanceInfo'
import { LoanCalculationSummary } from './LoanCalculationSummary'
import { GlobalCommissionControl } from './GlobalCommissionControl'
import { FirstPaymentControl } from './FirstPaymentControl'
import { RenewalSummaryInline } from './RenewalSummaryInline'
import { LoanTypeAmountFields } from './LoanTypeAmountFields'
import type { CreateLoansModalProps, PendingLoan, UnifiedClientValue } from './types'

export function CreateLoansModal({
  open,
  onOpenChange,
  loanTypes,
  accounts,
  loansForRenewal,
  leadId,
  grantorId,
  locationId,
  selectedDate,
  onSuccess,
}: CreateLoansModalProps) {
  const { toast } = useToast()
  const {
    pendingLoans,
    addPendingLoan,
    removePendingLoan,
    updatePendingLoan,
    clearPendingLoans,
    totals,
    generateTempId,
  } = usePendingLoans()

  // Use the default cash account for the route (OFFICE_CASH_FUND)
  const defaultAccount = useMemo(() => {
    return accounts.find((a) => a.type === 'OFFICE_CASH_FUND') || accounts[0]
  }, [accounts])

  // Form state for adding a new loan
  const [editingLoanId, setEditingLoanId] = useState<string | null>(null)
  const [selectedLoanTypeId, setSelectedLoanTypeId] = useState<string>('')
  const [requestedAmount, setRequestedAmount] = useState<string>('')
  const [comissionAmount, setComissionAmount] = useState<string>('')
  const [selectedBorrower, setSelectedBorrower] = useState<UnifiedClientValue | null>(null)
  const [selectedAval, setSelectedAval] = useState<UnifiedClientValue | null>(null)
  const [includeFirstPayment, setIncludeFirstPayment] = useState(false)
  const [firstPaymentAmount, setFirstPaymentAmount] = useState<string>('')
  const [globalComissionAmount, setGlobalComissionAmount] = useState<string>('')

  // Get active loan from selected borrower (if any)
  const selectedActiveLoan = selectedBorrower?.activeLoan

  const [createLoansInBatch, { loading: saving }] = useMutation(CREATE_LOANS_IN_BATCH)

  // Get selected loan type details
  const selectedLoanType = useMemo(
    () => loanTypes.find((lt) => lt.id === selectedLoanTypeId),
    [loanTypes, selectedLoanTypeId]
  )

  // Calculate the pending amount from active loan (deuda pendiente)
  const renewalPendingAmount = useMemo(() => {
    if (!selectedActiveLoan) return 0
    return parseFloat(selectedActiveLoan.pendingAmountStored) || 0
  }, [selectedActiveLoan])

  // Check if this is a renewal (client has active loan)
  const isRenewal = !!selectedActiveLoan

  // Calculate "Monto Otorgado" (amount actually given to client)
  const calculatedAmountGived = useMemo(() => {
    const requested = parseFloat(requestedAmount) || 0
    if (isRenewal && renewalPendingAmount > 0) {
      return Math.max(0, requested - renewalPendingAmount)
    }
    return requested
  }, [requestedAmount, isRenewal, renewalPendingAmount])

  // Calculate weekly payment based on the total debt
  const calculatedWeeklyPayment = useMemo(() => {
    if (!selectedLoanType || !requestedAmount) return 0
    const amount = parseFloat(requestedAmount) || 0
    const rate = parseFloat(selectedLoanType.rate) || 0
    const totalDebt = amount * (1 + rate)
    return totalDebt / selectedLoanType.weekDuration
  }, [selectedLoanType, requestedAmount])

  // Check if borrower is from different location
  const isBorrowerFromDifferentLocation = selectedBorrower && selectedBorrower.isFromCurrentLocation === false

  // Check if aval is from different location
  const isAvalFromDifferentLocation = selectedAval && selectedAval.isFromCurrentLocation === false

  // Auto-calculate comission when loan type changes
  useEffect(() => {
    if (selectedLoanType && !editingLoanId) {
      setComissionAmount(selectedLoanType.loanGrantedComission || '0')
    }
  }, [selectedLoanType, editingLoanId])

  // Account balance and validation
  const accountBalance = parseFloat(defaultAccount?.amount || '0')
  const hasInsufficientFunds = accountBalance < totals.totalAmount

  // Reset form
  const resetForm = () => {
    setEditingLoanId(null)
    setSelectedLoanTypeId('')
    setRequestedAmount('')
    setComissionAmount('')
    setSelectedBorrower(null)
    setSelectedAval(null)
    setIncludeFirstPayment(false)
    setFirstPaymentAmount('')
  }

  // Load loan data into form for editing
  const handleEditLoan = (loan: PendingLoan) => {
    setEditingLoanId(loan.tempId)
    setSelectedLoanTypeId(loan.loantypeId)
    setRequestedAmount(loan.requestedAmount)
    setComissionAmount(loan.comissionAmount)

    // Reconstruct borrower from loan data
    if (loan.borrowerId) {
      setSelectedBorrower({
        id: loan.borrowerId,
        personalDataId: loan.borrowerPersonalDataId,
        phoneId: loan.borrowerPhoneId,
        fullName: loan.borrowerName,
        phone: loan.borrowerPhone,
        isFromCurrentLocation: !loan.isFromDifferentLocation,
        clientState: 'existing',
        action: 'connect',
      })
    } else if (loan.newBorrower) {
      setSelectedBorrower({
        fullName: loan.newBorrower.personalData.fullName,
        phone: loan.newBorrower.personalData.phones?.[0]?.number,
        isFromCurrentLocation: !loan.isFromDifferentLocation,
        clientState: 'new',
        action: 'create',
      })
    }

    // Reconstruct aval from loan data
    if (loan.collateralIds && loan.collateralIds.length > 0) {
      setSelectedAval({
        id: loan.collateralIds[0],
        personalDataId: loan.collateralPersonalDataId,
        phoneId: loan.collateralPhoneId,
        fullName: loan.collateralName || '',
        phone: loan.collateralPhone,
        isFromCurrentLocation: true,
        clientState: 'existing',
        action: 'connect',
      })
    } else if (loan.newCollateral) {
      setSelectedAval({
        fullName: loan.newCollateral.fullName,
        phone: loan.newCollateral.phones?.[0]?.number,
        isFromCurrentLocation: true,
        clientState: 'new',
        action: 'create',
      })
    } else {
      setSelectedAval(null)
    }

    // Set first payment if exists
    if (loan.firstPayment) {
      setIncludeFirstPayment(true)
      setFirstPaymentAmount(loan.firstPayment.amount)
    } else {
      setIncludeFirstPayment(false)
      setFirstPaymentAmount('')
    }
  }

  // Handle selecting a borrower - auto-fill if they have an active loan
  const handleBorrowerChange = (borrower: UnifiedClientValue | null) => {
    if (editingLoanId) {
      setEditingLoanId(null)
    }

    setSelectedBorrower(borrower)

    if (borrower?.activeLoan) {
      const activeLoan = borrower.activeLoan
      if (activeLoan.loantype?.id) {
        setSelectedLoanTypeId(activeLoan.loantype.id)
        const loantype = loanTypes.find(lt => lt.id === activeLoan.loantype?.id)
        if (loantype) {
          setComissionAmount(loantype.loanGrantedComission || '0')
        }
      }
      setRequestedAmount(activeLoan.requestedAmount)
      if (activeLoan.collaterals && activeLoan.collaterals.length > 0) {
        const collateral = activeLoan.collaterals[0]
        setSelectedAval({
          id: collateral.id,
          personalDataId: collateral.id,
          phoneId: collateral.phones?.[0]?.id,
          fullName: collateral.fullName,
          phone: collateral.phones?.[0]?.number,
          isFromCurrentLocation: true,
          clientState: 'existing',
          action: 'connect',
        })
      }
    } else {
      setSelectedLoanTypeId('')
      setRequestedAmount('')
      setComissionAmount('')
      setSelectedAval(null)
    }
  }

  // Add or update loan in pending list
  const handleAddLoan = () => {
    if (!selectedLoanTypeId || !requestedAmount) {
      toast({
        title: 'Error',
        description: 'Selecciona un tipo de préstamo y monto',
        variant: 'destructive',
      })
      return
    }

    if (!selectedBorrower) {
      toast({
        title: 'Error',
        description: 'Selecciona un cliente',
        variant: 'destructive',
      })
      return
    }

    // Determine borrower info
    let borrowerId: string | undefined
    let borrowerPersonalDataId: string | undefined
    let borrowerPhoneId: string | undefined
    let borrowerName: string
    let borrowerPhone: string | undefined
    let newBorrower: PendingLoan['newBorrower']

    if (selectedBorrower.action === 'create') {
      borrowerName = selectedBorrower.fullName
      borrowerPhone = selectedBorrower.phone
      newBorrower = {
        personalData: {
          fullName: selectedBorrower.fullName,
          phones: selectedBorrower.phone ? [{ number: selectedBorrower.phone }] : undefined,
          addresses: locationId ? [{ street: '', locationId }] : undefined,
        },
      }
    } else {
      borrowerId = selectedBorrower.id
      borrowerPersonalDataId = selectedBorrower.personalDataId
      borrowerPhoneId = selectedBorrower.phoneId
      borrowerName = selectedBorrower.fullName
      borrowerPhone = selectedBorrower.phone
    }

    // Determine collateral/aval info
    let collateralIds: string[] = []
    let collateralPersonalDataId: string | undefined
    let collateralPhoneId: string | undefined
    let collateralName: string | undefined
    let collateralPhone: string | undefined
    let newCollateral: PendingLoan['newCollateral']

    if (selectedAval) {
      if (selectedAval.action === 'create') {
        collateralName = selectedAval.fullName
        collateralPhone = selectedAval.phone
        newCollateral = {
          fullName: selectedAval.fullName,
          phones: selectedAval.phone ? [{ number: selectedAval.phone }] : undefined,
          addresses: locationId ? [{ street: '', locationId }] : undefined,
        }
      } else if (selectedAval.id) {
        collateralIds = [selectedAval.id]
        collateralPersonalDataId = selectedAval.personalDataId
        collateralPhoneId = selectedAval.phoneId
        collateralName = selectedAval.fullName
        collateralPhone = selectedAval.phone
      }
    }

    const pendingLoanData: PendingLoan = {
      tempId: editingLoanId || generateTempId(),
      requestedAmount,
      amountGived: calculatedAmountGived.toString(),
      loantypeId: selectedLoanTypeId,
      loantypeName: selectedLoanType?.name || '',
      weekDuration: selectedLoanType?.weekDuration || 0,
      comissionAmount: comissionAmount || '0',
      previousLoanId: selectedActiveLoan?.id,
      borrowerId,
      borrowerPersonalDataId,
      borrowerPhoneId,
      borrowerName,
      borrowerPhone,
      newBorrower,
      collateralIds,
      collateralPersonalDataId,
      collateralPhoneId,
      collateralName,
      collateralPhone,
      newCollateral,
      firstPayment: includeFirstPayment && firstPaymentAmount
        ? { amount: firstPaymentAmount, paymentMethod: 'CASH' }
        : undefined,
      isFromDifferentLocation: selectedBorrower?.isFromCurrentLocation === false,
      isRenewal,
    }

    if (editingLoanId) {
      updatePendingLoan(editingLoanId, pendingLoanData)
      toast({
        title: 'Crédito actualizado',
        description: `${pendingLoanData.borrowerName} - ${formatCurrency(calculatedAmountGived)} a entregar`,
      })
    } else {
      addPendingLoan(pendingLoanData)
      toast({
        title: 'Crédito agregado',
        description: `${pendingLoanData.borrowerName} - ${formatCurrency(calculatedAmountGived)} a entregar`,
      })
    }

    resetForm()
  }

  // Apply global commission
  const handleApplyGlobalCommission = () => {
    if (globalComissionAmount) {
      pendingLoans.forEach((loan) => {
        if (parseFloat(loan.comissionAmount) > 0) {
          updatePendingLoan(loan.tempId, {
            ...loan,
            comissionAmount: globalComissionAmount,
          })
        }
      })
      toast({
        title: 'Comisión actualizada',
        description: 'Se aplicó la comisión a todos los créditos con comisión',
      })
    }
  }

  // Handle remove loan
  const handleRemoveLoan = (tempId: string) => {
    removePendingLoan(tempId)
    if (editingLoanId === tempId) {
      resetForm()
    }
  }

  // Save all pending loans
  const handleSaveAll = async () => {
    if (pendingLoans.length === 0) {
      toast({
        title: 'Error',
        description: 'Agrega al menos un crédito',
        variant: 'destructive',
      })
      return
    }

    if (!defaultAccount) {
      toast({
        title: 'Error',
        description: 'No hay cuenta de efectivo disponible para esta ruta',
        variant: 'destructive',
      })
      return
    }

    try {
      await createLoansInBatch({
        variables: {
          input: {
            loans: pendingLoans.map((loan) => ({
              tempId: loan.tempId,
              requestedAmount: loan.requestedAmount,
              amountGived: loan.amountGived,
              loantypeId: loan.loantypeId,
              comissionAmount: loan.comissionAmount,
              previousLoanId: loan.previousLoanId,
              borrowerId: loan.borrowerId,
              newBorrower: loan.newBorrower,
              collateralIds: loan.collateralIds.length > 0 ? loan.collateralIds : undefined,
              newCollateral: loan.newCollateral,
              firstPayment: loan.firstPayment,
              isFromDifferentLocation: loan.isFromDifferentLocation,
            })),
            sourceAccountId: defaultAccount.id,
            signDate: selectedDate.toISOString(),
            leadId,
            grantorId,
          },
        },
      })

      toast({
        title: 'Créditos guardados',
        description: `Se guardaron ${pendingLoans.length} créditos correctamente`,
      })

      clearPendingLoans()
      onSuccess()
      onOpenChange(false)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'No se pudieron guardar los créditos'
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-4 md:p-6">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-lg md:text-xl">Registrar Créditos</DialogTitle>
          <DialogDescription className="text-sm md:text-base">
            Agrega los créditos a otorgar y guárdalos todos de una vez
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {/* Left side: Form to add loans */}
          <div className="space-y-4 md:space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-base md:text-lg">
                {editingLoanId ? 'Editar crédito' : 'Agregar crédito'}
              </h3>
              {editingLoanId && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetForm}
                  className="h-8 text-xs"
                >
                  Cancelar edición
                </Button>
              )}
            </div>

            {/* Client selector */}
            <div className="space-y-2">
              <Label>Cliente</Label>
              <UnifiedClientAutocomplete
                mode="borrower"
                value={selectedBorrower}
                onValueChange={handleBorrowerChange}
                leadId={leadId}
                locationId={locationId}
                activeLoansForRenewal={loansForRenewal}
                placeholder="Buscar cliente o renovar préstamo..."
                allowCreate
                allowEdit
              />
              {isBorrowerFromDifferentLocation && (
                <LocationWarning
                  type="borrower"
                  locationName={selectedBorrower?.locationName}
                />
              )}
            </div>

            {/* Renewal summary */}
            {isRenewal && selectedActiveLoan && (
              <RenewalSummaryInline
                activeLoan={selectedActiveLoan}
                renewalPendingAmount={renewalPendingAmount}
              />
            )}

            {/* Loan type, amount and commission */}
            <LoanTypeAmountFields
              loanTypes={loanTypes}
              selectedLoanTypeId={selectedLoanTypeId}
              onLoanTypeChange={setSelectedLoanTypeId}
              requestedAmount={requestedAmount}
              onRequestedAmountChange={setRequestedAmount}
              comissionAmount={comissionAmount}
              onComissionChange={setComissionAmount}
            />

            {/* Calculation summary */}
            {requestedAmount && calculatedWeeklyPayment > 0 && (
              <LoanCalculationSummary
                isRenewal={isRenewal}
                renewalPendingAmount={renewalPendingAmount}
                calculatedAmountGived={calculatedAmountGived}
                calculatedWeeklyPayment={calculatedWeeklyPayment}
              />
            )}

            {/* Aval selector */}
            <div className="space-y-1.5">
              <Label className="text-sm">Aval (opcional)</Label>
              <UnifiedClientAutocomplete
                mode="aval"
                value={selectedAval}
                onValueChange={setSelectedAval}
                excludeBorrowerId={selectedBorrower?.id}
                locationId={locationId}
                placeholder="Buscar aval..."
                allowCreate
                allowEdit
              />
              {isAvalFromDifferentLocation && (
                <LocationWarning
                  type="aval"
                  locationName={selectedAval?.locationName}
                />
              )}
            </div>

            {/* First payment */}
            <FirstPaymentControl
              includeFirstPayment={includeFirstPayment}
              onIncludeChange={setIncludeFirstPayment}
              firstPaymentAmount={firstPaymentAmount}
              onAmountChange={setFirstPaymentAmount}
            />

            <Button onClick={handleAddLoan} className="w-full h-11">
              {editingLoanId ? (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Actualizar crédito
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar al listado
                </>
              )}
            </Button>
          </div>

          {/* Right side: Pending loans list */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-base md:text-lg">
                Créditos pendientes ({pendingLoans.length})
              </h3>
              <Badge variant="secondary" className="text-base md:text-lg py-1 px-3">
                Total: {formatCurrency(totals.totalAmount)}
              </Badge>
            </div>

            {/* Global commission control */}
            <GlobalCommissionControl
              globalComissionAmount={globalComissionAmount}
              onGlobalComissionChange={setGlobalComissionAmount}
              pendingLoans={pendingLoans}
              onApply={handleApplyGlobalCommission}
            />

            <ScrollArea className="h-[250px] md:h-[300px]">
              <div className="space-y-2 p-0.5">
                {pendingLoans.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No hay créditos pendientes
                  </div>
                ) : (
                  pendingLoans.map((loan) => (
                    <PendingLoanCard
                      key={loan.tempId}
                      loan={loan}
                      isEditing={editingLoanId === loan.tempId}
                      onEdit={handleEditLoan}
                      onRemove={handleRemoveLoan}
                    />
                  ))
                )}
              </div>
            </ScrollArea>

            {/* Account info */}
            <AccountBalanceInfo
              account={defaultAccount}
              totalAmount={totals.totalAmount}
              hasInsufficientFunds={hasInsufficientFunds}
            />
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 pt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto h-11 md:h-12 text-base"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSaveAll}
            disabled={saving || pendingLoans.length === 0 || hasInsufficientFunds}
            className="w-full sm:w-auto h-11 md:h-12 text-base"
          >
            {saving && <Loader2 className="h-5 w-5 mr-2 animate-spin" />}
            <Save className="h-5 w-5 mr-2" />
            Guardar Todos ({pendingLoans.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
