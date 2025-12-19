import { gql } from '@apollo/client'

/**
 * Query to get loans by week for document management
 * Optionally filter by location
 * Returns loans with their associated documents, borrower info, and loan type
 */
export const GET_LOANS_BY_WEEK_LOCATION = gql`
  query GetLoansByWeekAndLocation(
    $year: Int!
    $weekNumber: Int!
    $locationId: ID
    $limit: Int
    $offset: Int
  ) {
    loansByWeekAndLocation(
      year: $year
      weekNumber: $weekNumber
      locationId: $locationId
      limit: $limit
      offset: $offset
    ) {
      id
      amountGived
      signDate
      status
      borrower {
        id
        personalData {
          id
          fullName
          clientCode
          phones {
            id
            number
          }
        }
      }
      collaterals {
        id
        fullName
        clientCode
        phones {
          id
          number
        }
      }
      loantype {
        id
        name
        weekDuration
        rate
      }
      documentPhotos {
        id
        title
        description
        photoUrl
        publicId
        documentType
        isError
        errorDescription
        isMissing
        personalData {
          id
          fullName
        }
        loan {
          id
        }
        createdAt
        updatedAt
      }
      lead {
        id
        personalData {
          id
          fullName
        }
        location {
          id
          name
        }
      }
    }
  }
`

/**
 * Query to get the current week information
 * Used to initialize the week selector with the current week
 */
export const GET_CURRENT_WEEK = gql`
  query GetCurrentWeek {
    currentWeek {
      year
      weekNumber
      startDate
      endDate
    }
  }
`

/**
 * Query to get a single document photo by ID
 */
export const GET_DOCUMENT_PHOTO = gql`
  query GetDocumentPhoto($id: ID!) {
    documentPhoto(id: $id) {
      id
      title
      description
      photoUrl
      publicId
      documentType
      isError
      errorDescription
      isMissing
      loan {
        id
        borrower {
          id
          personalData {
            fullName
          }
        }
      }
      createdAt
      updatedAt
    }
  }
`

/**
 * Query to get documents with errors for a specific route
 * Useful for reviewing problematic documents
 */
export const GET_DOCUMENTS_WITH_ERRORS = gql`
  query GetDocumentsWithErrors($routeId: ID) {
    documentsWithErrors(routeId: $routeId) {
      id
      title
      photoUrl
      publicId
      documentType
      isError
      errorDescription
      isMissing
      loan {
        id
        borrower {
          personalData {
            fullName
            clientCode
          }
        }
      }
      createdAt
    }
  }
`

/**
 * Query to get all documents for a specific loan
 * Used in document gallery to show all documents
 */
export const GET_LOAN_DOCUMENTS = gql`
  query GetLoanDocuments($loanId: ID!) {
    loan(id: $loanId) {
      id
      documentPhotos {
        id
        photoUrl
        publicId
        documentType
        isError
        isMissing
        errorDescription
        personalData {
          id
          fullName
        }
      }
    }
  }
`
