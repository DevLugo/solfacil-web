'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import type { PendingLoan } from '../../types'

// CSS classes to hide number input spinners
const noSpinnerClass = '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'

interface GlobalCommissionControlProps {
  globalComissionAmount: string
  onGlobalComissionChange: (value: string) => void
  globalFirstPaymentComission: string
  onGlobalFirstPaymentComissionChange: (value: string) => void
  pendingLoans: PendingLoan[]
  onApply: () => void
}

export function GlobalCommissionControl({
  globalComissionAmount,
  onGlobalComissionChange,
  globalFirstPaymentComission,
  onGlobalFirstPaymentComissionChange,
  pendingLoans,
  onApply,
}: GlobalCommissionControlProps) {
  if (pendingLoans.length === 0) return null

  const hasFirstPaymentLoans = pendingLoans.some((loan) => loan.firstPayment)
  const hasAnyValue = !!globalComissionAmount || !!globalFirstPaymentComission

  return (
    <div className="p-2.5 rounded-lg bg-muted/30 border space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold">Comisiones globales</Label>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs px-3"
          onClick={onApply}
          disabled={!hasAnyValue}
        >
          Aplicar
        </Button>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <Label className="text-[11px] text-muted-foreground whitespace-nowrap">Por crédito</Label>
          <Input
            type="number"
            inputMode="decimal"
            value={globalComissionAmount}
            onChange={(e) => onGlobalComissionChange(e.target.value)}
            onWheel={(e) => e.currentTarget.blur()}
            placeholder="0"
            className={cn('h-7 w-20 text-sm', noSpinnerClass)}
          />
        </div>
        {hasFirstPaymentLoans && (
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <Label className="text-[11px] text-muted-foreground whitespace-nowrap">Primer pago</Label>
            <Input
              type="number"
              inputMode="decimal"
              value={globalFirstPaymentComission}
              onChange={(e) => onGlobalFirstPaymentComissionChange(e.target.value)}
              onWheel={(e) => e.currentTarget.blur()}
              placeholder="0"
              className={cn('h-7 w-20 text-sm', noSpinnerClass)}
            />
          </div>
        )}
      </div>
    </div>
  )
}
