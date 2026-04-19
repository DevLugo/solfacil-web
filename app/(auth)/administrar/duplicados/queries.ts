import { gql } from '@apollo/client'

export const FIND_DUPLICATE_PERSONAL_DATA = gql`
  query FindDuplicatePersonalData {
    findDuplicatePersonalData {
      totalGroups
      highConfidenceCount
      reviewCount
      blockedCount
      groups {
        groupKey
        confidence
        locationId
        locationName
        autoSurvivorId
        hasEmployeeConflict
        hasBorrowerConflict
        records {
          id
          fullName
          clientCode
          birthDate
          hasEmployee
          hasBorrower
          totalLoansAsBorrower
          loansAsCollateralCount
          phonesCount
          addressesCount
          documentPhotosCount
        }
      }
    }
  }
`

export const FIND_DUPLICATE_ACTIVE_LOANS = gql`
  query FindDuplicateActiveLoans {
    findDuplicateActiveLoans {
      totalBorrowers
      groups {
        borrowerId
        clientName
        clientCode
        oldLoanId
        newLoanId
        loans {
          id
          signDate
          requestedAmount
          totalPaid
          pendingAmount
          paymentsCount
          previousLoan
          status
        }
      }
    }
  }
`

export const MERGE_PERSONAL_DATA_GROUP = gql`
  mutation MergePersonalDataGroup($groupKey: String!, $survivorId: ID!) {
    mergePersonalDataGroup(groupKey: $groupKey, survivorId: $survivorId) {
      merged
    }
  }
`

export const MERGE_ALL_HIGH_CONFIDENCE = gql`
  mutation MergeAllHighConfidencePersonalData {
    mergeAllHighConfidencePersonalData {
      successCount
      errorCount
      errors
    }
  }
`

export const FIX_DUPLICATE_ACTIVE_LOAN_GROUP = gql`
  mutation FixDuplicateActiveLoanGroup($borrowerId: ID!) {
    fixDuplicateActiveLoanGroup(borrowerId: $borrowerId) {
      modified
    }
  }
`

export const FIX_ALL_DUPLICATE_ACTIVE_LOANS = gql`
  mutation FixAllDuplicateActiveLoans {
    fixAllDuplicateActiveLoans {
      successCount
      errorCount
      errors
    }
  }
`

export const SEARCH_PERSONAL_DATA_FOR_MERGE = gql`
  query SearchPersonalDataForMerge($query: String!, $limit: Int) {
    searchPersonalDataForMerge(query: $query, limit: $limit) {
      id
      fullName
      clientCode
      birthDate
      hasEmployee
      hasBorrower
      totalLoansAsBorrower
      loansAsCollateralCount
      phonesCount
      addressesCount
      documentPhotosCount
    }
  }
`

export const MERGE_TWO_PERSONAL_DATA = gql`
  mutation MergeTwoPersonalData($survivorId: ID!, $sourceId: ID!, $force: Boolean) {
    mergeTwoPersonalData(survivorId: $survivorId, sourceId: $sourceId, force: $force) {
      merged
    }
  }
`

// ============================================================
// Types
// ============================================================

export type DuplicateConfidence = 'HIGH' | 'REVIEW' | 'BLOCKED'

export interface PersonalDataDuplicateRecord {
  id: string
  fullName: string
  clientCode: string
  birthDate: string | null
  hasEmployee: boolean
  hasBorrower: boolean
  totalLoansAsBorrower: number
  loansAsCollateralCount: number
  phonesCount: number
  addressesCount: number
  documentPhotosCount: number
}

export interface PersonalDataDuplicateGroup {
  groupKey: string
  confidence: DuplicateConfidence
  locationId: string | null
  locationName: string | null
  autoSurvivorId: string
  records: PersonalDataDuplicateRecord[]
  hasEmployeeConflict: boolean
  hasBorrowerConflict: boolean
}

export interface PersonalDataDuplicatesReport {
  totalGroups: number
  highConfidenceCount: number
  reviewCount: number
  blockedCount: number
  groups: PersonalDataDuplicateGroup[]
}

export interface DuplicateActiveLoanInfo {
  id: string
  signDate: string
  requestedAmount: string
  totalPaid: string
  pendingAmount: string
  paymentsCount: number
  previousLoan: string | null
  status: string
}

export interface DuplicateActiveLoanGroup {
  borrowerId: string
  clientName: string
  clientCode: string | null
  loans: DuplicateActiveLoanInfo[]
  oldLoanId: string
  newLoanId: string
}

export interface DuplicateActiveLoansReport {
  totalBorrowers: number
  groups: DuplicateActiveLoanGroup[]
}

export interface MergeBatchResult {
  successCount: number
  errorCount: number
  errors: string[]
}
