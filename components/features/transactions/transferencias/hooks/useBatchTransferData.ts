'use client'

import { useState, useMemo, useCallback } from 'react'
import { useQuery } from '@apollo/client'
import { ROUTES_WITH_ACCOUNTS_QUERY, ACCOUNTS_QUERY } from '@/graphql/queries/transactions'

// Shared types for batch transfer operations
export interface RouteAccount {
  id: string
  name: string
  type: string
  amount: string
}

export interface Route {
  id: string
  name: string
  accounts: RouteAccount[]
}

export interface Account {
  id: string
  name: string
  type: string
  amount: string
}

export interface RouteWithBalance {
  id: string
  name: string
  cashAccountId?: string
  balance: number
}

interface UseBatchTransferDataParams {
  open: boolean
  filterPositiveBalance?: boolean
}

interface UseBatchTransferDataResult {
  // Data
  routesWithBalance: RouteWithBalance[]
  officeAccounts: Account[]
  sourceAccounts: Account[]
  // Loading states
  isLoading: boolean
  // Route selection
  selectedRouteIds: Set<string>
  setSelectedRouteIds: (ids: Set<string>) => void
  handleSelectAll: () => void
  handleRouteToggle: (routeId: string) => void
  selectAllRoutes: () => void
}

export function useBatchTransferData({
  open,
  filterPositiveBalance = false,
}: UseBatchTransferDataParams): UseBatchTransferDataResult {
  const [selectedRouteIds, setSelectedRouteIds] = useState<Set<string>>(new Set())

  // Query routes with their accounts
  const { data: routesData, loading: routesLoading } = useQuery(ROUTES_WITH_ACCOUNTS_QUERY, {
    skip: !open,
    fetchPolicy: 'network-only',
  })

  // Query all accounts (for source/destination selection)
  const { data: accountsData, loading: accountsLoading } = useQuery(ACCOUNTS_QUERY, {
    skip: !open,
    fetchPolicy: 'network-only',
  })

  // Process routes to extract EMPLOYEE_CASH_FUND balances
  const routesWithBalance = useMemo(() => {
    if (!routesData?.routes) return []

    let routes = routesData.routes
      .map((route: Route) => {
        const cashAccount = route.accounts.find((a) => a.type === 'EMPLOYEE_CASH_FUND')
        return {
          id: route.id,
          name: route.name,
          cashAccountId: cashAccount?.id,
          balance: cashAccount ? parseFloat(cashAccount.amount || '0') : 0,
        }
      })
      .filter((r: RouteWithBalance) => r.cashAccountId)
      .sort((a: RouteWithBalance, b: RouteWithBalance) => a.name.localeCompare(b.name))

    if (filterPositiveBalance) {
      routes = routes.filter((r: RouteWithBalance) => r.balance > 0)
    }

    return routes
  }, [routesData, filterPositiveBalance])

  // Get OFFICE_CASH_FUND accounts
  const officeAccounts = useMemo(() => {
    if (!accountsData?.accounts) return []
    return accountsData.accounts.filter((a: Account) => a.type === 'OFFICE_CASH_FUND')
  }, [accountsData])

  // Get source accounts (OFFICE_CASH_FUND and BANK)
  const sourceAccounts = useMemo(() => {
    if (!accountsData?.accounts) return []
    return accountsData.accounts.filter(
      (a: Account) => a.type === 'OFFICE_CASH_FUND' || a.type === 'BANK'
    )
  }, [accountsData])

  // Handle select all toggle
  const handleSelectAll = useCallback(() => {
    if (selectedRouteIds.size === routesWithBalance.length) {
      setSelectedRouteIds(new Set())
    } else {
      setSelectedRouteIds(new Set(routesWithBalance.map((r: RouteWithBalance) => r.id)))
    }
  }, [selectedRouteIds.size, routesWithBalance])

  // Handle individual route toggle
  const handleRouteToggle = useCallback((routeId: string) => {
    setSelectedRouteIds((prev) => {
      const newSelected = new Set(prev)
      if (newSelected.has(routeId)) {
        newSelected.delete(routeId)
      } else {
        newSelected.add(routeId)
      }
      return newSelected
    })
  }, [])

  // Select all routes
  const selectAllRoutes = useCallback(() => {
    setSelectedRouteIds(new Set(routesWithBalance.map((r: RouteWithBalance) => r.id)))
  }, [routesWithBalance])

  return {
    routesWithBalance,
    officeAccounts,
    sourceAccounts,
    isLoading: routesLoading || accountsLoading,
    selectedRouteIds,
    setSelectedRouteIds,
    handleSelectAll,
    handleRouteToggle,
    selectAllRoutes,
  }
}
