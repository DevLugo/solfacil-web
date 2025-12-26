'use client'

import { useMemo } from 'react'
import { useQuery } from '@apollo/client'
import {
  ROUTES_QUERY,
  TRANSACTIONS_SUMMARY_BY_LOCATION_QUERY,
} from '@/graphql/queries/transactions'
import { useDateChangeRefetch } from '@/hooks/use-date-change-refetch'
import { createDateRange } from '../utils'
import type { Route } from '../types'

/**
 * Types for the server-calculated summary response
 */
export interface PaymentSummary {
  id: string
  borrowerName: string
  amount: string
  commission: string
  paymentMethod: 'CASH' | 'MONEY_TRANSFER'
  date: string
}

export interface ExpenseSummary {
  id: string
  source: string
  sourceLabel: string
  amount: string
  date: string
}

export interface LoanGrantedSummary {
  id: string
  borrowerName: string
  amount: string
  date: string
}

export interface LocalitySummary {
  locationKey: string
  localityName: string
  leaderName: string
  leaderId: string
  payments: PaymentSummary[]
  totalPayments: string
  cashPayments: string
  bankPayments: string
  paymentCount: number
  // Commissions breakdown
  totalPaymentCommissions: string
  totalLoansGrantedCommissions: string
  totalCommissions: string
  expenses: ExpenseSummary[]
  totalExpenses: string
  loansGranted: LoanGrantedSummary[]
  totalLoansGranted: string
  loansGrantedCount: number
  // Calculated balances from API
  balanceEfectivo: string
  balanceBanco: string
  balance: string
}

export interface ExecutiveSummary {
  totalPaymentsReceived: string
  totalCashPayments: string
  totalBankPayments: string
  // Commissions breakdown
  totalPaymentCommissions: string
  totalLoansGrantedCommissions: string
  totalCommissions: string
  totalExpenses: string
  totalLoansGranted: string
  paymentCount: number
  expenseCount: number
  loansGrantedCount: number
  netBalance: string
}

export interface TransactionSummaryResponse {
  localities: LocalitySummary[]
  executiveSummary: ExecutiveSummary
}

interface UseSummaryQueriesParams {
  selectedDate: Date
  selectedRoute: Route | null
  refreshKey?: number
}

interface UseSummaryQueriesReturn {
  summaryData: TransactionSummaryResponse | null
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
    loading: loadingRaw,
    error,
    refetch,
  } = useQuery(TRANSACTIONS_SUMMARY_BY_LOCATION_QUERY, {
    variables: {
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      routeId: selectedRoute?.id,
    },
    skip: !selectedDate || !selectedRoute,
    fetchPolicy: 'network-only',
    notifyOnNetworkStatusChange: true,
  })

  // Handle date change refetch
  const { isRefetching } = useDateChangeRefetch({
    selectedDate,
    enabled: !!selectedRoute,
    refetchFn: refetch,
  })

  // Combine loading states
  const loading = loadingRaw || isRefetching

  const summaryData = useMemo<TransactionSummaryResponse | null>(() => {
    if (!data?.transactionsSummaryByLocation) {
      return null
    }
    return data.transactionsSummaryByLocation
  }, [data])

  return {
    summaryData,
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
