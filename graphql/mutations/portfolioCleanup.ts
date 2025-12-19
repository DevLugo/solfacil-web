import { gql } from '@apollo/client'

export const CREATE_PORTFOLIO_CLEANUP = gql`
  mutation CreatePortfolioCleanup($input: CreatePortfolioCleanupInput!) {
    createPortfolioCleanup(input: $input) {
      id
      name
      description
      cleanupDate
      toDate
      excludedLoansCount
      excludedAmount
      route {
        id
        name
      }
      executedBy {
        id
        email
      }
      createdAt
    }
  }
`

export const UPDATE_PORTFOLIO_CLEANUP = gql`
  mutation UpdatePortfolioCleanup($id: ID!, $input: UpdatePortfolioCleanupInput!) {
    updatePortfolioCleanup(id: $id, input: $input) {
      id
      name
      description
      cleanupDate
      toDate
      excludedLoansCount
      excludedAmount
      route {
        id
        name
      }
      executedBy {
        id
        email
      }
      createdAt
    }
  }
`

export const DELETE_PORTFOLIO_CLEANUP = gql`
  mutation DeletePortfolioCleanup($id: ID!) {
    deletePortfolioCleanup(id: $id)
  }
`
