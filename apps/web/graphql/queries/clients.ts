import { gql } from '@apollo/client'

// ============================================================
// CLIENT SEARCH - Autocomplete
// ============================================================

export const SEARCH_CLIENTS_QUERY = gql`
  query SearchClients(
    $searchTerm: String!
    $routeId: ID
    $locationId: ID
    $limit: Int
  ) {
    searchClients(
      searchTerm: $searchTerm
      routeId: $routeId
      locationId: $locationId
      limit: $limit
    ) {
      id
      name
      clientCode
      phone
      address
      route
      location
      municipality
      state
      latestLoanDate
      hasLoans
      hasBeenCollateral
      totalLoans
      activeLoans
      finishedLoans
      collateralLoans
    }
  }
`

// ============================================================
// CLIENT HISTORY - Full client history
// ============================================================

export const GET_CLIENT_HISTORY_QUERY = gql`
  query GetClientHistory($clientId: ID!, $routeId: ID, $locationId: ID) {
    getClientHistory(
      clientId: $clientId
      routeId: $routeId
      locationId: $locationId
    ) {
      client {
        id
        fullName
        clientCode
        phones
        addresses {
          street
          city
          location
          route
        }
        leader {
          name
          route
          location
          municipality
          state
          phone
        }
      }
      summary {
        totalLoansAsClient
        totalLoansAsCollateral
        activeLoansAsClient
        activeLoansAsCollateral
        totalAmountRequestedAsClient
        totalAmountPaidAsClient
        currentPendingDebtAsClient
        hasBeenClient
        hasBeenCollateral
      }
      loansAsClient {
        id
        signDate
        signDateFormatted
        finishedDate
        finishedDateFormatted
        renewedDate
        loanType
        amountRequested
        totalAmountDue
        interestAmount
        totalPaid
        pendingDebt
        daysSinceSign
        status
        wasRenewed
        weekDuration
        rate
        leadName
        routeName
        paymentsCount
        payments {
          id
          amount
          receivedAt
          receivedAtFormatted
          type
          paymentMethod
          paymentNumber
          balanceBeforePayment
          balanceAfterPayment
        }
        noPaymentPeriods {
          id
          startDate
          endDate
          startDateFormatted
          endDateFormatted
          weekCount
        }
        renewedFrom
        renewedTo
        avalName
        avalPhone
        clientName
        clientDui
      }
      loansAsCollateral {
        id
        signDate
        signDateFormatted
        finishedDate
        finishedDateFormatted
        renewedDate
        loanType
        amountRequested
        totalAmountDue
        interestAmount
        totalPaid
        pendingDebt
        daysSinceSign
        status
        wasRenewed
        weekDuration
        rate
        leadName
        routeName
        paymentsCount
        payments {
          id
          amount
          receivedAt
          receivedAtFormatted
          type
          paymentMethod
          paymentNumber
          balanceBeforePayment
          balanceAfterPayment
        }
        noPaymentPeriods {
          id
          startDate
          endDate
          startDateFormatted
          endDateFormatted
          weekCount
        }
        renewedFrom
        renewedTo
        avalName
        avalPhone
        clientName
        clientDui
      }
    }
  }
`

// ============================================================
// LOAN DOCUMENT PHOTOS - Lazy load photos for a loan
// ============================================================

export const GET_LOAN_DOCUMENT_PHOTOS_QUERY = gql`
  query GetLoanDocumentPhotos($loanId: ID!, $limit: Int) {
    documentPhotos(loanId: $loanId, limit: $limit) {
      id
      title
      description
      photoUrl
      publicId
      documentType
      isError
      errorDescription
      isMissing
      createdAt
      personalData {
        id
        fullName
      }
      loan {
        id
        borrower {
          id
          personalData {
            id
            fullName
          }
        }
        collaterals {
          id
          fullName
        }
      }
    }
  }
`
