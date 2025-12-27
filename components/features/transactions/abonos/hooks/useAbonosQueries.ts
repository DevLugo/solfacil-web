'use client'

import { useMemo } from 'react'
import { useQuery, useMutation, useApolloClient } from '@apollo/client'
import { isSameDay } from 'date-fns'
import {
  ACTIVE_LOANS_BY_LEAD_QUERY,
  ACCOUNTS_QUERY,
  LEAD_PAYMENT_RECEIVED_BY_DATE_QUERY,
  LEAD_PAYMENT_RECEIVED_BY_ID_QUERY,
} from '@/graphql/queries/transactions'
import {
  CREATE_LEAD_PAYMENT_RECEIVED,
  UPDATE_LEAD_PAYMENT_RECEIVED,
  CREATE_TRANSACTION,
} from '@/graphql/mutations/transactions'
import { useDateChangeRefetch } from '@/hooks/use-date-change-refetch'
import type { ActiveLoan, LoanPayment, Account } from '../types'

interface UseAbonosQueriesParams {
  selectedRouteId: string | null
  selectedLeadId: string | null
  selectedDate: Date
}

export function useAbonosQueries({
  selectedRouteId,
  selectedLeadId,
  selectedDate,
}: UseAbonosQueriesParams) {
  const apolloClient = useApolloClient()

  // Calculate UTC date range for the selected date
  const { startDateUTC, endDateUTC } = useMemo(() => {
    const start = new Date(selectedDate)
    start.setHours(0, 0, 0, 0)
    const end = new Date(selectedDate)
    end.setHours(23, 59, 59, 999)
    return {
      startDateUTC: start.toISOString(),
      endDateUTC: end.toISOString(),
    }
  }, [selectedDate])

  // Query for active loans
  const {
    data: loansData,
    loading: loansLoading,
    error: loansError,
    refetch: refetchLoans,
  } = useQuery(ACTIVE_LOANS_BY_LEAD_QUERY, {
    variables: { leadId: selectedLeadId },
    skip: !selectedLeadId,
    fetchPolicy: 'network-only',
    notifyOnNetworkStatusChange: true,
  })

  // Query for accounts
  const { data: accountsData, refetch: refetchAccounts } = useQuery(ACCOUNTS_QUERY, {
    variables: { routeId: selectedRouteId },
    skip: !selectedRouteId,
    fetchPolicy: 'network-only',
  })

  // Query for LeadPaymentReceived of the day
  const { data: leadPaymentData, refetch: refetchLeadPayment } = useQuery(
    LEAD_PAYMENT_RECEIVED_BY_DATE_QUERY,
    {
      variables: {
        leadId: selectedLeadId,
        startDate: startDateUTC,
        endDate: endDateUTC,
      },
      skip: !selectedLeadId,
      fetchPolicy: 'network-only',
      notifyOnNetworkStatusChange: true,
    }
  )

  // Mutations
  const [createTransaction] = useMutation(CREATE_TRANSACTION)
  const [createLeadPaymentReceived] = useMutation(CREATE_LEAD_PAYMENT_RECEIVED)
  const [updateLeadPaymentReceived] = useMutation(UPDATE_LEAD_PAYMENT_RECEIVED)

  // Process loans data
  const loans: ActiveLoan[] = useMemo(() => {
    const rawLoans =
      loansData?.loans?.edges?.map((edge: { node: ActiveLoan }) => edge.node) || []

    // Filter loans:
    // - ACTIVE loans: always show (can receive new payments)
    // - FINISHED/RENEWED loans: only show if they have a payment on the selected date
    const filteredLoans = rawLoans.filter((loan: ActiveLoan) => {
      if (loan.status === 'ACTIVE') {
        return true
      }
      // For FINISHED or RENOVATED loans, check if there's a payment on the selected date
      // This handles cases where a loan was renovated but had a payment registered that same day
      if (loan.status === 'FINISHED' || loan.status === 'RENOVATED') {
        const hasPaymentOnDate = loan.payments?.some((payment) =>
          isSameDay(new Date(payment.receivedAt), selectedDate)
        )
        return hasPaymentOnDate
      }
      // Other statuses (CANCELLED) - don't show
      return false
    })

    // Sort by sign date (oldest first)
    return filteredLoans.sort((a: ActiveLoan, b: ActiveLoan) => {
      const dateA = new Date(a.signDate || '1970-01-01').getTime()
      const dateB = new Date(b.signDate || '1970-01-01').getTime()
      return dateA - dateB
    })
  }, [loansData, selectedDate])

  // Map of loanId -> payments registered today (supports multiple payments per loan per day)
  const registeredPaymentsMap = useMemo(() => {
    const map = new Map<string, LoanPayment[]>()
    loans.forEach((loan) => {
      const paymentsToday = loan.payments?.filter((payment) =>
        isSameDay(new Date(payment.receivedAt), selectedDate)
      ) || []
      if (paymentsToday.length > 0) {
        // Sort by receivedAt to maintain chronological order
        const sorted = [...paymentsToday].sort((a, b) =>
          new Date(a.receivedAt).getTime() - new Date(b.receivedAt).getTime()
        )
        map.set(loan.id, sorted)
      }
    })
    return map
  }, [loans, selectedDate])

  // LeadPaymentReceived ID from query
  const leadPaymentReceivedId = useMemo(() => {
    const record = leadPaymentData?.leadPaymentReceivedByLeadAndDate
    return record?.id || null
  }, [leadPaymentData])

  // Cash accounts for multa destination
  const cashAccounts: Account[] = useMemo(() => {
    return (
      accountsData?.accounts?.filter(
        (acc: Account) => acc.type === 'EMPLOYEE_CASH_FUND' || acc.type === 'OFFICE_CASH_FUND'
      ) || []
    )
  }, [accountsData])

  // Refetch all function - returns the refetched leadPaymentData for immediate use
  // Force network-only to ensure we get fresh data from server
  const refetchAll = async () => {
    const [, leadPaymentResult] = await Promise.all([
      refetchLoans(),
      refetchLeadPayment({ fetchPolicy: 'network-only' }),
      refetchAccounts(),
    ])
    console.log('[refetchAll] leadPaymentResult:', leadPaymentResult)
    console.log('[refetchAll] leadPaymentResult.data:', leadPaymentResult.data)
    return { leadPaymentData: leadPaymentResult.data }
  }

  // Fetch LeadPaymentReceived by ID - for edit distribution modal
  // This ensures we get the correct record even if selectedDate changed
  const fetchLeadPaymentById = async (id: string) => {
    const result = await apolloClient.query({
      query: LEAD_PAYMENT_RECEIVED_BY_ID_QUERY,
      variables: { id },
      fetchPolicy: 'network-only',
    })
    console.log('[fetchLeadPaymentById] result:', result.data)
    return result.data?.leadPaymentReceivedById
  }

  // Handle date change refetch
  const { isRefetching } = useDateChangeRefetch({
    selectedDate,
    enabled: !!selectedLeadId,
    refetchFn: [refetchLoans, refetchLeadPayment],
  })

  // Combine loading states
  const isLoading = loansLoading || isRefetching

  return {
    // Data
    loans,
    loansLoading: isLoading, // Combined loading state (includes date change refetch)
    loansError,
    registeredPaymentsMap,
    leadPaymentReceivedId,
    leadPaymentData,
    cashAccounts,
    startDateUTC,
    endDateUTC,
    // Mutations
    createTransaction,
    createLeadPaymentReceived,
    updateLeadPaymentReceived,
    // Refetch
    refetchAll,
    fetchLeadPaymentById,
    refetchLoans,
    refetchLeadPayment,
    refetchAccounts,
  }
}
