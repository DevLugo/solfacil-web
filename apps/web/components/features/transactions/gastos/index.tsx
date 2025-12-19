'use client'

import { useState, useMemo } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { MapPin, Banknote, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import { useTransactionContext } from '../transaction-context'
import { EmptyState, ConfirmDeleteDialog } from '../shared'
import {
  KPIBar,
  ExpenseRow,
  NewExpenseRow,
  AccountBalances,
  EditExpenseModal,
  AccountTypeFilter,
  DistributedExpenseModal,
} from './components'
import { useGastosQueries } from './hooks'
import { DEFAULT_VISIBLE_ACCOUNT_TYPES } from './constants'
import type { Expense, NewExpense, ExpenseTotals, AccountType } from './types'

function LoadingState() {
  return (
    <div className="space-y-6">
      {/* KPI Bar Skeleton */}
      <div className="flex flex-wrap items-center gap-3 p-4 bg-muted/50 rounded-lg border">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-6 w-28" />
        <div className="ml-auto flex items-center gap-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-8 w-24" />
        </div>
      </div>

      {/* Filter Skeleton */}
      <div className="flex justify-end">
        <Skeleton className="h-6 w-40" />
      </div>

      {/* Table Skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40 mb-2" />
          <Skeleton className="h-4 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Header */}
            <div className="flex gap-4 py-2 border-b">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-8" />
            </div>
            {/* Rows */}
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4 py-3">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-6 w-24 rounded-full" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-8" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Account Balances Skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 p-3 border rounded-lg">
                <Skeleton className="h-8 w-8 rounded" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-24 mb-1" />
                  <Skeleton className="h-5 w-16" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export function GastosTab() {
  const { selectedRouteId, selectedDate, selectedLeadId } = useTransactionContext()
  const { toast } = useToast()

  // Local state
  const [newExpenses, setNewExpenses] = useState<NewExpense[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [expenseToDelete, setExpenseToDelete] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [expenseToEdit, setExpenseToEdit] = useState<Expense | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [showExtraAccountTypes, setShowExtraAccountTypes] = useState(false)
  const [distributedModalOpen, setDistributedModalOpen] = useState(false)
  const [isDistributedSaving, setIsDistributedSaving] = useState(false)

  // Queries and mutations
  const {
    expenses,
    accounts,
    expensesLoading,
    refetchAll,
    createTransaction,
    updateTransaction,
    deleteTransaction,
  } = useGastosQueries({
    selectedRouteId,
    selectedDate,
  })

  // Filtrar gastos por lider si esta seleccionado
  const filteredExpenses = selectedLeadId
    ? expenses.filter((e) => e.lead?.id === selectedLeadId)
    : expenses

  // Filter accounts based on toggle
  const filteredAccounts = useMemo(() => {
    if (showExtraAccountTypes) {
      return accounts
    }
    return accounts.filter((acc) =>
      DEFAULT_VISIBLE_ACCOUNT_TYPES.includes(acc.type as AccountType)
    )
  }, [accounts, showExtraAccountTypes])

  // Calcular totales
  const totals: ExpenseTotals = useMemo(() => {
    const existingTotal = filteredExpenses.reduce(
      (sum, e) => sum + parseFloat(e.amount || '0'),
      0
    )
    const newTotal = newExpenses.reduce(
      (sum, e) => sum + parseFloat(e.amount || '0'),
      0
    )
    return {
      existing: existingTotal,
      new: newTotal,
      total: existingTotal + newTotal,
    }
  }, [filteredExpenses, newExpenses])

  // Handlers
  const handleAddExpense = () => {
    const defaultAccount = accounts.find((acc) => acc.type === 'EMPLOYEE_CASH_FUND')
    setNewExpenses([
      ...newExpenses,
      {
        amount: '',
        expenseSource: '',
        description: '',
        sourceAccountId: defaultAccount?.id || '',
      },
    ])
  }

  const handleUpdateNewExpense = (
    index: number,
    field: keyof NewExpense,
    value: string
  ) => {
    const updated = [...newExpenses]
    updated[index] = { ...updated[index], [field]: value }
    setNewExpenses(updated)
  }

  const handleRemoveNewExpense = (index: number) => {
    setNewExpenses(newExpenses.filter((_, i) => i !== index))
  }

  const handleSaveAll = async () => {
    const validExpenses = newExpenses.filter(
      (e) => e.amount && parseFloat(e.amount) > 0 && e.expenseSource && e.sourceAccountId
    )

    if (validExpenses.length === 0) {
      toast({
        title: 'Sin gastos validos',
        description: 'Agrega al menos un gasto con monto, tipo y cuenta.',
        variant: 'destructive',
      })
      return
    }

    setIsSaving(true)

    try {
      for (const expense of validExpenses) {
        await createTransaction({
          variables: {
            input: {
              amount: expense.amount,
              date: selectedDate.toISOString(),
              type: 'EXPENSE',
              expenseSource: expense.expenseSource,
              sourceAccountId: expense.sourceAccountId,
              routeId: selectedRouteId,
              leadId: selectedLeadId || undefined,
            },
          },
        })
      }

      toast({
        title: 'Gastos guardados',
        description: `Se guardaron ${validExpenses.length} gasto(s) correctamente.`,
      })

      setNewExpenses([])
      await refetchAll()
    } catch (error) {
      console.error('Error al guardar gastos:', error)
      toast({
        title: 'Error',
        description: 'No se pudieron guardar los gastos. Intenta de nuevo.',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleEditExpense = (expense: Expense) => {
    setExpenseToEdit(expense)
    setEditModalOpen(true)
  }

  const handleSaveEdit = async (
    id: string,
    data: { amount?: string; expenseSource?: string; sourceAccountId?: string }
  ) => {
    setIsUpdating(true)
    try {
      await updateTransaction({
        variables: {
          id,
          input: data,
        },
      })

      toast({
        title: 'Gasto actualizado',
        description: 'El gasto se actualizo correctamente.',
      })

      await refetchAll()
    } catch (error) {
      console.error('Error al actualizar gasto:', error)
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el gasto. Intenta de nuevo.',
        variant: 'destructive',
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDeleteExpense = (expenseId: string) => {
    setExpenseToDelete(expenseId)
    setDeleteDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!expenseToDelete) return

    setIsDeleting(true)
    try {
      await deleteTransaction({
        variables: {
          id: expenseToDelete,
        },
      })

      toast({
        title: 'Gasto eliminado',
        description: 'El gasto se elimino y el saldo de la cuenta fue restaurado.',
      })

      setDeleteDialogOpen(false)
      setExpenseToDelete(null)
      await refetchAll()
    } catch (error) {
      console.error('Error al eliminar gasto:', error)
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el gasto. Intenta de nuevo.',
        variant: 'destructive',
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleSaveDistributedExpenses = async (
    expenses: { routeId: string; accountId: string; amount: number }[],
    expenseSource: string
  ) => {
    setIsDistributedSaving(true)
    try {
      for (const expense of expenses) {
        await createTransaction({
          variables: {
            input: {
              amount: expense.amount.toString(),
              date: selectedDate.toISOString(),
              type: 'EXPENSE',
              expenseSource,
              sourceAccountId: expense.accountId,
              routeId: expense.routeId,
              leadId: selectedLeadId || undefined,
            },
          },
        })
      }

      toast({
        title: 'Gastos distribuidos',
        description: `Se crearon ${expenses.length} gastos en diferentes rutas.`,
      })

      await refetchAll()
    } catch (error) {
      console.error('Error al crear gastos distribuidos:', error)
      toast({
        title: 'Error',
        description: 'No se pudieron crear los gastos distribuidos.',
        variant: 'destructive',
      })
    } finally {
      setIsDistributedSaving(false)
    }
  }

  // Render states
  if (!selectedRouteId) {
    return (
      <EmptyState
        icon={MapPin}
        title="Selecciona una ruta"
        description="Selecciona una ruta para ver y registrar los gastos del dia"
      />
    )
  }

  if (expensesLoading) {
    return <LoadingState />
  }

  return (
    <div className="space-y-6">
      {/* KPI Bar */}
      <KPIBar
        totals={totals}
        expenseCount={filteredExpenses.length}
        newExpenseCount={newExpenses.length}
        onAddExpense={handleAddExpense}
        onAddDistributedExpense={() => setDistributedModalOpen(true)}
        onSaveAll={handleSaveAll}
        isSaving={isSaving}
      />

      {/* Account Type Filter */}
      <div className="flex justify-end">
        <AccountTypeFilter
          showExtraTypes={showExtraAccountTypes}
          onToggle={setShowExtraAccountTypes}
        />
      </div>

      {/* Gastos Table */}
      <Card>
        <CardHeader>
          <CardTitle>Gastos Registrados</CardTitle>
          <CardDescription>
            {filteredExpenses.length} gastos • {format(selectedDate, "d 'de' MMMM", { locale: es })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredExpenses.length === 0 && newExpenses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Banknote className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No hay gastos registrados para esta fecha</p>
              <Button variant="outline" className="mt-4" onClick={handleAddExpense}>
                <Plus className="h-4 w-4 mr-2" />
                Agregar primer gasto
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Cuenta</TableHead>
                  <TableHead>Lider</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExpenses.map((expense) => (
                  <ExpenseRow
                    key={expense.id}
                    expense={expense}
                    onEdit={handleEditExpense}
                    onDelete={handleDeleteExpense}
                  />
                ))}
                {newExpenses.map((expense, index) => (
                  <NewExpenseRow
                    key={`new-${index}`}
                    expense={expense}
                    index={index}
                    accounts={filteredAccounts}
                    onUpdate={handleUpdateNewExpense}
                    onRemove={handleRemoveNewExpense}
                  />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Account Balances */}
      <AccountBalances accounts={accounts} showExtraTypes={showExtraAccountTypes} />

      {/* Delete Confirmation Dialog */}
      <ConfirmDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Eliminar gasto?"
        description="Esta accion no se puede deshacer. El saldo de la cuenta sera restaurado."
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
      />

      {/* Edit Expense Modal */}
      <EditExpenseModal
        expense={expenseToEdit}
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        accounts={filteredAccounts}
        onSave={handleSaveEdit}
        isSaving={isUpdating}
      />

      {/* Distributed Expense Modal */}
      <DistributedExpenseModal
        open={distributedModalOpen}
        onOpenChange={setDistributedModalOpen}
        selectedDate={selectedDate}
        onSave={handleSaveDistributedExpenses}
        isSaving={isDistributedSaving}
      />
    </div>
  )
}
