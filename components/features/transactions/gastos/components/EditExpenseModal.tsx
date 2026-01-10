'use client'

import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ExpenseTypeCombobox } from './ExpenseTypeCombobox'
import type { Expense, Account } from '../types'

interface EditExpenseModalProps {
  expense: Expense | null
  open: boolean
  onOpenChange: (open: boolean) => void
  accounts: Account[]
  onSave: (id: string, data: { amount?: string; expenseSource?: string; sourceAccountId?: string }) => Promise<void>
  isSaving: boolean
}

export function EditExpenseModal({
  expense,
  open,
  onOpenChange,
  accounts,
  onSave,
  isSaving,
}: EditExpenseModalProps) {
  const [amount, setAmount] = useState('')
  const [expenseSource, setExpenseSource] = useState('')
  const [sourceAccountId, setSourceAccountId] = useState('')

  useEffect(() => {
    if (expense) {
      setAmount(expense.amount)
      setExpenseSource(expense.expenseSource || '')
      setSourceAccountId(expense.sourceAccount?.id || '')
    }
  }, [expense])

  const handleSave = async () => {
    if (!expense) return

    const updates: { amount?: string; expenseSource?: string; sourceAccountId?: string } = {}

    if (amount !== expense.amount) {
      updates.amount = amount
    }
    if (expenseSource !== expense.expenseSource) {
      updates.expenseSource = expenseSource
    }
    if (sourceAccountId !== expense.sourceAccount?.id) {
      updates.sourceAccountId = sourceAccountId
    }

    // Only update if there are changes
    if (Object.keys(updates).length > 0) {
      await onSave(expense.id, updates)
    }

    onOpenChange(false)
  }

  if (!expense) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Editar Gasto</DialogTitle>
          <DialogDescription>
            Modifica los detalles del gasto. El saldo de la cuenta sera recalculado automaticamente.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="expenseSource">Tipo de Gasto</Label>
            <ExpenseTypeCombobox
              value={expenseSource}
              onValueChange={setExpenseSource}
              placeholder="Seleccionar tipo"
              className="w-full"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="amount">Monto</Label>
            <Input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onWheel={(e) => e.currentTarget.blur()}
              placeholder="0.00"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="account">Cuenta</Label>
            <Select value={sourceAccountId} onValueChange={setSourceAccountId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar cuenta" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              'Guardar'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
