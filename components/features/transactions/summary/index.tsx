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
import type {
  LocalitySummary as ServerLocalitySummary,
  ExecutiveSummary as ServerExecutiveSummary,
} from './hooks/useSummaryQueries'

// Types
import type { Route, LocalitySummary, ExecutiveSummaryData } from './types'

export interface SummaryTabProps {
  selectedDate: Date
  selectedRoute: Route | null
  refreshKey?: number
}

/**
 * Converts server-side summary data (with string decimals) to client types (with numbers)
 */
function convertToClientLocality(serverLocality: ServerLocalitySummary): LocalitySummary {
  return {
    locationKey: serverLocality.locationKey,
    localityName: serverLocality.localityName,
    leaderName: serverLocality.leaderName,
    leaderId: serverLocality.leaderId,
    payments: serverLocality.payments.map((p) => ({
      id: p.id,
      borrowerName: p.borrowerName,
      amount: parseFloat(p.amount) || 0,
      commission: parseFloat(p.commission) || 0,
      paymentMethod: p.paymentMethod,
      date: p.date,
    })),
    totalPayments: parseFloat(serverLocality.totalPayments) || 0,
    cashPayments: parseFloat(serverLocality.cashPayments) || 0,
    bankPayments: parseFloat(serverLocality.bankPayments) || 0,
    // Breakdown of bank payments
    bankPaymentsFromClients: parseFloat(serverLocality.bankPaymentsFromClients) || 0,
    leaderCashToBank: parseFloat(serverLocality.leaderCashToBank) || 0,
    // Commissions breakdown
    totalPaymentCommissions: parseFloat(serverLocality.totalPaymentCommissions) || 0,
    totalLoansGrantedCommissions: parseFloat(serverLocality.totalLoansGrantedCommissions) || 0,
    totalCommissions: parseFloat(serverLocality.totalCommissions) || 0,
    paymentCount: serverLocality.paymentCount,
    expenses: serverLocality.expenses.map((e) => ({
      id: e.id,
      source: e.source,
      sourceLabel: e.sourceLabel,
      amount: parseFloat(e.amount) || 0,
      date: e.date,
    })),
    totalExpenses: parseFloat(serverLocality.totalExpenses) || 0,
    loansGranted: serverLocality.loansGranted.map((l) => ({
      id: l.id,
      borrowerName: l.borrowerName,
      amount: parseFloat(l.amount) || 0,
      date: l.date,
    })),
    totalLoansGranted: parseFloat(serverLocality.totalLoansGranted) || 0,
    loansGrantedCount: serverLocality.loansGrantedCount,
    // Calculated balances from API
    balanceEfectivo: parseFloat(serverLocality.balanceEfectivo) || 0,
    balanceBanco: parseFloat(serverLocality.balanceBanco) || 0,
    balance: parseFloat(serverLocality.balance) || 0,
  }
}

function convertToClientExecutiveSummary(
  serverSummary: ServerExecutiveSummary
): ExecutiveSummaryData {
  return {
    totalPaymentsReceived: parseFloat(serverSummary.totalPaymentsReceived) || 0,
    totalCashPayments: parseFloat(serverSummary.totalCashPayments) || 0,
    totalBankPayments: parseFloat(serverSummary.totalBankPayments) || 0,
    // Commissions breakdown
    totalPaymentCommissions: parseFloat(serverSummary.totalPaymentCommissions) || 0,
    totalLoansGrantedCommissions: parseFloat(serverSummary.totalLoansGrantedCommissions) || 0,
    totalCommissions: parseFloat(serverSummary.totalCommissions) || 0,
    totalExpenses: parseFloat(serverSummary.totalExpenses) || 0,
    totalLoansGranted: parseFloat(serverSummary.totalLoansGranted) || 0,
    paymentCount: serverSummary.paymentCount,
    expenseCount: serverSummary.expenseCount,
    loansGrantedCount: serverSummary.loansGrantedCount,
    netBalance: parseFloat(serverSummary.netBalance) || 0,
  }
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

  // Query for transaction summary (server-side calculations)
  const { summaryData, loading, error, refetch } = useSummaryQueries({
    selectedDate,
    selectedRoute,
    refreshKey,
  })

  // Convert server data to client types
  const localities: LocalitySummary[] = useMemo(() => {
    if (!summaryData?.localities) return []
    return summaryData.localities.map(convertToClientLocality)
  }, [summaryData])

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

  // Convert executive summary (server-calculated)
  const executiveSummary: ExecutiveSummaryData = useMemo(() => {
    if (!summaryData?.executiveSummary) {
      return {
        totalPaymentsReceived: 0,
        totalCashPayments: 0,
        totalBankPayments: 0,
        totalPaymentCommissions: 0,
        totalLoansGrantedCommissions: 0,
        totalCommissions: 0,
        totalExpenses: 0,
        totalLoansGranted: 0,
        paymentCount: 0,
        expenseCount: 0,
        loansGrantedCount: 0,
        netBalance: 0,
      }
    }
    return convertToClientExecutiveSummary(summaryData.executiveSummary)
  }, [summaryData])

  // Refetch on refreshKey change
  useEffect(() => {
    if (selectedDate && selectedRoute) {
      refetch()
    }
  }, [refreshKey, refetch, selectedDate, selectedRoute])

  // Loading state - show skeleton whenever loading to indicate data refresh
  if (loading) {
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
                  onChange={(e) => setSearchTerm(e.target.value.toUpperCase())}
                  className="pl-9 pr-8 w-64 uppercase"
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
