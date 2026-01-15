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
import { ROUTES_WITH_ACCOUNTS_QUERY, ACCOUNTS_QUERY } from '@/graphql/queries/transactions'

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

  // Use the default cash account for the route (EMPLOYEE_CASH_FUND)
  const defaultAccount = useMemo(() => {
    return accounts.find((a) => a.type === 'EMPLOYEE_CASH_FUND') || accounts[0]
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
  const [firstPaymentComission, setFirstPaymentComission] = useState<string>('')
  const [globalComissionAmount, setGlobalComissionAmount] = useState<string>('')
  // Track when first payment was auto-updated for visual feedback
  const [firstPaymentAutoUpdated, setFirstPaymentAutoUpdated] = useState(false)

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
    if (selectedActiveLoan) {
      return parseFloat(selectedActiveLoan.pendingAmountStored) || 0
    }
    // Fallback: use pendingDebtAmount from borrower search (loan in different locality)
    return selectedBorrower?.hasActiveLoans && selectedBorrower?.pendingDebtAmount
      ? selectedBorrower.pendingDebtAmount
      : 0
  }, [selectedActiveLoan, selectedBorrower?.hasActiveLoans, selectedBorrower?.pendingDebtAmount])

  // Check if this is a renewal (has active loan with pending debt)
  const isRenewal = renewalPendingAmount > 0

  // Calculate "Monto Otorgado" (amount actually given to client)
  const calculatedAmountGived = useMemo(() => {
    const requested = parseFloat(requestedAmount) || 0
    return isRenewal ? Math.max(0, requested - renewalPendingAmount) : requested
  }, [requestedAmount, isRenewal, renewalPendingAmount])

  // Calculate weekly payment based on the total debt
  const calculatedWeeklyPayment = useMemo(() => {
    if (!selectedLoanType || !requestedAmount) return 0
    const amount = parseFloat(requestedAmount) || 0
    const rate = parseFloat(selectedLoanType.rate) || 0
    const totalDebt = amount * (1 + rate)
    return totalDebt / selectedLoanType.weekDuration
  }, [selectedLoanType, requestedAmount])

  // Check if clients are from different location
  const isBorrowerFromDifferentLocation = selectedBorrower?.isFromCurrentLocation === false
  const isAvalFromDifferentLocation = selectedAval?.isFromCurrentLocation === false

  // Auto-calculate comission when loan type changes
  useEffect(() => {
    if (selectedLoanType && !editingLoanId) {
      setComissionAmount(selectedLoanType.loanGrantedComission || '0')
    }
  }, [selectedLoanType, editingLoanId])

  // Auto-update first payment when weekly payment changes (if first payment is enabled)
  useEffect(() => {
    if (includeFirstPayment && calculatedWeeklyPayment > 0) {
      const newAmount = Math.round(calculatedWeeklyPayment).toString()
      // Only update if the value actually changed
      if (newAmount !== firstPaymentAmount) {
        setFirstPaymentAmount(newAmount)
        // Update commission from loan type
        setFirstPaymentComission(selectedLoanType?.loanPaymentComission || '0')
        // Trigger visual feedback
        setFirstPaymentAutoUpdated(true)
        // Clear feedback after animation
        setTimeout(() => setFirstPaymentAutoUpdated(false), 1500)
      }
    }
  }, [calculatedWeeklyPayment, includeFirstPayment, selectedLoanType?.loanPaymentComission])

  // Pre-populate form when selecting a reintegro client (has lastFinishedLoan but no activeLoan)
  useEffect(() => {
    if (selectedBorrower?.lastFinishedLoan && !selectedBorrower?.activeLoan) {
      const lastLoan = selectedBorrower.lastFinishedLoan
      setSelectedLoanTypeId(lastLoan.loantypeId)
      setRequestedAmount(lastLoan.requestedAmount)
      // Pre-populate aval if exists
      if (lastLoan.collaterals?.length > 0) {
        const collateral = lastLoan.collaterals[0]
        setSelectedAval({
          id: collateral.id,
          personalDataId: collateral.id,
          fullName: collateral.fullName,
          phone: collateral.phone || undefined,
          isFromCurrentLocation: true,
          clientState: 'existing',
          action: 'connect',
        })
      }
    }
  }, [selectedBorrower])

  // Handler for first payment toggle - pre-fill with weekly payment and commission
  const handleFirstPaymentToggle = (enabled: boolean) => {
    setIncludeFirstPayment(enabled)
    if (enabled && calculatedWeeklyPayment > 0) {
      setFirstPaymentAmount(Math.round(calculatedWeeklyPayment).toString())
      // Pre-fill commission from loan type's loanPaymentComission
      setFirstPaymentComission(selectedLoanType?.loanPaymentComission || '0')
    }
  }

  // Account balance and validation - use accountBalance (computed) if available
  const accountBalance = parseFloat(defaultAccount?.accountBalance || defaultAccount?.amount || '0')
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
    setFirstPaymentComission('')
  }

  // Load loan data into form for editing
  const handleEditLoan = (loan: PendingLoan) => {
    setEditingLoanId(loan.tempId)
    setSelectedLoanTypeId(loan.loantypeId)
    setRequestedAmount(loan.requestedAmount)
    setComissionAmount(loan.comissionAmount)

    // If this is a renewal, find the original loan to reconstruct activeLoan data
    let activeLoanData = undefined
    if (loan.previousLoanId && loansForRenewal) {
      const originalLoan = loansForRenewal.find(l => l.id === loan.previousLoanId)
      if (originalLoan) {
        const leadLocation = originalLoan.lead?.personalData?.addresses?.[0]?.location
        activeLoanData = {
          id: originalLoan.id,
          requestedAmount: originalLoan.requestedAmount,
          amountGived: originalLoan.amountGived,
          pendingAmountStored: originalLoan.pendingAmountStored,
          expectedWeeklyPayment: originalLoan.expectedWeeklyPayment,
          totalPaid: originalLoan.totalPaid,
          loantype: originalLoan.loantype,
          collaterals: originalLoan.collaterals,
          leadLocationName: leadLocation?.name,
        }
      }
    }

    // Reconstruct borrower from loan data
    if (loan.borrowerId) {
      setSelectedBorrower({
        id: loan.borrowerId,
        personalDataId: loan.borrowerPersonalDataId,
        phoneId: loan.borrowerPhoneId,
        fullName: loan.borrowerName,
        phone: loan.borrowerPhone,
        isFromCurrentLocation: !loan.isFromDifferentLocation,
        hasActiveLoans: !!activeLoanData,
        activeLoan: activeLoanData,
        clientState: 'existing',
        action: 'connect',
      })
    } else if (loan.newBorrower) {
      setSelectedBorrower({
        fullName: loan.newBorrower.personalData.fullName,
        phone: loan.newBorrower.personalData.phones?.[0]?.number,
        isFromCurrentLocation: !loan.isFromDifferentLocation,
        hasActiveLoans: !!activeLoanData,
        activeLoan: activeLoanData,
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
      setFirstPaymentComission(loan.firstPayment.comission || '0')
    } else {
      setIncludeFirstPayment(false)
      setFirstPaymentAmount('')
      setFirstPaymentComission('')
    }
  }

  // Determina si el cambio de borrower es una edición del mismo cliente
  const isClientEdit = (
    newBorrower: UnifiedClientValue | null,
    currentBorrower: UnifiedClientValue | null
  ): boolean => {
    return newBorrower?.clientState === 'edited' ||
      Boolean(currentBorrower?.id && newBorrower?.id && currentBorrower.id === newBorrower.id)
  }

  // Helper para construir datos de borrower/aval (nuevo vs existente)
  // Retorna estructuras diferentes para newBorrower (CreateBorrowerInput) y newCollateral (CreatePersonalDataInput)
  const buildPersonData = (client: UnifiedClientValue | null, locationId?: string) => {
    if (!client) {
      return {
        id: undefined,
        personalDataId: undefined,
        phoneId: undefined,
        name: undefined,
        phone: undefined,
        newBorrowerData: undefined,
        newCollateralData: undefined,
      }
    }

    if (client.action === 'create') {
      // Datos base de la persona (para CreatePersonalDataInput)
      const personalData = {
        fullName: client.fullName,
        phones: client.phone ? [{ number: client.phone }] : undefined,
        addresses: locationId ? [{ street: '', locationId }] : undefined,
      }

      return {
        id: undefined,
        personalDataId: undefined,
        phoneId: undefined,
        name: client.fullName,
        phone: client.phone,
        // Para newBorrower: CreateBorrowerInput (con wrapper personalData)
        newBorrowerData: { personalData },
        // Para newCollateral: CreatePersonalDataInput (directo, sin wrapper)
        newCollateralData: personalData,
      }
    }

    return {
      id: client.id,
      personalDataId: client.personalDataId,
      phoneId: client.phoneId,
      name: client.fullName,
      phone: client.phone,
      newBorrowerData: undefined,
      newCollateralData: undefined,
    }
  }

  // Auto-completa datos del préstamo activo cuando se selecciona un cliente para renovación
  const autoFillFromActiveLoan = (activeLoan: any) => {
    if (activeLoan.loantype?.id) {
      setSelectedLoanTypeId(activeLoan.loantype.id)
      const loantype = loanTypes.find(lt => lt.id === activeLoan.loantype?.id)
      if (loantype) {
        setComissionAmount(loantype.loanGrantedComission || '0')
      }
    }

    setRequestedAmount(activeLoan.requestedAmount)

    if (activeLoan.collaterals?.length > 0) {
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
  }

  // Limpia datos del formulario cuando se selecciona cliente sin préstamo activo
  const clearLoanDataIfNeeded = (borrower: UnifiedClientValue | null) => {
    // Solo limpiar cuando es cliente existente sin préstamo activo
    // Preservar datos cuando se crea un cliente nuevo
    if (borrower?.clientState !== 'new') {
      setSelectedLoanTypeId('')
      setRequestedAmount('')
      setComissionAmount('')
    }
    setSelectedAval(null)
  }

  // Handle selecting a borrower - auto-fill if they have an active loan
  const handleBorrowerChange = (borrower: UnifiedClientValue | null) => {
    const isEdit = isClientEdit(borrower, selectedBorrower)

    if (editingLoanId && !isEdit) {
      setEditingLoanId(null)
    }

    setSelectedBorrower(borrower)

    // Solo auto-completar valores en selecciones nuevas, no al editar el mismo cliente
    if (isEdit) return

    if (borrower?.activeLoan) {
      autoFillFromActiveLoan(borrower.activeLoan)
    } else {
      clearLoanDataIfNeeded(borrower)
    }
  }

  // Get IDs of borrowers already in pending loans (for preventing duplicate renewals)
  // Exclude the borrower of the loan being edited so they can be re-selected
  const pendingBorrowerIds = useMemo(() => {
    return new Set(
      pendingLoans
        .filter((loan) => loan.borrowerId && loan.tempId !== editingLoanId) // Exclude the one being edited
        .map((loan) => loan.borrowerId as string)
    )
  }, [pendingLoans, editingLoanId])

  // Valida que no haya datos faltantes para agregar/editar préstamo
  const validateLoanData = (borrower: UnifiedClientValue | null): boolean => {
    if (!borrower) {
      toast({
        title: 'Error',
        description: 'Selecciona un cliente',
        variant: 'destructive',
      })
      return false
    }

    if (!selectedLoanTypeId || !requestedAmount) {
      toast({
        title: 'Error',
        description: 'Selecciona un tipo de préstamo y monto',
        variant: 'destructive',
      })
      return false
    }

    return true
  }

  // Valida que no haya duplicados de clientes en la lista de préstamos pendientes
  const validateNoDuplicateBorrower = (
    borrower: UnifiedClientValue,
    editingId: string | null
  ): boolean => {
    if (!borrower.id) return true

    // Verificar si el cliente ya existe (excepto el préstamo que se está editando)
    const hasDuplicate = editingId
      ? pendingLoans.some((loan) => loan.borrowerId === borrower.id && loan.tempId !== editingId)
      : pendingBorrowerIds.has(borrower.id)

    if (hasDuplicate) {
      toast({
        title: 'Cliente duplicado',
        description: `${borrower.fullName} ya tiene un crédito pendiente en la lista`,
        variant: 'destructive',
      })
      return false
    }

    return true
  }

  // Add or update loan in pending list
  const handleAddLoan = () => {
    if (!validateLoanData(selectedBorrower)) return
    if (!selectedBorrower) return // Type guard for TypeScript
    if (!validateNoDuplicateBorrower(selectedBorrower, editingLoanId)) return

    // Construir datos del borrower y aval
    const borrowerData = buildPersonData(selectedBorrower, locationId)
    const avalData = buildPersonData(selectedAval, locationId)

    // When editing, preserve the previousLoanId from the existing pending loan
    // if we don't have a new activeLoan selected (fixes renewal data loss on edit)
    const existingPendingLoan = editingLoanId
      ? pendingLoans.find((l) => l.tempId === editingLoanId)
      : undefined
    const previousLoanId = selectedActiveLoan?.id || existingPendingLoan?.previousLoanId

    const pendingLoanData: PendingLoan = {
      tempId: editingLoanId || generateTempId(),
      requestedAmount,
      amountGived: calculatedAmountGived.toString(),
      loantypeId: selectedLoanTypeId,
      loantypeName: selectedLoanType?.name || '',
      weekDuration: selectedLoanType?.weekDuration || 0,
      comissionAmount: comissionAmount || '0',
      previousLoanId,
      borrowerId: borrowerData.id,
      borrowerPersonalDataId: borrowerData.personalDataId,
      borrowerPhoneId: borrowerData.phoneId,
      borrowerName: borrowerData.name!,
      borrowerPhone: borrowerData.phone,
      newBorrower: borrowerData.newBorrowerData,
      collateralIds: avalData.id ? [avalData.id] : [],
      collateralPersonalDataId: avalData.personalDataId,
      collateralPhoneId: avalData.phoneId,
      collateralName: avalData.name,
      collateralPhone: avalData.phone,
      newCollateral: avalData.newCollateralData,
      firstPayment: includeFirstPayment && firstPaymentAmount
        ? { amount: firstPaymentAmount, comission: firstPaymentComission || '0', paymentMethod: 'CASH' }
        : undefined,
      isFromDifferentLocation: selectedBorrower?.isFromCurrentLocation === false,
      isRenewal: !!previousLoanId,
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

    // Validar que las renovaciones tengan previousLoanId
    const invalidRenewals = pendingLoans.filter((loan) => loan.isRenewal && !loan.previousLoanId)

    if (invalidRenewals.length > 0) {
      toast({
        title: 'Error de renovación',
        description: `Los siguientes clientes tienen un error de renovación: ${invalidRenewals.map((l) => l.borrowerName).join(', ')}. Por favor, elimínalos y selecciónalos nuevamente desde la lista de "Clientes con préstamo activo".`,
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
        // Refetch accounts to update balances after creating loans
        refetchQueries: [
          { query: ROUTES_WITH_ACCOUNTS_QUERY },
          { query: ACCOUNTS_QUERY, variables: { routeId: undefined, type: 'EMPLOYEE_CASH_FUND' } },
        ],
      })

      toast({
        title: 'Créditos guardados',
        description: `Se guardaron ${pendingLoans.length} créditos correctamente`,
      })

      clearPendingLoans()
      onSuccess()
      onOpenChange(false)
    } catch (error: unknown) {
      // Extract GraphQL error message if available
      let errorMessage = 'No se pudieron guardar los créditos'

      if (error && typeof error === 'object') {
        // Apollo GraphQL errors
        const apolloError = error as { graphQLErrors?: Array<{ message: string }> }
        if (apolloError.graphQLErrors && apolloError.graphQLErrors.length > 0) {
          errorMessage = apolloError.graphQLErrors[0].message
        } else if ('message' in error && typeof error.message === 'string') {
          errorMessage = error.message
        }
      }

      toast({
        title: 'Error al guardar créditos',
        description: errorMessage,
        variant: 'destructive',
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-4 pt-4 pb-1 shrink-0">
          <DialogTitle className="text-base">Registrar Créditos</DialogTitle>
          <DialogDescription className="text-xs">
            Agrega los créditos a otorgar y guárdalos todos de una vez
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Left side: Form to add loans */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">
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

            {/* Calculation summary - at top for immediate visibility */}
            {requestedAmount && calculatedWeeklyPayment > 0 && (
              <LoanCalculationSummary
                isRenewal={isRenewal}
                renewalPendingAmount={renewalPendingAmount}
                calculatedAmountGived={calculatedAmountGived}
                calculatedWeeklyPayment={calculatedWeeklyPayment}
                requestedAmount={parseFloat(requestedAmount) || 0}
              />
            )}

            {/* Client selector */}
            <div className="space-y-1">
              <Label className="text-xs">Cliente</Label>
              <UnifiedClientAutocomplete
                mode="borrower"
                value={selectedBorrower}
                onValueChange={handleBorrowerChange}
                leadId={leadId}
                locationId={locationId}
                activeLoansForRenewal={loansForRenewal}
                excludeBorrowerIds={pendingBorrowerIds}
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
            {isRenewal && (
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

            {/* Aval selector */}
            <div className="space-y-1">
              <Label className="text-xs">Aval (opcional)</Label>
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
              onIncludeChange={handleFirstPaymentToggle}
              firstPaymentAmount={firstPaymentAmount}
              onAmountChange={setFirstPaymentAmount}
              firstPaymentComission={firstPaymentComission}
              onComissionChange={setFirstPaymentComission}
              autoUpdated={firstPaymentAutoUpdated}
            />
          </div>

          {/* Right side: Pending loans list */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-semibold text-sm">
                Créditos pendientes ({pendingLoans.length})
              </h3>
              <Badge variant="secondary" className="text-sm py-0.5 px-2">
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

            <ScrollArea className="h-[220px] md:h-[260px]">
              <div className="space-y-1.5 pr-2">
                {pendingLoans.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground text-sm">
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

            {/* Add loan button */}
            <Button onClick={handleAddLoan} className="w-full h-9 text-sm">
              {editingLoanId ? (
                <>
                  <Save className="h-3.5 w-3.5 mr-1.5" />
                  Actualizar crédito
                </>
              ) : (
                <>
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  Agregar al listado
                </>
              )}
            </Button>
          </div>
          {/* End of right side */}
        </div>
        {/* End of grid */}
      </div>
      {/* End of scrollable content */}

      <DialogFooter className="flex-col sm:flex-row gap-2 px-4 py-3 border-t shrink-0 bg-background">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto h-9 text-sm"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSaveAll}
            disabled={saving || pendingLoans.length === 0 || hasInsufficientFunds}
            className="w-full sm:w-auto h-9 text-sm"
          >
            {saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
            <Save className="h-4 w-4 mr-1.5" />
            Guardar Todos ({pendingLoans.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
