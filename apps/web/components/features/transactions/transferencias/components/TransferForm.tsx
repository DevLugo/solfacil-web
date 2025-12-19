'use client'

import { Loader2, ArrowRight, TrendingUp, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatCurrency } from '@/lib/utils'
import type { Account } from '../types'

interface TransferFormProps {
  // Form data
  isCapitalInvestment: boolean
  sourceAccountId: string
  destinationAccountId: string
  amount: string
  description: string
  // Setters
  onIsCapitalInvestmentChange: (value: boolean) => void
  onSourceAccountIdChange: (value: string) => void
  onDestinationAccountIdChange: (value: string) => void
  onAmountChange: (value: string) => void
  onDescriptionChange: (value: string) => void
  // State
  isSubmitting: boolean
  isAmountValid: boolean
  isFormValid: boolean
  availableBalance: number
  // Options
  accounts: Account[]
  destinationOptions: Account[]
  sourceAccount: Account | undefined
  // Actions
  onSubmit: () => void
}

export function TransferForm({
  isCapitalInvestment,
  sourceAccountId,
  destinationAccountId,
  amount,
  description,
  onIsCapitalInvestmentChange,
  onSourceAccountIdChange,
  onDestinationAccountIdChange,
  onAmountChange,
  onDescriptionChange,
  isSubmitting,
  isAmountValid,
  isFormValid,
  availableBalance,
  accounts,
  destinationOptions,
  sourceAccount,
  onSubmit,
}: TransferFormProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {isCapitalInvestment ? 'Inversion de Capital' : 'Transferencia entre Cuentas'}
        </CardTitle>
        <CardDescription>
          {isCapitalInvestment
            ? 'Registra una inversion de capital externo al sistema'
            : 'Transfiere fondos entre las cuentas de la ruta'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Capital Investment Checkbox */}
        <div className="flex items-center space-x-2">
          <Checkbox
            id="capital-investment"
            checked={isCapitalInvestment}
            onCheckedChange={(checked) => onIsCapitalInvestmentChange(checked === true)}
            disabled={isSubmitting}
          />
          <div className="grid gap-1.5 leading-none">
            <Label htmlFor="capital-investment" className="cursor-pointer">
              Inversion de Capital
            </Label>
            <p className="text-sm text-muted-foreground">
              El dinero ingresa al sistema desde una fuente externa
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Source Account (only for transfers) */}
          {!isCapitalInvestment && (
            <div className="space-y-2">
              <Label>Cuenta de Origen</Label>
              <Select
                value={sourceAccountId}
                onValueChange={onSourceAccountIdChange}
                disabled={isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar cuenta origen" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name} ({formatCurrency(parseFloat(account.amount))})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Destination Account */}
          <div className="space-y-2">
            <Label>Cuenta de Destino</Label>
            <Select
              value={destinationAccountId}
              onValueChange={onDestinationAccountIdChange}
              disabled={(!sourceAccountId && !isCapitalInvestment) || isSubmitting}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar cuenta destino" />
              </SelectTrigger>
              <SelectContent>
                {destinationOptions.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name} ({formatCurrency(parseFloat(account.amount))})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Amount */}
          <div className="space-y-2">
            <Label>{isCapitalInvestment ? 'Monto de Inversion' : 'Monto a Transferir'}</Label>
            <Input
              type="number"
              placeholder="0"
              value={amount}
              onChange={(e) => onAmountChange(e.target.value)}
              disabled={
                (!sourceAccountId && !isCapitalInvestment) || !destinationAccountId || isSubmitting
              }
              className={!isAmountValid ? 'border-destructive' : ''}
            />
            {!isCapitalInvestment && sourceAccount && (
              <p className="text-sm text-muted-foreground">
                Saldo disponible: {formatCurrency(availableBalance)}
              </p>
            )}
            {!isAmountValid && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                Monto excede el saldo disponible
              </p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>Descripcion (Opcional)</Label>
            <Input
              placeholder={
                isCapitalInvestment
                  ? 'Descripcion de la inversion'
                  : 'Descripcion de la transferencia'
              }
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
              disabled={isSubmitting}
            />
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <Button onClick={onSubmit} disabled={!isFormValid || isSubmitting} className="gap-2">
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isCapitalInvestment ? (
              <TrendingUp className="h-4 w-4" />
            ) : (
              <ArrowRight className="h-4 w-4" />
            )}
            {isSubmitting
              ? 'Procesando...'
              : isCapitalInvestment
                ? 'Realizar Inversion'
                : 'Realizar Transferencia'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
