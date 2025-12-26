'use client'

import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

// CSS classes to hide number input spinners
const noSpinnerClass = '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'

interface FirstPaymentControlProps {
  includeFirstPayment: boolean
  onIncludeChange: (value: boolean) => void
  firstPaymentAmount: string
  onAmountChange: (value: string) => void
}

export function FirstPaymentControl({
  includeFirstPayment,
  onIncludeChange,
  firstPaymentAmount,
  onAmountChange,
}: FirstPaymentControlProps) {
  return (
    <div className="flex items-center gap-2">
      <Switch
        checked={includeFirstPayment}
        onCheckedChange={onIncludeChange}
        className="scale-90"
      />
      <Label className="text-xs flex-shrink-0">Primer pago</Label>
      {includeFirstPayment && (
        <Input
          type="number"
          inputMode="decimal"
          value={firstPaymentAmount}
          onChange={(e) => onAmountChange(e.target.value)}
          onWheel={(e) => e.currentTarget.blur()}
          placeholder="Monto"
          className={cn('h-8 text-sm flex-1', noSpinnerClass)}
        />
      )}
    </div>
  )
}
