'use client'

import { useLazyQuery } from '@apollo/client'
import { useCallback } from 'react'
import { GET_CLIENT_HISTORY_QUERY } from '@/graphql/queries/clients'
import type { ClientHistoryData } from '../types'

interface UseClientHistoryReturn {
  data: ClientHistoryData | null
  loading: boolean
  error: Error | undefined
  fetchClientHistory: (clientId: string, routeId?: string, locationId?: string) => void
  reset: () => void
}

export function useClientHistory(): UseClientHistoryReturn {
  const [getClientHistory, { data, loading, error, client }] = useLazyQuery(
    GET_CLIENT_HISTORY_QUERY,
    {
      fetchPolicy: 'network-only',
    }
  )

  const fetchClientHistory = useCallback(
    (clientId: string, routeId?: string, locationId?: string) => {
      getClientHistory({
        variables: {
          clientId,
          routeId,
          locationId,
        },
      })
    },
    [getClientHistory]
  )

  const reset = useCallback(() => {
    // Clear the cache for this query
    client.cache.evict({ fieldName: 'getClientHistory' })
    client.cache.gc()
  }, [client])

  return {
    data: data?.getClientHistory || null,
    loading,
    error: error as Error | undefined,
    fetchClientHistory,
    reset,
  }
}
