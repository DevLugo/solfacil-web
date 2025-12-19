'use client'

import { useMemo, useEffect, useState } from 'react'
import { useQuery } from '@apollo/client'
import { format, startOfWeek, endOfWeek } from 'date-fns'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { AlertCircle, Search, X, BarChart3, Banknote } from 'lucide-react'
import { ROUTES_QUERY } from '@/graphql/queries/transactions'

// Components
import { ExecutiveSummary, LocalityCard, BankIncomeModal } from './components'

// Hooks
import { useSummaryQueries, useBankIncomeQuery } from './hooks'

// Utils
import { processTransactionsByLocality, calculateExecutiveSummary } from './utils'

// Types
import type { Route, LocalitySummary, ExecutiveSummaryData } from './types'

export interface SummaryTabProps {
  selectedDate: Date
  selectedRoute: Route | null
  refreshKey?: number
}

export function SummaryTab({ selectedDate, selectedRoute, refreshKey = 0 }: SummaryTabProps) {
  const [searchTerm, setSearchTerm] = useState('')

  // Bank Income Modal state
  const [bankIncomeModalOpen, setBankIncomeModalOpen] = useState(false)
  const [bankIncomeStartDate, setBankIncomeStartDate] = useState(() => {
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 })
    return format(weekStart, 'yyyy-MM-dd')
  })
  const [bankIncomeEndDate, setBankIncomeEndDate] = useState(() => {
    const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 })
    return format(weekEnd, 'yyyy-MM-dd')
  })
  const [bankIncomeRouteIds, setBankIncomeRouteIds] = useState<string[]>([])
  const [bankIncomeOnlyAbonos, setBankIncomeOnlyAbonos] = useState(false)

  // Get all routes for the bank income filter
  const { data: routesData } = useQuery<{ routes: { id: string; name: string }[] }>(ROUTES_QUERY)
  const allRoutes = routesData?.routes || []

  // Initialize route selection when routes are loaded
  useEffect(() => {
    if (allRoutes.length > 0 && bankIncomeRouteIds.length === 0) {
      setBankIncomeRouteIds(allRoutes.map((r) => r.id))
    }
  }, [allRoutes, bankIncomeRouteIds.length])

  // Query for bank income transactions
  const {
    transactions: bankIncomeTransactions,
    loading: bankIncomeLoading,
    refetch: refetchBankIncome,
  } = useBankIncomeQuery({
    startDate: bankIncomeStartDate,
    endDate: bankIncomeEndDate,
    routeIds: bankIncomeRouteIds,
    onlyAbonos: bankIncomeOnlyAbonos,
    skip: !bankIncomeModalOpen,
  })

  // Query for all transactions
  const { transactions, totalCount, loading, error, refetch } = useSummaryQueries({
    selectedDate,
    selectedRoute,
    refreshKey,
  })

  // Process transactions into localities
  const localities: LocalitySummary[] = useMemo(() => {
    return processTransactionsByLocality(transactions)
  }, [transactions])

  // Filter localities by search term
  const filteredLocalities = useMemo(() => {
    if (!searchTerm.trim()) return localities

    const term = searchTerm.toLowerCase().trim()
    return localities.filter(
      (loc) =>
        loc.localityName.toLowerCase().includes(term) ||
        loc.leaderName.toLowerCase().includes(term)
    )
  }, [localities, searchTerm])

  // Calculate executive summary (from all localities, not filtered)
  const executiveSummary: ExecutiveSummaryData = useMemo(() => {
    return calculateExecutiveSummary(localities)
  }, [localities])

  // Refetch on refreshKey change
  useEffect(() => {
    if (selectedDate && selectedRoute) {
      refetch()
    }
  }, [refreshKey, refetch, selectedDate, selectedRoute])

  // Loading state
  if (loading && transactions.length === 0) {
    return <SummaryTabSkeleton />
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Error al cargar datos: {error.message}</AlertDescription>
        </Alert>
      </div>
    )
  }

  // No route selected
  if (!selectedRoute) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Selecciona una ruta para ver el resumen</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Executive Summary Stats */}
      <ExecutiveSummary data={executiveSummary} />

      {/* Localities Card */}
      <Card className="relative">
        <CardHeader className="pb-3 border-b">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Resumen por Localidad
              </CardTitle>
              <CardDescription>
                {localities.length} localidades con actividad
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              {/* Search Input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Buscar localidad o líder..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-8 w-64"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded"
                  >
                    <X className="h-3 w-3 text-muted-foreground" />
                  </button>
                )}
              </div>
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                {filteredLocalities.length === localities.length
                  ? `${localities.length} localidades`
                  : `${filteredLocalities.length} de ${localities.length}`}
              </span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-4">
          {filteredLocalities.length > 0 ? (
            <div className="flex flex-col gap-4">
              {filteredLocalities.map((locality) => (
                <LocalityCard key={locality.locationKey} locality={locality} />
              ))}
            </div>
          ) : localities.length > 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Search className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                No se encontraron localidades que coincidan con &ldquo;{searchTerm}&rdquo;
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                No hay transacciones para esta fecha y ruta
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Floating Button - Bank Income */}
      <Button
        onClick={() => setBankIncomeModalOpen(true)}
        className="fixed bottom-6 right-6 h-14 px-6 rounded-full shadow-lg bg-green-600 hover:bg-green-700 text-white z-50"
        size="lg"
      >
        <Banknote className="h-5 w-5 mr-2" />
        Entradas al Banco
      </Button>

      {/* Bank Income Modal */}
      <BankIncomeModal
        isOpen={bankIncomeModalOpen}
        onClose={() => setBankIncomeModalOpen(false)}
        transactions={bankIncomeTransactions}
        loading={bankIncomeLoading}
        onRefresh={() => refetchBankIncome()}
        startDate={bankIncomeStartDate}
        endDate={bankIncomeEndDate}
        onStartDateChange={setBankIncomeStartDate}
        onEndDateChange={setBankIncomeEndDate}
        selectedRouteIds={bankIncomeRouteIds}
        onRouteIdsChange={setBankIncomeRouteIds}
        availableRoutes={allRoutes}
        onlyAbonos={bankIncomeOnlyAbonos}
        onOnlyAbonosChange={setBankIncomeOnlyAbonos}
      />
    </div>
  )
}

function SummaryTabSkeleton() {
  return (
    <div className="space-y-4">
      {/* Stats skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="h-28 w-full" />
        ))}
      </div>

      {/* Localities skeleton */}
      <Card>
        <CardHeader className="pb-3 border-b">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32 mt-1" />
        </CardHeader>
        <CardContent className="pt-4">
          <div className="flex flex-col gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Re-export types for convenience
export type { Route, LocalitySummary, ExecutiveSummaryData } from './types'
