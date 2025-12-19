import { gql } from '@apollo/client'

export const GET_ROUTES = gql`
  query GetRoutes {
    routes {
      id
      name
    }
  }
`

export const GET_MONTHLY_EXPENSES = gql`
  query GetMonthlyExpenses($fromDate: DateTime!, $toDate: DateTime!, $routeId: ID) {
    transactions(
      type: EXPENSE
      fromDate: $fromDate
      toDate: $toDate
      routeId: $routeId
      limit: 5000
    ) {
      edges {
        node {
          id
          amount
          date
          type
          expenseSource
          sourceAccount {
            id
            name
            type
          }
          route {
            id
            name
          }
          lead {
            id
            personalData {
              id
              fullName
            }
          }
        }
      }
      totalCount
    }
  }
`

export const GET_EXPENSES_FOR_PERIOD = gql`
  query GetExpensesForPeriod($fromDate: DateTime!, $toDate: DateTime!, $routeId: ID) {
    transactions(
      type: EXPENSE
      fromDate: $fromDate
      toDate: $toDate
      routeId: $routeId
      limit: 50000
    ) {
      edges {
        node {
          id
          amount
          date
          expenseSource
          route {
            id
          }
        }
      }
      totalCount
    }
  }
`
