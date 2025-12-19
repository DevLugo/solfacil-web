import { gql } from '@apollo/client'

export const PREVIEW_PORTFOLIO_CLEANUP = gql`
  query PreviewPortfolioCleanup($maxSignDate: DateTime!, $routeId: ID) {
    previewPortfolioCleanup(maxSignDate: $maxSignDate, routeId: $routeId) {
      totalLoans
      totalPendingAmount
      sampleLoans {
        id
        clientName
        clientCode
        signDate
        pendingAmount
        routeName
      }
    }
  }
`

export const GET_PORTFOLIO_CLEANUPS = gql`
  query GetPortfolioCleanups($limit: Int, $offset: Int) {
    portfolioCleanups(limit: $limit, offset: $offset) {
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
