'use client'

import { useQuery } from '@apollo/client'
import { startOfDay, endOfDay } from 'date-fns'
import { ACCOUNTS_QUERY, TRANSFERS_AND_INVESTMENTS_BY_DATE_QUERY } from '@/graphql/queries/transactions'
import type { Account, Transfer } from '../types'
import { INCOME_SOURCES } from '../constants'

interface UseTransferQueriesParams {
  selectedRouteId: string | null
  selectedDate: Date
}

interface UseTransferQueriesResult {
  transfers: Transfer[]
  accounts: Account[]
  transfersLoading: boolean
  accountsLoading: boolean
  refetchTransfers: () => void
  refetchAccounts: () => void
  refetchAll: () => Promise<void>
}

export function useTransferQueries({
  selectedRouteId,
  selectedDate,
}: UseTransferQueriesParams): UseTransferQueriesResult {
  // Query para obtener transfers e inversiones del día
  const {
    data: transfersData,
    loading: transfersLoading,
    refetch: refetchTransfers,
  } = useQuery(TRANSFERS_AND_INVESTMENTS_BY_DATE_QUERY, {
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

  // Refetch all data after a mutation (only if route is selected)
  const refetchAll = async () => {
    if (selectedRouteId) {
      await Promise.all([refetchTransfers(), refetchAccounts()])
    }
  }

  // Combine transfers and capital investments (MONEY_INVESTMENT only)
  const transfersList: Transfer[] =
    transfersData?.transfers?.edges?.map((edge: { node: Transfer }) => edge.node) || []

  // Filter investments to only show MONEY_INVESTMENT (capital investments)
  const investmentsList: Transfer[] = (
    transfersData?.investments?.edges?.map((edge: { node: Transfer }) => edge.node) || []
  ).filter((t: Transfer) => t.incomeSource === INCOME_SOURCES.MONEY_INVESTMENT)

  // Merge and sort by date (most recent first)
  const transfers: Transfer[] = [...transfersList, ...investmentsList].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )

  const accounts: Account[] = accountsData?.accounts || []

  return {
    transfers,
    accounts,
    transfersLoading,
    accountsLoading,
    refetchTransfers,
    refetchAccounts,
    refetchAll,
  }
}
