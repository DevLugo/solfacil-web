'use client'

import { useQuery } from '@apollo/client'
import { useMemo } from 'react'
import {
  ROUTES_QUERY,
  ALL_TRANSACTIONS_BY_DATE_QUERY,
} from '@/graphql/queries/transactions'
import { createDateRange } from '../utils'
import type { Route, TransactionNode } from '../types'

interface UseSummaryQueriesParams {
  selectedDate: Date
  selectedRoute: Route | null
  refreshKey?: number
}

interface UseSummaryQueriesReturn {
  transactions: TransactionNode[]
  totalCount: number
  loading: boolean
  error: Error | undefined
  refetch: () => void
}

export function useSummaryQueries({
  selectedDate,
  selectedRoute,
}: UseSummaryQueriesParams): UseSummaryQueriesReturn {
  const dateRange = useMemo(() => createDateRange(selectedDate), [selectedDate])

  const {
    data,
    loading,
    error,
    refetch,
  } = useQuery(ALL_TRANSACTIONS_BY_DATE_QUERY, {
    variables: {
      fromDate: dateRange.startDate,
      toDate: dateRange.endDate,
      routeId: selectedRoute?.id,
    },
    skip: !selectedDate || !selectedRoute,
    fetchPolicy: 'cache-and-network',
  })

  const { transactions, totalCount } = useMemo(() => {
    if (!data?.transactions?.edges) {
      return { transactions: [], totalCount: 0 }
    }

    const txList = data.transactions.edges.map(
      (edge: { node: TransactionNode }) => edge.node
    )
    return {
      transactions: txList,
      totalCount: data.transactions.totalCount || txList.length,
    }
  }, [data])

  return {
    transactions,
    totalCount,
    loading,
    error: error as Error | undefined,
    refetch,
  }
}

interface UseRoutesQueryReturn {
  routes: Route[]
  loading: boolean
}

export function useRoutesQuery(): UseRoutesQueryReturn {
  const { data, loading } = useQuery(ROUTES_QUERY)

  const routes = useMemo(() => {
    return data?.routes || []
  }, [data])

  return { routes, loading }
}
