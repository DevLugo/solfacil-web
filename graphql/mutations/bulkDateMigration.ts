import { gql } from '@apollo/client'

export const PREVIEW_BULK_DATE_MIGRATION = gql`
  query PreviewBulkDateMigration($input: BulkDateMigrationInput!) {
    previewBulkDateMigration(input: $input) {
      transactionsCount
      loanPaymentsCount
      loansCount
      totalRecords
    }
  }
`

export const EXECUTE_BULK_DATE_MIGRATION = gql`
  mutation ExecuteBulkDateMigration($input: BulkDateMigrationInput!) {
    executeBulkDateMigration(input: $input) {
      success
      message
      transactionsUpdated
      loanPaymentsUpdated
      loansUpdated
      totalUpdated
    }
  }
`
