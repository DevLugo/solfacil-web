'use client'

import { useState, useEffect } from 'react'
import { useMutation } from '@apollo/client'
import { Phone, Pencil, Save, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { UnifiedClientAutocomplete } from './UnifiedClientAutocomplete'
import { EditClientForm } from './UnifiedClientAutocomplete/EditClientForm'
import { LocationWarning } from './LocationWarning'
import { UPDATE_LOAN_EXTENDED } from '@/graphql/mutations/transactions'
import type { Loan, UnifiedClientValue } from '../types'

// Helper functions
function parseAmount(value: string | undefined | null): number {
  return parseFloat(value || '0')
}

interface InfoRowProps {
  label: string
  value: string
  valueClassName?: string
}

function InfoRow({ label, value, valueClassName = 'font-medium' }: InfoRowProps) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={valueClassName}>{value}</span>
    </div>
  )
}

interface DebtInfoSectionProps {
  loan: Loan
}

function DebtInfoSection({ loan }: DebtInfoSectionProps) {
  return (
    <div className="p-3 rounded-lg bg-muted/50 space-y-1 text-sm">
      <InfoRow
        label="Deuda total:"
        value={formatCurrency(parseAmount(loan.totalDebtAcquired))}
      />
      <InfoRow
        label="Pago semanal:"
        value={formatCurrency(parseAmount(loan.expectedWeeklyPayment))}
        valueClassName=""
      />
      <InfoRow
        label="Pendiente:"
        value={formatCurrency(parseAmount(loan.pendingAmountStored))}
        valueClassName="text-destructive font-medium"
      />
    </div>
  )
}

interface LoanInfoSectionProps {
  loan: Loan
}

function LoanInfoSection({ loan }: LoanInfoSectionProps) {
  const loanTypeInfo = `${loan.loantype.name} - ${loan.loantype.weekDuration} sem (${Math.round(parseAmount(loan.loantype.rate) * 100)}%)`

  return (
    <div className="p-3 rounded-lg border bg-muted/30 space-y-2 text-sm">
      <InfoRow label="Tipo:" value={loanTypeInfo} />
      <InfoRow
        label="Monto solicitado:"
        value={formatCurrency(parseAmount(loan.requestedAmount))}
      />
      <InfoRow
        label="Comisión:"
        value={formatCurrency(parseAmount(loan.comissionAmount))}
      />
    </div>
  )
}

function buildAvalInput(
  selectedAval: UnifiedClientValue,
  originalAvalId: string | null,
  locationId?: string | null
) {
  const input: {
    collateralIds?: string[]
    collateralPhone?: string
    newCollateral?: {
      fullName: string
      phones?: { number: string }[]
      addresses?: { street: string; locationId: string }[]
    }
  } = {}

  if (selectedAval.action === 'create') {
    input.newCollateral = {
      fullName: selectedAval.fullName,
      phones: selectedAval.phone ? [{ number: selectedAval.phone }] : undefined,
      addresses: locationId ? [{ street: '', locationId }] : undefined,
    }
  } else if (selectedAval.id && selectedAval.id !== originalAvalId) {
    input.collateralIds = [selectedAval.id]
  } else if (
    selectedAval.action === 'update' &&
    selectedAval.phone !== selectedAval.originalPhone
  ) {
    input.collateralPhone = selectedAval.phone
  }

  return Object.keys(input).length > 0 ? input : null
}

interface BorrowerSectionProps {
  borrowerName: string
  borrowerPhone: string
  onSave: (name: string, phone: string) => Promise<void>
  isSaving: boolean
}

function BorrowerSection({
  borrowerName,
  borrowerPhone,
  onSave,
  isSaving,
}: BorrowerSectionProps) {
  // Use local state for editing to avoid parent re-renders on every keystroke
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editPhone, setEditPhone] = useState('')

  // Initialize local edit state when entering edit mode
  const handleStartEdit = () => {
    setEditName(borrowerName)
    setEditPhone(borrowerPhone)
    setIsEditing(true)
  }

  const handleConfirm = async () => {
    await onSave(editName, editPhone)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setIsEditing(false)
  }

  // Edit mode - use same design as aval
  if (isEditing) {
    return (
      <div className="space-y-2">
        <Label>Cliente (Titular)</Label>
        <EditClientForm
          mode="borrower"
          name={editName}
          phone={editPhone}
          isSaving={isSaving}
          onNameChange={setEditName}
          onPhoneChange={setEditPhone}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      </div>
    )
  }

  // View mode - compact single line like aval's SelectedClientDisplay
  return (
    <div className="space-y-2">
      <Label>Cliente (Titular)</Label>
      <div className="flex items-center gap-2 py-1.5 px-2.5 border rounded-md bg-background">
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <span className="font-medium text-sm truncate">{borrowerName || 'Sin nombre'}</span>
          {borrowerPhone && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
              <Phone className="h-3 w-3" />
              {borrowerPhone}
            </span>
          )}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground hover:text-foreground"
          onClick={handleStartEdit}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}

interface EditLoanModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  loan: Loan | null
  locationId?: string | null
  onSuccess: () => void
}

