'use client'

import { Info } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

// CSS classes to hide number input spinners
const noSpinnerClass = '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'

interface FirstPaymentControlProps {
  includeFirstPayment: boolean
  onIncludeChange: (value: boolean) => void
  firstPaymentAmount: string
  onAmountChange: (value: string) => void
  firstPaymentComission: string
  onComissionChange: (value: string) => void
}

export function FirstPaymentControl({
  includeFirstPayment,
  onIncludeChange,
  firstPaymentAmount,
  onAmountChange,
  firstPaymentComission,
  onComissionChange,
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
        <>
          <Input
            type="number"
            inputMode="decimal"
            value={firstPaymentAmount}
            onChange={(e) => onAmountChange(e.target.value)}
            onWheel={(e) => e.currentTarget.blur()}
            placeholder="Monto"
            className={cn('h-8 text-sm flex-1', noSpinnerClass)}
          />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    inputMode="decimal"
                    value={firstPaymentComission}
                    onChange={(e) => onComissionChange(e.target.value)}
                    onWheel={(e) => e.currentTarget.blur()}
                    className={cn('h-8 text-sm w-14', noSpinnerClass)}
                  />
                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p className="text-xs">Comisión para la líder</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </>
      )}
    </div>
  )
}
