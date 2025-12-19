'use client'

import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { TableCell, TableRow } from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { EXPENSE_TYPES, EXPENSE_TO_ACCOUNT_TYPE } from '../constants'
import type { NewExpense, Account } from '../types'

interface NewExpenseRowProps {
  expense: NewExpense
  index: number
  accounts: Account[]
  onUpdate: (index: number, field: keyof NewExpense, value: string) => void
  onRemove: (index: number) => void
}

export function NewExpenseRow({
  expense,
  index,
  accounts,
  onUpdate,
  onRemove,
}: NewExpenseRowProps) {
  const handleExpenseTypeChange = (value: string) => {
    onUpdate(index, 'expenseSource', value)

    // Auto-seleccionar cuenta basada en el tipo de gasto
    const preferredAccountType = EXPENSE_TO_ACCOUNT_TYPE[value]
    if (preferredAccountType) {
      const preferredAccount = accounts.find((acc) => acc.type === preferredAccountType)
      if (preferredAccount) {
        onUpdate(index, 'sourceAccountId', preferredAccount.id)
      }
    }
  }

  return (
    <TableRow className="bg-amber-50/50 dark:bg-amber-950/20">
      <TableCell>
        <Select value={expense.expenseSource} onValueChange={handleExpenseTypeChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Tipo de gasto" />
          </SelectTrigger>
          <SelectContent>
            {EXPENSE_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                <div className="flex items-center gap-2">
                  <type.icon className="h-4 w-4" />
                  {type.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <Input
          type="number"
          placeholder="0"
          value={expense.amount}
          onChange={(e) => onUpdate(index, 'amount', e.target.value)}
          className="w-[120px]"
        />
      </TableCell>
      <TableCell>
        <Select
          value={expense.sourceAccountId}
          onValueChange={(value) => onUpdate(index, 'sourceAccountId', value)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Cuenta" />
          </SelectTrigger>
          <SelectContent>
            {accounts.map((account) => (
              <SelectItem key={account.id} value={account.id}>
                {account.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <Badge
          variant="outline"
          className="bg-amber-100 text-amber-700 border-amber-300"
        >
          Pendiente
        </Badge>
      </TableCell>
      <TableCell>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive"
          onClick={() => onRemove(index)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </TableCell>
    </TableRow>
  )
}
