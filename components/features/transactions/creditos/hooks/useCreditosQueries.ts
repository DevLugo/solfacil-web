'use client'

import { useQuery } from '@apollo/client'
import { startOfDay, endOfDay } from 'date-fns'
import {
  LOANS_BY_DATE_LEAD_QUERY,
  LOAN_TYPES_QUERY,
  ACTIVE_LOANS_FOR_RENEWAL_QUERY,
} from '@/graphql/queries/transactions'
import { ACCOUNTS_QUERY } from '@/graphql/queries/transactions'
import type { Loan, LoanType, Account, PreviousLoan } from '../types'

interface UseCreditosQueriesParams {
  selectedDate: Date
  selectedLeadId?: string | null
  selectedRouteId?: string | null
}

export function useCreditosQueries({
  selectedDate,
  selectedLeadId,
  selectedRouteId,
}: UseCreditosQueriesParams) {
  // Query loans granted on the selected date for the selected lead
  const {
    data: loansData,
    loading: loansLoading,
    error: loansError,
    refetch: refetchLoans,
  } = useQuery(LOANS_BY_DATE_LEAD_QUERY, {
    variables: {
      fromDate: startOfDay(selectedDate).toISOString(),
      toDate: endOfDay(selectedDate).toISOString(),
      leadId: selectedLeadId,
    },
    skip: !selectedLeadId,
    fetchPolicy: 'no-cache', // Use no-cache to avoid conflicts with ACTIVE_LOANS_FOR_RENEWAL_QUERY which also uses 'loans' field
    notifyOnNetworkStatusChange: true,
  })

  // Log errors
  if (loansError) {
    console.error('[useCreditosQueries] Error fetching loans:', loansError)
  }

  // Query loan types
  const { data: loanTypesData, loading: loanTypesLoading } = useQuery(LOAN_TYPES_QUERY)

  // Query loans for the selected lead (filters by leadId on server)
  // Filter for active loans (pendingAmountStored > 0) is done client-side
  // Using 'no-cache' to avoid conflicts with LOANS_BY_DATE_LEAD_QUERY which uses same 'loans' field
  const { data: renewalLoansData, loading: renewalLoansLoading, error: renewalLoansError } = useQuery(
    ACTIVE_LOANS_FOR_RENEWAL_QUERY,
    {
      variables: {
        leadId: selectedLeadId,
      },
      skip: !selectedLeadId, // Don't fetch if no lead selected
      fetchPolicy: 'no-cache', // Completely bypass cache to avoid conflicts with other loans queries
      notifyOnNetworkStatusChange: true,
    }
  )

  // Log error if any
  if (renewalLoansError) {
    console.error('[useCreditosQueries] Error fetching loans:', renewalLoansError)
  }

  // Query accounts for the route - using no-cache to always get fresh balance
  const { data: accountsData, loading: accountsLoading, refetch: refetchAccounts } = useQuery(ACCOUNTS_QUERY, {
    variables: {
      routeId: selectedRouteId,
      type: 'OFFICE_CASH_FUND',
    },
    skip: !selectedRouteId,
    fetchPolicy: 'no-cache',
  })

  // Extract and transform data
  const loansToday: Loan[] = loansData?.loans?.edges?.map((edge: { node: Loan }) => edge.node) || []
  const loanTypes: LoanType[] = loanTypesData?.loantypes || []

  // Get all loans for the route
  const allLoansFromRoute: PreviousLoan[] =
    renewalLoansData?.loans?.edges?.map((edge: { node: PreviousLoan }) => edge.node) || []

  // Para cada cliente, solo mostrar su préstamo MÁS RECIENTE con deuda pendiente
  // Esto garantiza que si aparece en el autocomplete, es renovable
  const loansForRenewal: PreviousLoan[] = (() => {
    // Agrupar préstamos por borrower
    const loansByBorrower = new Map<string, PreviousLoan[]>()

    allLoansFromRoute.forEach((loan) => {
      const borrowerId = loan.borrower.id
      if (!loansByBorrower.has(borrowerId)) {
        loansByBorrower.set(borrowerId, [])
      }
      loansByBorrower.get(borrowerId)!.push(loan)
    })

    // Para cada borrower, obtener solo el préstamo más reciente con deuda
    const mostRecentLoans: PreviousLoan[] = []

    loansByBorrower.forEach((loans) => {
      // Ordenar por fecha de firma descendente (más reciente primero)
      const sortedLoans = loans.sort((a, b) =>
        new Date(b.signDate).getTime() - new Date(a.signDate).getTime()
      )

      // Tomar el más reciente con deuda pendiente
      const mostRecentWithDebt = sortedLoans.find(
        loan => parseFloat(loan.pendingAmountStored || '0') > 0
      )

      if (mostRecentWithDebt) {
        mostRecentLoans.push(mostRecentWithDebt)
      }
    })

    return mostRecentLoans
  })()

  const accounts: Account[] = accountsData?.accounts || []

  // Get default account (first one)
  const defaultAccount = accounts[0] || null

  return {
    loansToday,
    loansLoading,
    refetchLoans,
    loanTypes,
    loanTypesLoading,
    loansForRenewal,
    renewalLoansLoading,
    accounts,
    accountsLoading,
    defaultAccount,
    refetchAccounts,
  }
}
