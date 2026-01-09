'use client'

import { Info, RefreshCw } from 'lucide-react'
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
  autoUpdated?: boolean
}

export function FirstPaymentControl({
  includeFirstPayment,
  onIncludeChange,
  firstPaymentAmount,
  onAmountChange,
  firstPaymentComission,
  onComissionChange,
  autoUpdated = false,
}: FirstPaymentControlProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <Switch
          checked={includeFirstPayment}
          onCheckedChange={onIncludeChange}
          className="scale-90"
        />
        <Label className="text-xs flex-shrink-0">Primer pago</Label>
        {includeFirstPayment && (
          <>
            <div className="relative flex-1">
              <Input
                type="number"
                inputMode="decimal"
                value={firstPaymentAmount}
                onChange={(e) => onAmountChange(e.target.value)}
                onWheel={(e) => e.currentTarget.blur()}
                placeholder="Monto"
                className={cn(
                  'h-8 text-sm transition-all duration-300',
                  noSpinnerClass,
                  autoUpdated && 'ring-2 ring-primary ring-offset-1 bg-primary/5'
                )}
              />
              {autoUpdated && (
                <RefreshCw className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-primary animate-spin" />
              )}
            </div>
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
      {/* Auto-update notification */}
      {autoUpdated && (
        <p className="text-xs text-primary ml-9 animate-pulse">
          Monto actualizado automáticamente
        </p>
      )}
    </div>
  )
}
