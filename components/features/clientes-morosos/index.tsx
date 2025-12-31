'use client'

import { useState } from 'react'
import { FilterBar, BadDebtClientList } from './components'
import { useBadDebtClients } from './hooks/useBadDebtClients'
import type { BadDebtFilters } from './types'

export function ClientesMorosos() {
  const [filters, setFilters] = useState<BadDebtFilters>({})

  const {
    clients,
    totalCount,
    hasMore,
    loading,
    error,
    loadMore,
  } = useBadDebtClients({ filters })

  return (
    <div className="space-y-4">
      <FilterBar
        filters={filters}
        onFiltersChange={setFilters}
        totalCount={totalCount}
        loading={loading}
      />

      <BadDebtClientList
        clients={clients}
        loading={loading}
        hasMore={hasMore}
        loadMore={loadMore}
        error={error}
      />
    </div>
  )
}
