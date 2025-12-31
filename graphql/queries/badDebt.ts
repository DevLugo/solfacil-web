import { gql } from '@apollo/client'

// ============================================================
// BAD DEBT CLIENTS - Lista de clientes morosos
// ============================================================

export const GET_BAD_DEBT_CLIENTS_QUERY = gql`
  query GetBadDebtClients(
    $routeId: ID
    $locationId: ID
    $limit: Int
    $offset: Int
  ) {
    badDebtClients(
      routeId: $routeId
      locationId: $locationId
      limit: $limit
      offset: $offset
    ) {
      totalCount
      hasMore
      clients {
        id
        loanId
        clientName
        clientCode
        clientPhone
        amountRequested
        totalAmountDue
        totalPaid
        pendingDebt
        locationName
        municipalityName
        routeName
        leadName
        leadPhone
        signDate
        badDebtDate
        cleanupDate
        lastPaymentDate
        isFromCleanup
        borrowerPersonalDataId
      }
    }
  }
`
