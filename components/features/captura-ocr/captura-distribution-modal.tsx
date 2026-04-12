'use client'

import { Loader2, Save, Wallet, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { formatCurrency, cn } from '@/lib/utils'

interface CapturaDistributionTotals {
  cash: number
  bank: number
  total: number
  count: number
  commission: number
  faltasCount: number
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  totals: CapturaDistributionTotals
  cashToBank: string
  onCashToBankChange: (value: string) => void
  onConfirm: () => void
  isSubmitting: boolean
}

export function CapturaDistributionModal({
  open,
  onOpenChange,
  totals,
  cashToBank,
  onCashToBankChange,
  onConfirm,
  isSubmitting,
}: Props) {
  const cashToBankValue = parseFloat(cashToBank || '0')
  const adjustedCash = totals.cash - cashToBankValue
  const adjustedBank = totals.bank + cashToBankValue
  const exceedsCash = cashToBankValue > totals.cash

  return (
    <Dialog open={open} onOpenChange={(o) => !isSubmitting && onOpenChange(o)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            Distribucion de Pagos
          </DialogTitle>
          <DialogDescription>
            Confirma la distribucion del efectivo cobrado para esta localidad
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Total */}
          <div className="text-center">
            <h4 className="text-lg font-semibold">
              Total: {formatCurrency(totals.total)}
            </h4>
          </div>

          {/* Payment method breakdown */}
          <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border">
            <p className="text-sm font-semibold text-muted-foreground mb-3">
              Desglose por Metodo de Pago
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/50 border border-green-200 dark:border-green-800 rounded-md">
                <Wallet className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-xs font-medium text-green-700 dark:text-green-400">Efectivo</p>
                  <p className="text-lg font-bold text-green-700 dark:text-green-400">
                    {formatCurrency(totals.cash)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded-md">
                <Building2 className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-xs font-medium text-blue-700 dark:text-blue-400">Transferencia</p>
                  <p className="text-lg font-bold text-blue-700 dark:text-blue-400">
                    {formatCurrency(totals.bank)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Cash distribution */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm">Distribucion de Efectivo:</Label>
              <div className="mt-1.5 px-3 py-2 h-10 bg-white dark:bg-slate-800 border rounded-md flex items-center font-medium text-sm">
                {formatCurrency(adjustedCash)}
              </div>
              <p className="text-xs text-muted-foreground italic mt-1.5">
                Solo puedes distribuir: {formatCurrency(totals.cash)} (efectivo real)
              </p>
            </div>
            <div>
              <Label htmlFor="captura-bank-transfer" className="text-sm">Transferencia a Banco:</Label>
              <Input
                id="captura-bank-transfer"
                type="number"
                min="0"
                max={totals.cash}
                value={cashToBank}
                onChange={(e) => {
                  const value = Math.max(0, Math.min(parseFloat(e.target.value) || 0, totals.cash))
                  onCashToBankChange(value.toString())
                }}
                className={cn('mt-1.5', exceedsCash && 'border-red-500 border-2')}
                onWheel={(e) => e.currentTarget.blur()}
              />
              <p className="text-xs text-muted-foreground italic mt-1.5">
                Maximo: {formatCurrency(totals.cash)}
              </p>
            </div>
          </div>

          {/* Operation summary */}
          <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
            <p className="text-sm text-muted-foreground mb-2">Resumen de la operacion:</p>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Abonos a registrar:</span>
                <span className="font-medium">{totals.count}</span>
              </div>
              {totals.faltasCount > 0 && (
                <div className="flex justify-between">
                  <span>Sin pago (faltas):</span>
                  <span className="font-medium text-red-600">{totals.faltasCount}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Total cobrado:</span>
                <span className="font-medium">{formatCurrency(totals.total)}</span>
              </div>
              <div className="flex justify-between">
                <span>Comisiones:</span>
                <span className="font-medium text-purple-600">{formatCurrency(totals.commission)}</span>
              </div>
              <div className="flex justify-between">
                <span>Efectivo final:</span>
                <span className="font-medium text-green-600">{formatCurrency(adjustedCash)}</span>
              </div>
              <div className="flex justify-between">
                <span>Banco final:</span>
                <span className="font-medium text-blue-600">{formatCurrency(adjustedBank)}</span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isSubmitting || exceedsCash}
            className="gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Confirmar y Guardar
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
