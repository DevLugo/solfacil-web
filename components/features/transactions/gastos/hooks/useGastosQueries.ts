'use client'

import { useQuery, useMutation } from '@apollo/client'
import { startOfDay, endOfDay } from 'date-fns'
import {
  EXPENSES_BY_DATE_QUERY,
  ACCOUNTS_QUERY,
} from '@/graphql/queries/transactions'
import {
  CREATE_TRANSACTION,
  UPDATE_TRANSACTION,
  DELETE_TRANSACTION,
} from '@/graphql/mutations/transactions'
import type { Expense, Account } from '../types'

interface UseGastosQueriesOptions {
  selectedRouteId: string | null
  selectedDate: Date
}

interface TransactionEdge {
  node: Expense
}

export function useGastosQueries({ selectedRouteId, selectedDate }: UseGastosQueriesOptions) {
  // Query para obtener los gastos del dia
  const {
    data: expensesData,
    loading: expensesLoading,
    refetch: refetchExpenses,
  } = useQuery(EXPENSES_BY_DATE_QUERY, {
    variables: {
      fromDate: startOfDay(selectedDate).toISOString(),
      toDate: endOfDay(selectedDate).toISOString(),
      routeId: selectedRouteId,
    },
    skip: !selectedRouteId,
    fetchPolicy: 'cache-and-network',
  })

  // Query para obtener las cuentas de la ruta
  const {
    data: accountsData,
    loading: accountsLoading,
    refetch: refetchAccounts,
  } = useQuery(ACCOUNTS_QUERY, {
    variables: { routeId: selectedRouteId },
    skip: !selectedRouteId,
    fetchPolicy: 'cache-and-network',
  })

  // Mutations
  const [createTransaction, { loading: isCreating }] = useMutation(CREATE_TRANSACTION)
  const [updateTransaction, { loading: isUpdating }] = useMutation(UPDATE_TRANSACTION)
  const [deleteTransaction, { loading: isDeleting }] = useMutation(DELETE_TRANSACTION)

  const expenses: Expense[] =
    expensesData?.transactions?.edges?.map((edge: TransactionEdge) => edge.node) || []

  const accounts: Account[] = accountsData?.accounts || []

  // Helper function to refetch all data
  const refetchAll = async () => {
    await Promise.all([refetchExpenses(), refetchAccounts()])
  }

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
