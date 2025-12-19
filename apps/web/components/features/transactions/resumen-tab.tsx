'use client'

import { useMemo } from 'react'
import { useQuery } from '@apollo/client'
import { ROUTES_QUERY } from '@/graphql/queries/transactions'
import { useTransactionContext } from './transaction-context'
import { SummaryTab } from './summary'

export function ResumenTab() {
  const { selectedRouteId, selectedDate } = useTransactionContext()

  // Get routes to find the selected route object
  const { data: routesData } = useQuery(ROUTES_QUERY)

  const selectedRoute = useMemo(() => {
    if (!selectedRouteId || !routesData?.routes) return null
    return routesData.routes.find((r: { id: string; name: string }) => r.id === selectedRouteId) || null
  }, [selectedRouteId, routesData])

  return (
    <SummaryTab
      selectedDate={selectedDate}
      selectedRoute={selectedRoute}
    />
  )
}
