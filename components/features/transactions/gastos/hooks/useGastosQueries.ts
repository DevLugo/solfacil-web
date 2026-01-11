'use client'

import { useQuery, useMutation } from '@apollo/client'
import { startOfDay, endOfDay } from 'date-fns'
import {
  EXPENSES_BY_DATE_QUERY,
  ALL_EXPENSES_BY_DATE_QUERY,
  ACCOUNTS_QUERY,
} from '@/graphql/queries/transactions'
import {
  CREATE_TRANSACTION,
  UPDATE_TRANSACTION,
  DELETE_TRANSACTION,
} from '@/graphql/mutations/transactions'
import { useDateChangeRefetch } from '@/hooks/use-date-change-refetch'
import type { Expense, Account } from '../types'

interface UseGastosQueriesOptions {
  selectedRouteId: string | null
  selectedLeadId: string | null
  selectedDate: Date
  showAllExpenses?: boolean
}

interface TransactionEdge {
  node: Expense
}

export function useGastosQueries({ selectedRouteId, selectedLeadId, selectedDate, showAllExpenses = false }: UseGastosQueriesOptions) {
  // Query para obtener los gastos del dia (filtrado por ruta)
  const {
    data: expensesData,
    loading: expensesLoadingRaw,
    refetch: refetchExpenses,
  } = useQuery(EXPENSES_BY_DATE_QUERY, {
    variables: {
      fromDate: startOfDay(selectedDate).toISOString(),
      toDate: endOfDay(selectedDate).toISOString(),
      routeId: selectedRouteId,
      leadId: selectedLeadId || undefined,
    },
    skip: !selectedRouteId || showAllExpenses,
    fetchPolicy: 'network-only',
    notifyOnNetworkStatusChange: true,
  })

  // Query para ver TODOS los gastos (sin filtro de ruta) - temporal para limpiar huérfanos
  const {
    data: allExpensesData,
    loading: allExpensesLoading,
    refetch: refetchAllExpenses,
  } = useQuery(ALL_EXPENSES_BY_DATE_QUERY, {
    variables: {
      fromDate: startOfDay(selectedDate).toISOString(),
      toDate: endOfDay(selectedDate).toISOString(),
    },
    skip: !showAllExpenses,
    fetchPolicy: 'network-only',
    notifyOnNetworkStatusChange: true,
  })

  // Query para obtener las cuentas de la ruta
  const {
    data: accountsData,
    loading: accountsLoading,
    refetch: refetchAccounts,
  } = useQuery(ACCOUNTS_QUERY, {
    variables: { routeId: selectedRouteId },
    skip: !selectedRouteId,
    fetchPolicy: 'network-only',
  })

  // Mutations
  const [createTransaction, { loading: isCreating }] = useMutation(CREATE_TRANSACTION)
  const [updateTransaction, { loading: isUpdating }] = useMutation(UPDATE_TRANSACTION)
  const [deleteTransaction, { loading: isDeleting }] = useMutation(DELETE_TRANSACTION)

  // Expense sources that are automatically created by the system (shown in other tabs)
  // These should NOT appear in the Gastos tab
  const AUTOMATIC_EXPENSE_SOURCES = [
    'LOAN_GRANTED',              // Desembolso del préstamo (tab Créditos)
    'LOAN_GRANTED_COMISSION',    // Comisión por otorgar crédito (tab Créditos)
    'LOAN_PAYMENT_COMISSION',    // Comisión de pago recibido (tab Abonos)
    'LOAN_CANCELLED_ADJUSTMENT', // Ajuste por cancelación (tab Créditos)
    'LOAN_CANCELLED_BANK_REVERSAL', // Reversión bancaria por cancelación
  ]

  // Select the correct data source based on showAllExpenses flag
  const rawExpensesData = showAllExpenses ? allExpensesData : expensesData

  // Filter out automatic expenses - only show manual expenses
  const rawExpenses: Expense[] =
    rawExpensesData?.transactions?.edges?.map((edge: TransactionEdge) => edge.node) || []

  const expenses: Expense[] = rawExpenses.filter(
    (expense) => !AUTOMATIC_EXPENSE_SOURCES.includes(expense.expenseSource || '')
  )

  const accounts: Account[] = accountsData?.accounts || []

  // Helper function to refetch all data
  const refetchAll = async () => {
    if (showAllExpenses) {
      await Promise.all([refetchAllExpenses(), refetchAccounts()])
    } else {
      await Promise.all([refetchExpenses(), refetchAccounts()])
    }
  }

  // Handle date change refetch
  const { isRefetching } = useDateChangeRefetch({
    selectedDate,
    enabled: showAllExpenses || !!selectedRouteId,
    refetchFn: showAllExpenses ? refetchAllExpenses : refetchExpenses,
  })

  // Combine loading states
  const expensesLoading = expensesLoadingRaw || allExpensesLoading || isRefetching

  return {
    expenses,
    accounts,
    expensesLoading,
    accountsLoading,
    isCreating,
    isUpdating,
    isDeleting,
    refetchExpenses,
    refetchAccounts,
    refetchAll,
    createTransaction,
    updateTransaction,
    deleteTransaction,
  }
}
