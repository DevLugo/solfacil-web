'use client'

import { useLazyQuery } from '@apollo/client'
import { useCallback, useState, useEffect } from 'react'
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
  const [clientData, setClientData] = useState<ClientHistoryData | null>(null)
  const [getClientHistory, { data, loading, error, client }] = useLazyQuery(
    GET_CLIENT_HISTORY_QUERY,
    {
      fetchPolicy: 'network-only',
    }
  )

  // Sync Apollo data to local state
  useEffect(() => {
    if (data?.getClientHistory) {
      setClientData(data.getClientHistory)
    }
  }, [data])

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
    // Clear local state immediately
    setClientData(null)
    // Also clear the cache
    client.cache.evict({ fieldName: 'getClientHistory' })
    client.cache.gc()
  }, [client])

  return {
    data: clientData,
    loading,
    error: error as Error | undefined,
    fetchClientHistory,
    reset,
  }
}
