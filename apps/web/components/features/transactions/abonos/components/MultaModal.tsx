'use client'

import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Loader2, Gavel, Wallet } from 'lucide-react'
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
import { formatCurrency } from '@/lib/utils'
import type { Account } from '../types'

interface MultaModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  multaAmount: string
  onMultaAmountChange: (value: string) => void
  selectedAccountId: string
  onSelectedAccountIdChange: (value: string) => void
  cashAccounts: Account[]
  selectedDate: Date
  isCreating: boolean
  onConfirm: () => void
}

export function MultaModal({
  open,
  onOpenChange,
  multaAmount,
  onMultaAmountChange,
  selectedAccountId,
  onSelectedAccountIdChange,
  cashAccounts,
  selectedDate,
  isCreating,
  onConfirm,
}: MultaModalProps) {
  const isValid = multaAmount && parseFloat(multaAmount) > 0 && selectedAccountId

  return (
    <Dialog open={open} onOpenChange={(o) => !isCreating && onOpenChange(o)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gavel className="h-5 w-5 text-orange-600" />
            Registrar Multa
          </DialogTitle>
          <DialogDescription>
            Crea una multa para esta localidad en la fecha seleccionada
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Multa amount */}
          <div>
            <Label htmlFor="multa-amount">Monto de la Multa</Label>
            <div className="relative mt-1.5">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                id="multa-amount"
                type="number"
                min="0"
                placeholder="0"
                value={multaAmount}
                onChange={(e) => onMultaAmountChange(e.target.value)}
                className="pl-7"
                autoFocus
                onWheel={(e) => e.currentTarget.blur()}
              />
            </div>
          </div>

          {/* Destination account */}
          <div>
            <Label htmlFor="multa-account">Cuenta Destino</Label>
            <Select
              value={selectedAccountId}
              onValueChange={onSelectedAccountIdChange}
            >
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Selecciona una cuenta" />
              </SelectTrigger>
              <SelectContent>
                {cashAccounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    <div className="flex items-center gap-2">
                      <Wallet className="h-4 w-4" />
                      {account.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              El monto se registrará en esta cuenta
            </p>
          </div>

          {/* Summary */}
          <div className="p-3 bg-orange-50 dark:bg-orange-950/30 rounded-lg border border-orange-200 dark:border-orange-800">
            <p className="text-sm text-muted-foreground mb-1">Detalles:</p>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Fecha:</span>
                <span className="font-medium">{format(selectedDate, "d 'de' MMMM, yyyy", { locale: es })}</span>
              </div>
              <div className="flex justify-between">
                <span>Monto:</span>
                <span className="font-bold text-orange-600">
                  {multaAmount ? formatCurrency(parseFloat(multaAmount)) : '$0'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isCreating}
          >
            Cancelar
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isCreating || !isValid}
            className="gap-2 bg-orange-600 hover:bg-orange-700"
          >
            {isCreating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Gavel className="h-4 w-4" />
                Registrar Multa
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
