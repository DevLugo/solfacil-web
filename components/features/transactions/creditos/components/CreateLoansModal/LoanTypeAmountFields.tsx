'use client'

import { useState, useEffect } from 'react'
import { Minus, Plus } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import type { LoanType } from '../../types'

// Preset amounts for quick selection
const PRESET_AMOUNTS = [3000, 3500, 4000]
const AMOUNT_STEP = 500

// CSS classes to hide number input spinners
const noSpinnerClass = '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'

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
  const currentAmount = parseFloat(requestedAmount) || 0
  const isPresetAmount = PRESET_AMOUNTS.includes(currentAmount)
  const [isCustomMode, setIsCustomMode] = useState(!isPresetAmount && currentAmount > 0)

  // Update custom mode when amount changes externally
  useEffect(() => {
    if (currentAmount > 0) {
      setIsCustomMode(!PRESET_AMOUNTS.includes(currentAmount))
    }
  }, [currentAmount])

  const handlePresetSelect = (amount: number) => {
    setIsCustomMode(false)
    onRequestedAmountChange(amount.toString())
  }

  const handleCustomSelect = () => {
    setIsCustomMode(true)
    // Start with the highest preset if no amount is set
    if (currentAmount === 0) {
      onRequestedAmountChange(PRESET_AMOUNTS[PRESET_AMOUNTS.length - 1].toString())
    }
  }

  const handleIncrement = () => {
    const newAmount = currentAmount + AMOUNT_STEP
    onRequestedAmountChange(newAmount.toString())
  }

  const handleDecrement = () => {
    const newAmount = Math.max(AMOUNT_STEP, currentAmount - AMOUNT_STEP)
    onRequestedAmountChange(newAmount.toString())
  }

  return (
    <div className="space-y-3">
      {/* Loan type selector */}
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

      {/* Amount selection with presets */}
      <div className="space-y-1.5">
        <Label className="text-sm">Monto solicitado</Label>
        <div className="flex flex-wrap gap-2">
          {/* Preset amount buttons */}
          {PRESET_AMOUNTS.map((amount) => (
            <Button
              key={amount}
              type="button"
              variant={currentAmount === amount && !isCustomMode ? 'default' : 'outline'}
              size="sm"
              onClick={() => handlePresetSelect(amount)}
              className={cn(
                'h-10 px-4 font-medium min-w-[70px]',
                currentAmount === amount && !isCustomMode && 'ring-2 ring-primary ring-offset-1'
              )}
            >
              ${amount.toLocaleString()}
            </Button>
          ))}

          {/* Custom amount button */}
          <Button
            type="button"
            variant={isCustomMode ? 'default' : 'outline'}
            size="sm"
            onClick={handleCustomSelect}
            className={cn(
              'h-10 px-4 font-medium',
              isCustomMode && 'ring-2 ring-primary ring-offset-1'
            )}
          >
            Otro
          </Button>
        </div>

        {/* Custom amount controls */}
        {isCustomMode && (
          <div className="flex items-center gap-2 mt-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleDecrement}
              disabled={currentAmount <= AMOUNT_STEP}
              className="h-10 w-10 shrink-0"
            >
              <Minus className="h-4 w-4" />
            </Button>
            <Input
              type="number"
              inputMode="decimal"
              value={requestedAmount}
              onChange={(e) => onRequestedAmountChange(e.target.value)}
              placeholder="0.00"
              className={cn('h-10 text-center font-medium', noSpinnerClass)}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleIncrement}
              className="h-10 w-10 shrink-0"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Show selected amount if preset */}
        {!isCustomMode && currentAmount > 0 && (
          <p className="text-sm text-muted-foreground mt-1">
            Monto: <span className="font-medium text-foreground">${currentAmount.toLocaleString()}</span>
          </p>
        )}
      </div>

      {/* Commission field */}
      <div className="space-y-1.5">
        <Label className="text-sm">Comisión</Label>
        <Input
          type="number"
          inputMode="decimal"
          value={comissionAmount}
          onChange={(e) => onComissionChange(e.target.value)}
          placeholder="0"
          className={cn('h-10', noSpinnerClass)}
        />
      </div>
    </div>
  )
}
