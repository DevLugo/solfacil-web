import { useQuery, gql } from '@apollo/client'
import type { BankIncomeTransaction } from '../components'

const GET_BANK_INCOME_TRANSACTIONS = gql`
  query GetBankIncomeTransactions(
    $startDate: String!
    $endDate: String!
    $routeIds: [ID!]!
    $onlyAbonos: Boolean
  ) {
    getBankIncomeTransactions(
      startDate: $startDate
      endDate: $endDate
      routeIds: $routeIds
      onlyAbonos: $onlyAbonos
    ) {
      success
      message
      transactions {
        id
        amount
        type
        incomeSource
        date
        description
        locality
        employeeName
        leaderLocality
        isClientPayment
        isLeaderPayment
        name
      }
    }
  }
`

interface UseBankIncomeQueryParams {
  startDate: string
  endDate: string
  routeIds: string[]
  onlyAbonos: boolean
  skip?: boolean
}

interface BankIncomeQueryResult {
  transactions: BankIncomeTransaction[]
  loading: boolean
  error: Error | null
  refetch: () => void
}

export function useBankIncomeQuery({
  startDate,
  endDate,
  routeIds,
  onlyAbonos,
  skip = false,
}: UseBankIncomeQueryParams): BankIncomeQueryResult {
  const { data, loading, error, refetch } = useQuery<{
    getBankIncomeTransactions: {
      success: boolean
      message?: string
      transactions: BankIncomeTransaction[]
    }
  }>(GET_BANK_INCOME_TRANSACTIONS, {
    variables: {
      startDate,
      endDate,
      routeIds,
      onlyAbonos,
    },
    skip: skip || routeIds.length === 0,
    fetchPolicy: 'network-only',
  })

  return {
    transactions: data?.getBankIncomeTransactions?.transactions || [],
    loading,
    error: error || null,
    refetch,
  }
}
