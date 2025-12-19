'use client'

import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

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
    <div className="flex items-center gap-3">
      <Switch
        checked={includeFirstPayment}
        onCheckedChange={onIncludeChange}
      />
      <Label className="text-sm flex-shrink-0">Primer pago</Label>
      {includeFirstPayment && (
        <Input
          type="number"
          inputMode="decimal"
          value={firstPaymentAmount}
          onChange={(e) => onAmountChange(e.target.value)}
          placeholder="Monto"
          className="h-9 flex-1"
        />
      )}
    </div>
  )
}
