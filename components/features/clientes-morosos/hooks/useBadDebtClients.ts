'use client'

import { useQuery } from '@apollo/client'
import { useCallback, useState } from 'react'
import { GET_BAD_DEBT_CLIENTS_QUERY } from '@/graphql/queries/badDebt'
import type { BadDebtClientsResult, BadDebtFilters } from '../types'

const PAGE_SIZE = 20

interface UseBadDebtClientsOptions {
  filters?: BadDebtFilters
}

interface UseBadDebtClientsReturn {
  clients: BadDebtClientsResult['clients']
  totalCount: number
  hasMore: boolean
  loading: boolean
  error: Error | undefined
  loadMore: () => void
  refetch: () => void
}

export function useBadDebtClients(options: UseBadDebtClientsOptions = {}): UseBadDebtClientsReturn {
  const { filters } = options
  const [loadingMore, setLoadingMore] = useState(false)

  const { data, loading, error, fetchMore, refetch } = useQuery<{
    badDebtClients: BadDebtClientsResult
  }>(GET_BAD_DEBT_CLIENTS_QUERY, {
    variables: {
      routeId: filters?.routeId,
      locationId: filters?.locationId,
      limit: PAGE_SIZE,
      offset: 0,
    },
    fetchPolicy: 'cache-and-network',
  })

  const loadMore = useCallback(async () => {
    if (!data?.badDebtClients?.hasMore || loadingMore) return

    setLoadingMore(true)
    try {
      await fetchMore({
        variables: {
          offset: data.badDebtClients.clients.length,
        },
        updateQuery: (prev, { fetchMoreResult }) => {
          if (!fetchMoreResult) return prev
          return {
            badDebtClients: {
              ...fetchMoreResult.badDebtClients,
              clients: [
                ...prev.badDebtClients.clients,
                ...fetchMoreResult.badDebtClients.clients,
              ],
            },
          }
        },
      })
    } finally {
      setLoadingMore(false)
    }
  }, [data, loadingMore, fetchMore])

  return {
    clients: data?.badDebtClients?.clients || [],
    totalCount: data?.badDebtClients?.totalCount || 0,
    hasMore: data?.badDebtClients?.hasMore || false,
    loading: loading || loadingMore,
    error: error as Error | undefined,
    loadMore,
    refetch,
  }
}
