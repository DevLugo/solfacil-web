'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { LoanType } from '../../types'

interface LoanTypeAmountFieldsProps {
  loanTypes: LoanType[]
  selectedLoanTypeId: string
  onLoanTypeChange: (value: string) => void
  requestedAmount: string
  onRequestedAmountChange: (value: string) => void
  comissionAmount: string
  onComissionChange: (value: string) => void
}

export function LoanTypeAmountFields({
  loanTypes,
  selectedLoanTypeId,
  onLoanTypeChange,
  requestedAmount,
  onRequestedAmountChange,
  comissionAmount,
  onComissionChange,
}: LoanTypeAmountFieldsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      <div className="space-y-1.5">
        <Label className="text-sm">Tipo de préstamo</Label>
        <Select value={selectedLoanTypeId} onValueChange={onLoanTypeChange}>
          <SelectTrigger className="h-10">
            <SelectValue placeholder="Seleccionar..." />
          </SelectTrigger>
          <SelectContent>
            {loanTypes.map((lt) => (
              <SelectItem key={lt.id} value={lt.id} className="py-2">
                {lt.name} ({lt.weekDuration}sem, {lt.rate}%)
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label className="text-sm">Monto solicitado</Label>
        <Input
          type="number"
          inputMode="decimal"
          value={requestedAmount}
          onChange={(e) => onRequestedAmountChange(e.target.value)}
          placeholder="0.00"
          className="h-10"
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-sm">Comisión</Label>
        <Input
          type="number"
          inputMode="decimal"
          value={comissionAmount}
          onChange={(e) => onComissionChange(e.target.value)}
          placeholder="0"
          className="h-10"
        />
      </div>
    </div>
  )
}
