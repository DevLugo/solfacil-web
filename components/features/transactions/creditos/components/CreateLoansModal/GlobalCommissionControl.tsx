'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { PendingLoan } from '../../types'

interface GlobalCommissionControlProps {
  globalComissionAmount: string
  onGlobalComissionChange: (value: string) => void
  pendingLoans: PendingLoan[]
  onApply: () => void
}

export function GlobalCommissionControl({
  globalComissionAmount,
  onGlobalComissionChange,
  pendingLoans,
  onApply,
}: GlobalCommissionControlProps) {
  if (pendingLoans.length === 0) return null

  return (
    <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 border">
      <Label className="text-xs whitespace-nowrap">Comisión global:</Label>
      <Input
        type="number"
        inputMode="decimal"
        value={globalComissionAmount}
        onChange={(e) => onGlobalComissionChange(e.target.value)}
        placeholder="0"
        className="h-8 w-20 text-sm"
      />
      <Button
        variant="outline"
        size="sm"
        className="h-8 text-xs"
        onClick={onApply}
        disabled={!globalComissionAmount}
      >
        Aplicar
      </Button>
    </div>
  )
}
