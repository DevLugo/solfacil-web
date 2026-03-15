'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@apollo/client'
import { gql } from '@apollo/client'
import { Search, ShieldOff, MapPin, Filter } from 'lucide-react'
import { startOfDay, endOfDay } from 'date-fns'
import { Input } from '@/components/ui/input'
import { useTransactionContext } from '../../../transaction-context'
import { AvalProgressBar } from './AvalProgressBar'
import { LocationGroup } from './LocationGroup'
import type { LoanForAval } from '../../types'
import { groupLoansByLocation } from '../../types'

const LOANS_FOR_AVALES_QUERY = gql`
  query LoansForAvales($fromDate: DateTime!, $toDate: DateTime!, $routeId: ID!) {
    loans(fromDate: $fromDate, toDate: $toDate, routeId: $routeId, status: ACTIVE) {
      edges {
        node {
          id
          signDate
          createdAt
          updatedAt
          requestedAmount
          totalDebtAcquired
          loantype {
            name
            weekDuration
          }
          lead {
            id
            location {
              id
              name
            }
          }
          borrower {
            id
            personalData {
              id
              fullName
              phones {
                id
                number
              }
            }
          }
          collaterals {
            id
            fullName
            updatedAt
            phones {
              id
              number
            }
          }
        }
      }
    }
  }
`

export function AvalCaptureMode() {
  const { selectedRouteId, selectedDate } = useTransactionContext()
  const [locationFilter, setLocationFilter] = useState('')

  const { data, loading, refetch } = useQuery<{
    loans: { edges: { node: LoanForAval }[] }
  }>(LOANS_FOR_AVALES_QUERY, {
    variables: {
      fromDate: startOfDay(selectedDate).toISOString(),
      toDate: endOfDay(selectedDate).toISOString(),
      routeId: selectedRouteId,
    },
    skip: !selectedRouteId,
    fetchPolicy: 'network-only',
  })

  const loans = useMemo(
    () => data?.loans.edges.map((e) => e.node) || [],
    [data]
  )

  const locationGroups = useMemo(
    () => groupLoansByLocation(loans),
    [loans]
  )

  const filteredGroups = useMemo(() => {
    if (!locationFilter.trim()) return locationGroups
    const term = locationFilter.toLowerCase()
    return locationGroups.filter((g) =>
      g.locationName.toLowerCase().includes(term)
    )
  }, [locationGroups, locationFilter])

  const handleUpdated = () => {
    refetch()
  }

  if (!selectedRouteId) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="h-14 w-14 rounded-2xl bg-muted/60 flex items-center justify-center mb-5">
          <MapPin className="h-6 w-6 text-muted-foreground/60" />
        </div>
        <h3 className="text-base font-semibold mb-1.5">Selecciona una ruta</h3>
        <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
          Selecciona una ruta para ver los créditos del día y capturar avales
        </p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {/* Skeleton progress bar */}
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="grid grid-cols-3 divide-x">
            {[1, 2, 3].map((i) => (
              <div key={i} className="px-5 py-4 flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-muted animate-pulse" />
                <div className="space-y-2">
                  <div className="h-6 w-10 bg-muted rounded animate-pulse" />
                  <div className="h-3 w-16 bg-muted rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
          <div className="px-5 pb-4 pt-1">
            <div className="h-2 bg-muted rounded-full animate-pulse" />
          </div>
        </div>
        {/* Skeleton groups */}
        {[1, 2].map((i) => (
          <div key={i} className="rounded-xl border overflow-hidden">
            <div className="px-4 py-3 bg-muted/30 flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-muted animate-pulse" />
              <div className="h-4 w-32 bg-muted rounded animate-pulse" />
              <div className="ml-auto h-5 w-10 bg-muted rounded-full animate-pulse" />
            </div>
            <div className="divide-y">
              {[1, 2, 3].map((j) => (
                <div key={j} className="px-4 py-3 flex items-center gap-3">
                  <div className="h-4 w-4 rounded bg-muted animate-pulse" />
                  <div className="h-4 w-28 bg-muted rounded animate-pulse" />
                  <div className="h-3 w-16 bg-muted rounded animate-pulse ml-auto" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (loans.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="h-14 w-14 rounded-2xl bg-muted/60 flex items-center justify-center mb-5">
          <ShieldOff className="h-6 w-6 text-muted-foreground/60" />
        </div>
        <h3 className="text-base font-semibold mb-1.5">Sin créditos</h3>
        <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
          No hay créditos activos para esta fecha en la ruta seleccionada
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <AvalProgressBar loans={loans} />

      {/* Location filter — only show when there are multiple groups */}
      {locationGroups.length > 1 && (
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            placeholder="Filtrar localidad..."
            className="h-9 text-sm pl-9"
          />
        </div>
      )}

      <div className="space-y-3">
        {filteredGroups.map((group) => (
          <LocationGroup
            key={group.locationId}
            group={group}
            onUpdated={handleUpdated}
          />
        ))}
        {filteredGroups.length === 0 && locationFilter && (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Search className="h-5 w-5 text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">
              No se encontraron localidades con &quot;{locationFilter}&quot;
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
