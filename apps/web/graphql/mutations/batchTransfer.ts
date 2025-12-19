import { gql } from '@apollo/client'

// ============================================================
// BATCH TRANSFER MUTATIONS - Para Operaciones Masivas
// ============================================================

export const DRAIN_ROUTES = gql`
  mutation DrainRoutes($input: DrainRoutesInput!) {
    drainRoutes(input: $input) {
      success
      message
      transactionsCreated
      totalAmount
      transactions {
        id
        amount
        date
        type
        expenseSource
        sourceAccount {
          id
          name
          amount
        }
        destinationAccount {
          id
          name
          amount
        }
        route {
          id
          name
        }
      }
    }
  }
`

export const DISTRIBUTE_MONEY = gql`
  mutation DistributeMoney($input: DistributeMoneyInput!) {
    distributeMoney(input: $input) {
      success
      message
      transactionsCreated
      totalAmount
      transactions {
        id
        amount
        date
        type
        expenseSource
        sourceAccount {
          id
          name
          amount
        }
        destinationAccount {
          id
          name
          amount
        }
        route {
          id
          name
        }
      }
    }
  }
`
