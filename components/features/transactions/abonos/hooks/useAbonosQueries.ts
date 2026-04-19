'use client'

import { useMemo } from 'react'
import { useQuery, useMutation, useApolloClient } from '@apollo/client'
import { isSameDay } from 'date-fns'
import {
  ACTIVE_LOANS_BY_LEAD_QUERY,
  ACCOUNTS_QUERY,
  LEAD_PAYMENT_RECEIVED_BY_DATE_QUERY,
  LEAD_PAYMENT_RECEIVED_BY_ID_QUERY,
  LOAN_PAYMENTS_BY_LEAD_AND_DATE_QUERY,
} from '@/graphql/queries/transactions'
import {
  CREATE_LEAD_PAYMENT_RECEIVED,
  UPDATE_LEAD_PAYMENT_RECEIVED,
  CREATE_TRANSACTION,
} from '@/graphql/mutations/transactions'
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
  // API returns only ACTIVE loans for the selected lead
  // Using cache-and-network to avoid duplicate fetches while still getting fresh data
  const {
    data: loansData,
    loading: loansLoading,
    error: loansError,
    refetch: refetchLoans,
  } = useQuery(ACTIVE_LOANS_BY_LEAD_QUERY, {
    variables: { leadId: selectedLeadId },
    skip: !selectedLeadId,
    fetchPolicy: 'cache-and-network',
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
    }
  )

  // Check if day is captured (history mode)
  const isDayCaptured = !!leadPaymentData?.leadPaymentReceivedByLeadAndDate?.id

  // Query for payments by date - only fetch when in history mode
  // This allows us to show finished loans that had payments on this date
  const {
    data: paymentsData,
    loading: paymentsLoading,
    refetch: refetchPayments,
  } = useQuery(LOAN_PAYMENTS_BY_LEAD_AND_DATE_QUERY, {
    variables: {
      leadId: selectedLeadId,
      startDate: startDateUTC,
      endDate: endDateUTC,
    },
    skip: !selectedLeadId || !isDayCaptured,
    fetchPolicy: 'network-only',
  })

  // Mutations
  const [createTransaction] = useMutation(CREATE_TRANSACTION)
  const [createLeadPaymentReceived] = useMutation(CREATE_LEAD_PAYMENT_RECEIVED)
  const [updateLeadPaymentReceived] = useMutation(UPDATE_LEAD_PAYMENT_RECEIVED)

  // Process loans data
  // In capture mode: only ACTIVE loans
  // In history mode: loans from payments (including FINISHED) + active loans without payments (faltas)
  const loans: ActiveLoan[] = useMemo(() => {
    const rawActiveLoans =
      loansData?.loans?.edges?.map((edge: { node: ActiveLoan }) => edge.node) || []

    // Sort helper function
    const sortBySignDate = (a: ActiveLoan, b: ActiveLoan) => {
      const dateA = new Date(a.signDate || '1970-01-01').getTime()
      const dateB = new Date(b.signDate || '1970-01-01').getTime()
      return dateA - dateB
    }

    // History mode: Build loans from payments + active loans without payments (faltas)
    if (isDayCaptured && paymentsData?.loanPaymentsByLeadAndDate) {
      const loansFromPayments = new Map<string, ActiveLoan>()

      // Build loans from payments - this includes FINISHED loans
      paymentsData.loanPaymentsByLeadAndDate.forEach((payment: LoanPayment & { loan: ActiveLoan }) => {
        const loan = payment.loan
        if (!loansFromPayments.has(loan.id)) {
          // Initialize loan with this payment
          loansFromPayments.set(loan.id, {
            ...loan,
            payments: [payment],
          })
        } else {
          // Add payment to existing loan
          const existingLoan = loansFromPayments.get(loan.id)!
          existingLoan.payments = [...(existingLoan.payments || []), payment]
        }
      })

      // Add active loans without payments on this date (they are "faltas")
      const activeLoansWithoutPayments = rawActiveLoans.filter(
        (loan: ActiveLoan) => !loansFromPayments.has(loan.id)
      )

      const allLoans = [...loansFromPayments.values(), ...activeLoansWithoutPayments]
      return allLoans.sort(sortBySignDate)
    }

    // Capture mode: Only active loans
    return rawActiveLoans.sort(sortBySignDate)
  }, [loansData, isDayCaptured, paymentsData])

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
      // Refetch payments if in history mode
      isDayCaptured ? refetchPayments() : Promise.resolve(null),
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

  // Loading state - no need for useDateChangeRefetch since queries with date
  // in their variables (LEAD_PAYMENT_RECEIVED_BY_DATE_QUERY, LOAN_PAYMENTS_BY_LEAD_AND_DATE_QUERY)
  // automatically refetch when startDateUTC/endDateUTC change
  const isLoading = loansLoading || paymentsLoading

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
