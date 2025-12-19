'use client'

import { Loader2, Save, Wallet, Building2, AlertTriangle, Pencil } from 'lucide-react'
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
import { cn } from '@/lib/utils'
import type { ModalTotals } from '../types'

interface DistributionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  isSubmitting: boolean
  isSavingEdits: boolean
  savingProgress: { current: number; total: number } | null
  modalTotals: ModalTotals
  bankTransferAmount: string
  onBankTransferAmountChange: (value: string) => void
  hasEditedPayments: boolean
  onConfirm: () => void
}

export function DistributionModal({
  open,
  onOpenChange,
  isSubmitting,
  isSavingEdits,
  savingProgress,
  modalTotals,
  bankTransferAmount,
  onBankTransferAmountChange,
  hasEditedPayments,
  onConfirm,
}: DistributionModalProps) {
  const isSaving = isSubmitting || isSavingEdits
  const bankTransferValue = parseFloat(bankTransferAmount || '0')
  const exceedsCash = bankTransferValue > modalTotals.cash

  return (
    <Dialog open={open} onOpenChange={(o) => !isSaving && onOpenChange(o)}>
      <DialogContent className="sm:max-w-lg">
        {/* Saving Overlay */}
        {isSubmitting && savingProgress && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/95 rounded-lg">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <h3 className="text-lg font-semibold mb-2">Guardando abonos...</h3>
            <p className="text-muted-foreground mb-4">
              Procesando {savingProgress.current} de {savingProgress.total}
            </p>
            <div className="w-48 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${(savingProgress.current / savingProgress.total) * 100}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              No cierres esta ventana
            </p>
          </div>
        )}

        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            Distribución de Pagos
          </DialogTitle>
          <DialogDescription>
            Confirma la distribución del efectivo cobrado
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Total */}
          <div className="text-center">
            <h4 className="text-lg font-semibold">
              Total: {formatCurrency(modalTotals.total)}
            </h4>
            {modalTotals.deleted > 0 && (
              <p className="text-sm text-red-600 mt-1">
                ({modalTotals.deleted} pago(s) serán eliminados)
              </p>
            )}
          </div>

          {/* Payment Method Breakdown */}
          <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border">
            <p className="text-sm font-semibold text-muted-foreground mb-3">
              Desglose por Método de Pago
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/50 border border-green-200 dark:border-green-800 rounded-md">
                <Wallet className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-xs font-medium text-green-700 dark:text-green-400">Efectivo</p>
                  <p className="text-lg font-bold text-green-700 dark:text-green-400">
                    {formatCurrency(modalTotals.cash)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded-md">
                <Building2 className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-xs font-medium text-blue-700 dark:text-blue-400">Transferencia</p>
                  <p className="text-lg font-bold text-blue-700 dark:text-blue-400">
                    {formatCurrency(modalTotals.bank)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Cash Distribution */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm">Distribución de Efectivo:</Label>
              <div className="mt-1.5 px-3 py-2 h-10 bg-white dark:bg-slate-800 border rounded-md flex items-center font-medium text-sm">
                {formatCurrency(modalTotals.cash - bankTransferValue)}
              </div>
              <p className="text-xs text-muted-foreground italic mt-1.5">
                Solo puedes distribuir: {formatCurrency(modalTotals.cash)} (efectivo real)
              </p>
            </div>

            <div>
              <Label htmlFor="bank-transfer" className="text-sm">Transferencia:</Label>
              <Input
                id="bank-transfer"
                type="number"
                min="0"
                max={modalTotals.cash}
                value={bankTransferAmount}
                onChange={(e) => {
                  const value = Math.max(0, Math.min(parseFloat(e.target.value) || 0, modalTotals.cash))
                  onBankTransferAmountChange(value.toString())
                }}
                className={cn(
                  "mt-1.5",
                  exceedsCash && "border-red-500 border-2"
                )}
                onWheel={(e) => e.currentTarget.blur()}
              />
              <p className="text-xs text-muted-foreground italic mt-1.5">
                Máximo: {formatCurrency(modalTotals.cash)}
              </p>
            </div>
          </div>

          {/* Error if transfer exceeds cash */}
          {exceedsCash && (
            <div className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-md text-center">
              <p className="text-sm text-red-600 dark:text-red-400 flex items-center justify-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                El monto de transferencia no puede ser mayor al efectivo real disponible ({formatCurrency(modalTotals.cash)})
              </p>
            </div>
          )}

          {/* Operation Summary */}
          <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
            <p className="text-sm text-muted-foreground mb-2">Resumen de la operación:</p>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>{hasEditedPayments ? 'Abonos activos:' : 'Abonos a registrar:'}</span>
                <span className="font-medium">{modalTotals.count}</span>
              </div>
              {modalTotals.deleted > 0 && (
                <div className="flex justify-between">
                  <span>Abonos a eliminar:</span>
                  <span className="font-medium text-red-600">{modalTotals.deleted}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Total cobrado:</span>
                <span className="font-medium">{formatCurrency(modalTotals.total)}</span>
              </div>
              <div className="flex justify-between">
                <span>Comisiones:</span>
                <span className="font-medium text-purple-600">{formatCurrency(modalTotals.commission)}</span>
              </div>
              {!hasEditedPayments && modalTotals.noPayment > 0 && (
                <div className="flex justify-between">
                  <span>Sin pago:</span>
                  <span className="font-medium text-red-600">{modalTotals.noPayment}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancelar
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isSaving || exceedsCash}
            className="gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                {hasEditedPayments ? <Pencil className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                {hasEditedPayments ? 'Actualizar Pagos' : 'Confirmar y Guardar'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