export function EditLoanModal({
  open,
  onOpenChange,
  loan,
  locationId,
  onSuccess,
}: EditLoanModalProps) {
  const { toast } = useToast()

  // Store current and original borrower values
  const [borrowerName, setBorrowerName] = useState<string>('')
  const [borrowerPhone, setBorrowerPhone] = useState<string>('')
  const [selectedAval, setSelectedAval] = useState<UnifiedClientValue | null>(null)
  const [originalAvalId, setOriginalAvalId] = useState<string | null>(null)
  const [savingBorrower, setSavingBorrower] = useState(false)
  const [savingAval, setSavingAval] = useState(false)

  const [updateLoanExtended] = useMutation(UPDATE_LOAN_EXTENDED)

  // Track the loan ID to detect actual loan changes vs reference changes
  const [initializedLoanId, setInitializedLoanId] = useState<string | null>(null)

  // Initialize form when loan changes (only when it's a different loan, not just a reference change)
  useEffect(() => {
    if (!loan || loan.id === initializedLoanId) return

    setInitializedLoanId(loan.id)

    // Set borrower display values
    setBorrowerName(loan.borrower.personalData.fullName || '')
    setBorrowerPhone(loan.borrower.personalData.phones[0]?.number || '')

    if (loan.collaterals.length === 0) {
      setSelectedAval(null)
      setOriginalAvalId(null)
      return
    }

    const collateral = loan.collaterals[0]
    setOriginalAvalId(collateral.id)
    const collateralLocationId = collateral.addresses?.[0]?.location?.id
    const collateralLocationName = collateral.addresses?.[0]?.location?.name
    const isFromCurrentLocation =
      !locationId ||
      !collateralLocationId ||
      collateralLocationId === locationId

    setSelectedAval({
      id: collateral.id,
      personalDataId: collateral.id,
      phoneId: collateral.phones[0]?.id,
      fullName: collateral.fullName,
      phone: collateral.phones[0]?.number,
      locationId: collateralLocationId,
      locationName: collateralLocationName,
      isFromCurrentLocation,
      originalFullName: collateral.fullName,
      originalPhone: collateral.phones[0]?.number,
      clientState: 'existing',
      action: 'connect',
    })
  }, [loan, locationId, initializedLoanId])

  // Reset initializedLoanId when modal closes to allow re-initialization on next open
  useEffect(() => {
    if (!open) {
      setInitializedLoanId(null)
    }
  }, [open])

  // Check if aval is from different location (only if both locationId and aval locationId are defined)
  const isAvalFromDifferentLocation = Boolean(
    selectedAval &&
    locationId &&
    selectedAval.locationId &&
    selectedAval.locationId !== locationId
  )

  const hasAvalChanges = Boolean(
    selectedAval &&
      (selectedAval.action === 'create' ||
        (selectedAval.id && selectedAval.id !== originalAvalId) ||
        (selectedAval.action === 'update' &&
          (selectedAval.fullName !== selectedAval.originalFullName ||
            selectedAval.phone !== selectedAval.originalPhone)))
  )

  const handleSaveBorrower = async (newName: string, newPhone: string) => {
    if (!loan) return

    const hasNameChange = newName !== borrowerName
    const hasPhoneChange = newPhone !== borrowerPhone

    if (!hasNameChange && !hasPhoneChange) {
      toast({
        title: 'Sin cambios',
        description: 'No hay cambios que guardar',
      })
      return
    }

    setSavingBorrower(true)
    try {
      const input: { borrowerName?: string; borrowerPhone?: string } = {}
      if (hasNameChange) input.borrowerName = newName
      if (hasPhoneChange) input.borrowerPhone = newPhone

      await updateLoanExtended({
        variables: { id: loan.id, input },
      })

      if (hasNameChange) setBorrowerName(newName)
      if (hasPhoneChange) setBorrowerPhone(newPhone)

      toast({
        title: 'Cliente actualizado',
        description: 'Los datos del titular se guardaron correctamente',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo actualizar el cliente',
        variant: 'destructive',
      })
    } finally {
      setSavingBorrower(false)
    }
  }

  const handleSaveAval = async () => {
    if (!loan || !selectedAval || !hasAvalChanges) return

    const input = buildAvalInput(selectedAval, originalAvalId, locationId)
    if (!input) return

    setSavingAval(true)
    try {
      await updateLoanExtended({
        variables: { id: loan.id, input },
      })

      if (selectedAval.id && selectedAval.id !== originalAvalId) {
        setOriginalAvalId(selectedAval.id)
      }

      toast({
        title: 'Aval actualizado',
        description: 'Los datos del aval se guardaron correctamente',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo actualizar el aval',
        variant: 'destructive',
      })
    } finally {
      setSavingAval(false)
    }
  }

  if (!loan) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar Crédito</DialogTitle>
          <DialogDescription>
            {borrowerName} - {formatCurrency(parseAmount(loan.requestedAmount))}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current debt info */}
          <DebtInfoSection loan={loan} />

          {/* Loan info - Read only */}
          <LoanInfoSection loan={loan} />

          {/* Borrower - Editable name and phone */}
          <BorrowerSection
            borrowerName={borrowerName}
            borrowerPhone={borrowerPhone}
            onSave={handleSaveBorrower}
            isSaving={savingBorrower}
          />

          {/* Aval */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Aval</Label>
              {hasAvalChanges && (
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSaveAval}
                  disabled={savingAval}
                  className="h-7 text-xs"
                >
                  {savingAval ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="h-3 w-3 mr-1" />
                      Guardar aval
                    </>
                  )}
                </Button>
              )}
            </div>
            <UnifiedClientAutocomplete
              mode="aval"
              value={selectedAval}
              onValueChange={setSelectedAval}
              excludeBorrowerId={loan.borrower.id}
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
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false)
              onSuccess()
            }}
          >
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
