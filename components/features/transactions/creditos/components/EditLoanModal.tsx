'use client'

import { useState, useMemo, useEffect } from 'react'
import { useMutation } from '@apollo/client'
import { Save, Loader2 } from 'lucide-react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency } from '@/lib/utils'
import { UnifiedClientAutocomplete } from './UnifiedClientAutocomplete'
import { LocationWarning } from './LocationWarning'
import { UPDATE_LOAN_EXTENDED } from '@/graphql/mutations/transactions'
import type { Loan, LoanType, UnifiedClientValue } from '../types'

interface EditLoanModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  loan: Loan | null
  loanTypes: LoanType[]
  locationId?: string | null
  onSuccess: () => void
}

export function EditLoanModal({
  open,
  onOpenChange,
  loan,
  loanTypes,
  locationId,
  onSuccess,
}: EditLoanModalProps) {
  const { toast } = useToast()

  const [selectedLoanTypeId, setSelectedLoanTypeId] = useState<string>('')
  const [requestedAmount, setRequestedAmount] = useState<string>('')
  const [borrowerName, setBorrowerName] = useState<string>('')
  const [borrowerPhone, setBorrowerPhone] = useState<string>('')
  const [comissionAmount, setComissionAmount] = useState<string>('')
  const [selectedAval, setSelectedAval] = useState<UnifiedClientValue | null>(null)

  const [updateLoanExtended, { loading: saving }] = useMutation(UPDATE_LOAN_EXTENDED)

  // Initialize form when loan changes
  useEffect(() => {
    if (loan) {
      setSelectedLoanTypeId(loan.loantype.id)
      setRequestedAmount(loan.requestedAmount || '')
      setBorrowerName(loan.borrower.personalData.fullName || '')
      setBorrowerPhone(loan.borrower.personalData.phones[0]?.number || '')
      setComissionAmount(loan.comissionAmount?.toString() || '0')
      if (loan.collaterals.length > 0) {
        const collateral = loan.collaterals[0]
        const collateralLocationId = collateral.addresses?.[0]?.location?.id
        setSelectedAval({
          id: collateral.id,
          fullName: collateral.fullName,
          phone: collateral.phones[0]?.number,
          locationId: collateralLocationId,
          locationName: collateral.addresses?.[0]?.location?.name,
          isFromCurrentLocation: locationId ? collateralLocationId === locationId : true,
          originalFullName: collateral.fullName,
          originalPhone: collateral.phones[0]?.number,
          clientState: 'existing',
          action: 'connect',
        })
      } else {
        setSelectedAval(null)
      }
    }
  }, [loan, locationId])

  // Check if aval is from different location
  const isAvalFromDifferentLocation = selectedAval && selectedAval.isFromCurrentLocation === false

  const handleSave = async () => {
    if (!loan) return

    try {
      const input: {
        loantypeId?: string
        requestedAmount?: string
        borrowerName?: string
        borrowerPhone?: string
        comissionAmount?: string
        collateralIds?: string[]
        collateralPhone?: string
        newCollateral?: {
          fullName: string
          phones?: { number: string }[]
          addresses?: { street: string; locationId: string }[]
        }
      } = {}

      // Only include changed fields
      if (selectedLoanTypeId !== loan.loantype.id) {
        input.loantypeId = selectedLoanTypeId
      }

      if (requestedAmount !== loan.requestedAmount) {
        input.requestedAmount = requestedAmount
      }

      if (borrowerName !== loan.borrower.personalData.fullName) {
        input.borrowerName = borrowerName
      }

      if (borrowerPhone !== loan.borrower.personalData.phones[0]?.number) {
        input.borrowerPhone = borrowerPhone
      }

      if (comissionAmount !== loan.comissionAmount?.toString()) {
        input.comissionAmount = comissionAmount
      }

      // Handle aval changes
      if (selectedAval) {
        const currentCollateralId = loan.collaterals[0]?.id

        if (selectedAval.action === 'create') {
          // Creating new aval
          input.newCollateral = {
            fullName: selectedAval.fullName,
            phones: selectedAval.phone ? [{ number: selectedAval.phone }] : undefined,
            addresses: locationId ? [{ street: '', locationId }] : undefined,
          }
        } else if (selectedAval.id !== currentCollateralId) {
          // Connecting different existing aval
          if (selectedAval.id) {
            input.collateralIds = [selectedAval.id]
          }
        } else if (selectedAval.action === 'update' && selectedAval.phone !== selectedAval.originalPhone) {
          // Updating phone of existing aval
          input.collateralPhone = selectedAval.phone
        }
      }

      // Only update if there are changes
      if (Object.keys(input).length === 0) {
        toast({
          title: 'Sin cambios',
          description: 'No hay cambios para guardar',
        })
        return
      }

      await updateLoanExtended({
        variables: {
          id: loan.id,
          input,
        },
      })

      toast({
        title: 'Crédito actualizado',
        description: 'Los cambios se guardaron correctamente',
      })

      onOpenChange(false)
      onSuccess()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'No se pudo actualizar el crédito'
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      })
    }
  }

  if (!loan) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Crédito</DialogTitle>
          <DialogDescription>
            {loan.borrower.personalData.fullName} - {formatCurrency(parseFloat(loan.requestedAmount))}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current debt info */}
          <div className="p-3 rounded-lg bg-muted/50 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Deuda total:</span>
              <span className="font-medium">{formatCurrency(parseFloat(loan.totalDebtAcquired || '0'))}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Pago semanal:</span>
              <span>{formatCurrency(parseFloat(loan.expectedWeeklyPayment || '0'))}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Pendiente:</span>
              <span className="text-destructive font-medium">{formatCurrency(parseFloat(loan.pendingAmountStored || '0'))}</span>
            </div>
          </div>

          {/* Loan type */}
          <div className="space-y-2">
            <Label>Tipo de préstamo</Label>
            <Select value={selectedLoanTypeId} onValueChange={setSelectedLoanTypeId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar tipo..." />
              </SelectTrigger>
              <SelectContent>
                {loanTypes.map((lt) => (
                  <SelectItem key={lt.id} value={lt.id}>
                    {lt.name} - {lt.weekDuration} semanas ({lt.rate}%)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Requested Amount */}
          <div className="space-y-2">
            <Label>Monto solicitado</Label>
            <Input
              type="number"
              inputMode="decimal"
              value={requestedAmount}
              onChange={(e) => setRequestedAmount(e.target.value)}
              placeholder="0"
            />
          </div>

          {/* Borrower name */}
          <div className="space-y-2">
            <Label>Nombre del cliente</Label>
            <Input
              value={borrowerName}
              onChange={(e) => setBorrowerName(e.target.value)}
              placeholder="Nombre completo"
            />
          </div>

          {/* Borrower phone */}
          <div className="space-y-2">
            <Label>Teléfono del cliente</Label>
            <Input
              value={borrowerPhone}
              onChange={(e) => setBorrowerPhone(e.target.value)}
              placeholder="Teléfono"
            />
          </div>

          {/* Commission */}
          <div className="space-y-2">
            <Label>Comisión</Label>
            <Input
              type="number"
              inputMode="decimal"
              value={comissionAmount}
              onChange={(e) => setComissionAmount(e.target.value)}
              placeholder="0"
            />
          </div>

          {/* Aval */}
          <div className="space-y-2">
            <Label>Aval</Label>
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
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            <Save className="h-4 w-4 mr-2" />
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
