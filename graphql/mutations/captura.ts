import { gql } from '@apollo/client'

export const START_CAPTURA_PDF = gql`
  mutation StartCapturaPdf($file: Upload!, $routeCode: String!, $routeId: ID!, $date: String!, $fileName: String) {
    startCapturaPdf(file: $file, routeCode: $routeCode, routeId: $routeId, date: $date, fileName: $fileName) {
      jobId
    }
  }
`

export const SAVE_CAPTURA_EDITS = gql`
  mutation SaveCapturaEdits($jobId: ID!, $editedResult: JSON!) {
    saveCapturaEdits(jobId: $jobId, editedResult: $editedResult) {
      id
      status
      editedResult
      updatedAt
    }
  }
`

export const DELETE_CAPTURA_JOB = gql`
  mutation DeleteCapturaJob($jobId: ID!) {
    deleteCapturaJob(jobId: $jobId)
  }
`

export const CONFIRM_CAPTURA_JOB = gql`
  mutation ConfirmCapturaJob($jobId: ID!, $expectedFinalBalance: Float) {
    confirmCapturaJob(jobId: $jobId, expectedFinalBalance: $expectedFinalBalance) {
      success
      job {
        id
        status
        confirmedAt
        confirmationData
        error
      }
      lprCount
      gastoCount
      loanCount
    }
  }
`

export const ROLLBACK_CAPTURA_CONFIRMATION = gql`
  mutation RollbackCapturaConfirmation($jobId: ID!) {
    rollbackCapturaConfirmation(jobId: $jobId) {
      success
      job {
        id
        status
        confirmedAt
        confirmationData
      }
      rolledBackLoans
      rolledBackGastos
      rolledBackLprs
    }
  }
`
