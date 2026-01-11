'use client'

import { useMemo } from 'react'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TableCell, TableRow } from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ExpenseTypeCombobox } from './ExpenseTypeCombobox'
import { EXPENSE_TO_ACCOUNT_TYPE, EXPENSE_ALLOWED_ACCOUNT_TYPES, DEFAULT_VISIBLE_ACCOUNT_TYPES } from '../constants'
import type { NewExpense, Account, AccountType } from '../types'

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
  // Filter accounts based on selected expense type
  const filteredAccounts = useMemo(() => {
    if (!expense.expenseSource) {
      // No expense type selected, show all accounts
      return accounts
    }

    const allowedTypes = EXPENSE_ALLOWED_ACCOUNT_TYPES[expense.expenseSource]
    if (!allowedTypes) {
      // No specific filter for this expense type, show default visible types
      return accounts.filter((acc) =>
        DEFAULT_VISIBLE_ACCOUNT_TYPES.includes(acc.type as AccountType)
      )
    }

    // Filter to only allowed account types for this expense
    return accounts.filter((acc) => allowedTypes.includes(acc.type as AccountType))
  }, [accounts, expense.expenseSource])

  const handleExpenseTypeChange = (value: string) => {
    onUpdate(index, 'expenseSource', value)

    // Get allowed accounts for this expense type
    const allowedTypes = EXPENSE_ALLOWED_ACCOUNT_TYPES[value]
    const allowedAccounts = allowedTypes
      ? accounts.filter((acc) => allowedTypes.includes(acc.type as AccountType))
      : accounts

    // Auto-seleccionar cuenta basada en el tipo de gasto
    // Prioridad: cuenta preferida → EMPLOYEE_CASH_FUND → primera cuenta disponible
    const preferredAccountType = EXPENSE_TO_ACCOUNT_TYPE[value]
    const preferredAccount = preferredAccountType
      ? allowedAccounts.find((acc) => acc.type === preferredAccountType)
      : null
    const fallbackAccount = allowedAccounts.find((acc) => acc.type === 'EMPLOYEE_CASH_FUND')
    const selectedAccount = preferredAccount || fallbackAccount || allowedAccounts[0]

    if (selectedAccount) {
      onUpdate(index, 'sourceAccountId', selectedAccount.id)
    }
  }

  return (
    <TableRow className="bg-amber-50/50 dark:bg-amber-950/20">
      <TableCell>
        <ExpenseTypeCombobox
          value={expense.expenseSource}
          onValueChange={handleExpenseTypeChange}
          placeholder="Tipo de gasto"
        />
      </TableCell>
      <TableCell>
        <Input
          type="number"
          placeholder="0"
          value={expense.amount}
          onChange={(e) => onUpdate(index, 'amount', e.target.value)}
          onWheel={(e) => e.currentTarget.blur()}
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
            {filteredAccounts.map((account) => (
              <SelectItem key={account.id} value={account.id}>
                {account.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <Input
          type="text"
          placeholder="Observaciones..."
          value={expense.observaciones || ''}
          onChange={(e) => onUpdate(index, 'observaciones', e.target.value.toUpperCase())}
          className="w-full uppercase"
        />
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
