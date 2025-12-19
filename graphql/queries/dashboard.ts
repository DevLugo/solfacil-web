import { gql } from '@apollo/client'

export const DASHBOARD_METRICS_QUERY = gql`
  query DashboardMetrics($routeIds: [ID!]!, $year: Int!, $month: Int!) {
    financialReport(routeIds: $routeIds, year: $year, month: $month) {
      summary {
        activeLoans
        activeLoansBreakdown {
          total
          alCorriente
          carteraVencida
        }
        totalPortfolio
        totalPaid
        pendingAmount
        averagePayment
      }
      weeklyData {
        week
        date
        loansGranted
        paymentsReceived
        expectedPayments
        recoveryRate
      }
      comparisonData {
        previousMonth {
          activeLoans
          totalPortfolio
          totalPaid
          pendingAmount
        }
        growth
        trend
      }
      performanceMetrics {
        recoveryRate
        averageTicket
        activeLoansCount
        finishedLoansCount
      }
    }
  }
`

export const DASHBOARD_ACCOUNTS_QUERY = gql`
  query DashboardAccounts($routeId: ID) {
    accounts(routeId: $routeId) {
      id
      name
      type
      accountBalance
    }
  }
`

export const DASHBOARD_RECENT_ACTIVITY_QUERY = gql`
  query DashboardRecentActivity($routeId: ID, $limit: Int) {
    transactions(routeId: $routeId, limit: $limit) {
      edges {
        node {
          id
          amount
          date
          type
          incomeSource
          expenseSource
          loan {
            id
            borrower {
              id
              personalData {
                id
                fullName
              }
            }
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
    }
  }
`

// Combined query for dashboard (reduces network requests)
export const DASHBOARD_FULL_QUERY = gql`
  query DashboardFull($routeIds: [ID!]!, $routeId: ID, $year: Int!, $month: Int!, $limit: Int) {
    financialReport(routeIds: $routeIds, year: $year, month: $month) {
      summary {
        activeLoans
        activeLoansBreakdown {
          total
          alCorriente
          carteraVencida
        }
        totalPortfolio
        totalPaid
        pendingAmount
        averagePayment
      }
      weeklyData {
        week
        date
        loansGranted
        paymentsReceived
        expectedPayments
        recoveryRate
      }
      comparisonData {
        previousMonth {
          activeLoans
          totalPortfolio
          totalPaid
          pendingAmount
        }
        growth
        trend
      }
      performanceMetrics {
        recoveryRate
        averageTicket
        activeLoansCount
        finishedLoansCount
      }
    }
    accounts(routeId: $routeId) {
      id
      name
      type
      accountBalance
    }
    transactions(routeId: $routeId, limit: $limit) {
      edges {
        node {
          id
          amount
          date
          type
          incomeSource
          expenseSource
          loan {
            id
            borrower {
              id
              personalData {
                id
                fullName
              }
            }
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
    }
  }
`
