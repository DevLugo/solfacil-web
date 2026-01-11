'use client'

import { useState } from 'react'
import { AlertTriangle, Loader2 } from 'lucide-react'
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
import { formatCurrency } from '@/lib/utils'

interface NuevoFalcoModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  isSubmitting: boolean
  onConfirm: (amount: number) => void
  maxAmount?: number
}

export function NuevoFalcoModal({
  open,
  onOpenChange,
  isSubmitting,
  onConfirm,
  maxAmount,
}: NuevoFalcoModalProps) {
  const [amount, setAmount] = useState('')

  const parsedAmount = parseFloat(amount || '0')
  const isValid = parsedAmount > 0 && (!maxAmount || parsedAmount <= maxAmount)

  const handleConfirm = () => {
    if (isValid) {
      onConfirm(parsedAmount)
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!isSubmitting) {
      if (!newOpen) {
        setAmount('')
      }
      onOpenChange(newOpen)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Registrar Faltante de Caja
          </DialogTitle>
          <DialogDescription>
            Registra un faltante de caja (FALCO) para este día de cobranza.
            El monto se descontará del efectivo esperado.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div>
            <Label htmlFor="falco-amount">Monto del Faltante</Label>
            <Input
              id="falco-amount"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onWheel={(e) => e.currentTarget.blur()}
              className="mt-1.5"
              autoFocus
            />
            {maxAmount && (
              <p className="text-xs text-muted-foreground mt-1">
                Máximo disponible: {formatCurrency(maxAmount)}
              </p>
            )}
          </div>

          {parsedAmount > 0 && (
            <div className="p-3 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-md">
              <p className="text-sm text-orange-700 dark:text-orange-400">
                <strong>Faltante a registrar:</strong> {formatCurrency(parsedAmount)}
              </p>
              <p className="text-xs text-orange-600 dark:text-orange-500 mt-1">
                Este monto quedará pendiente de compensación por el líder.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isSubmitting || !isValid}
            className="gap-2 bg-orange-600 hover:bg-orange-700"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <AlertTriangle className="h-4 w-4" />
                Registrar Falco
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
