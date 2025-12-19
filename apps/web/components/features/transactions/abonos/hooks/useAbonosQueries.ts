'use client'

import { useMemo } from 'react'
import { useQuery, useMutation } from '@apollo/client'
import { isSameDay } from 'date-fns'
import {
  ACTIVE_LOANS_BY_LEAD_QUERY,
  ACCOUNTS_QUERY,
  LEAD_PAYMENT_RECEIVED_BY_DATE_QUERY,
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
  })

  // Query for accounts
  const { data: accountsData, refetch: refetchAccounts } = useQuery(ACCOUNTS_QUERY, {
    variables: { routeId: selectedRouteId },
    skip: !selectedRouteId,
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

  // Mutations
  const [createTransaction] = useMutation(CREATE_TRANSACTION)
  const [createLeadPaymentReceived] = useMutation(CREATE_LEAD_PAYMENT_RECEIVED)
  const [updateLeadPaymentReceived] = useMutation(UPDATE_LEAD_PAYMENT_RECEIVED)

  // Process loans data
  const loans: ActiveLoan[] = useMemo(() => {
    const rawLoans =
      loansData?.loans?.edges?.map((edge: { node: ActiveLoan }) => edge.node) || []

    // Sort by sign date (oldest first)
    return rawLoans.sort((a: ActiveLoan, b: ActiveLoan) => {
      const dateA = new Date(a.signDate || '1970-01-01').getTime()
      const dateB = new Date(b.signDate || '1970-01-01').getTime()
      return dateA - dateB
    })
  }, [loansData])

  // Map of loanId -> payment registered today
  const registeredPaymentsMap = useMemo(() => {
    const map = new Map<string, LoanPayment>()
    loans.forEach((loan) => {
      const paymentToday = loan.payments?.find((payment) =>
        isSameDay(new Date(payment.receivedAt), selectedDate)
      )
      if (paymentToday) {
        map.set(loan.id, paymentToday)
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

  // Refetch all function
  const refetchAll = async () => {
    await Promise.all([refetchLoans(), refetchLeadPayment(), refetchAccounts()])
  }

  return {
    // Data
    loans,
    loansLoading,
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
    refetchLoans,
    refetchLeadPayment,
    refetchAccounts,
  }
}
