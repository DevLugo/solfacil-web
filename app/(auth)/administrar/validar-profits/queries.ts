import { gql } from '@apollo/client'

export const GET_ROUTES_FOR_AUDIT = gql`
  query GetRoutesForProfitAudit {
    routes {
      id
      name
    }
  }
`

export const PROFIT_AUDIT_REPORT = gql`
  query ProfitAuditReport($fromDate: DateTime!, $toDate: DateTime!, $routeId: ID) {
    profitAuditReport(fromDate: $fromDate, toDate: $toDate, routeId: $routeId) {
      totalLoans
      totalDifference
      totalAffectedEntries
      byMonth {
        month
        affectedLoansCount
        currentProfitTotal
        expectedProfitTotal
        differenceTotal
        affectedEntriesCount
      }
    }
  }
`

export const PROFIT_AUDIT_LOANS = gql`
  query ProfitAuditLoans(
    $fromDate: DateTime!
    $toDate: DateTime!
    $routeId: ID
    $inconsistencyType: ProfitInconsistencyType
    $limit: Int
    $offset: Int
  ) {
    profitAuditLoans(
      fromDate: $fromDate
      toDate: $toDate
      routeId: $routeId
      inconsistencyType: $inconsistencyType
      limit: $limit
      offset: $offset
    ) {
      loanId
      clientName
      signDate
      requestedAmount
      rate
      isRenewal
      currentProfit
      expectedProfit
      difference
      inconsistencyType
      affectedEntriesCount
    }
  }
`

export const PROFIT_AUDIT_FIX_STATUS = gql`
  query ProfitAuditFixStatus($jobId: ID!) {
    profitAuditFixStatus(jobId: $jobId) {
      jobId
      status
      phase
      totalLoans
      processedLoans
      loansUpdated
      entriesUpdated
      totalDifferenceApplied
      dryRun
      startedAt
      completedAt
      error
      errors
    }
  }
`

export const START_PROFIT_AUDIT_FIX = gql`
  mutation StartProfitAuditFix(
    $fromDate: DateTime!
    $toDate: DateTime!
    $routeId: ID
    $dryRun: Boolean
  ) {
    startProfitAuditFix(
      fromDate: $fromDate
      toDate: $toDate
      routeId: $routeId
      dryRun: $dryRun
    ) {
      jobId
    }
  }
`

// ============================================================
// Types
// ============================================================

export type ProfitInconsistencyType = 'HEADER_ONLY' | 'ENTRIES_ONLY' | 'BOTH'
export type ProfitAuditFixPhase = 'DETECTING' | 'FIXING_HEADERS' | 'FIXING_ENTRIES' | 'DONE'
export type ProfitAuditFixStatus = 'PROCESSING' | 'COMPLETED' | 'FAILED'

export interface ProfitAuditBucket {
  month: string
  affectedLoansCount: number
  currentProfitTotal: number
  expectedProfitTotal: number
  differenceTotal: number
  affectedEntriesCount: number
}

export interface ProfitAuditLoan {
  loanId: string
  clientName: string | null
  signDate: string
  requestedAmount: number
  rate: number
  isRenewal: boolean
  currentProfit: number
  expectedProfit: number
  difference: number
  inconsistencyType: ProfitInconsistencyType
  affectedEntriesCount: number
}

export interface ProfitAuditReport {
  totalLoans: number
  totalDifference: number
  totalAffectedEntries: number
  byMonth: ProfitAuditBucket[]
}

export interface ProfitAuditFixJob {
  jobId: string
  status: ProfitAuditFixStatus
  phase: ProfitAuditFixPhase
  totalLoans: number
  processedLoans: number
  loansUpdated: number
  entriesUpdated: number
  totalDifferenceApplied: number
  dryRun: boolean
  startedAt: string
  completedAt: string | null
  error: string | null
  errors: string[]
}

export interface RouteOption {
  id: string
  name: string
}
