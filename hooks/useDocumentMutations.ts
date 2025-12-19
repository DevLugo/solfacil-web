/**
 * Custom hook for document mutations
 * Encapsulates common refetch queries and mutation logic
 */

import { useMutation } from '@apollo/client'
import {
  MARK_DOCUMENT_AS_MISSING,
  DELETE_DOCUMENT_PHOTO,
  UPDATE_DOCUMENT_PHOTO,
} from '@/graphql/mutations/documents'
import { GET_LOAN_DOCUMENTS } from '@/graphql/queries/documents'
import { REFETCH_QUERIES_KEYS } from '@/constants/documents'

interface UseDocumentMutationsOptions {
  loanId: string
}

/**
 * Hook that provides document mutations with consistent refetch queries
 * @param options Configuration options
 * @returns Object with mutation functions and loading states
 */
export function useDocumentMutations({ loanId }: UseDocumentMutationsOptions) {
  // Build refetch queries array - DRY principle
  const refetchQueries = [
    REFETCH_QUERIES_KEYS.LOANS_BY_WEEK,
    { query: GET_LOAN_DOCUMENTS, variables: { loanId } },
  ]

  const [markAsMissing, { loading: markingAsMissing }] = useMutation(
    MARK_DOCUMENT_AS_MISSING,
    {
      refetchQueries,
      awaitRefetchQueries: true,
    }
  )

  const [deleteDocument, { loading: deletingDocument }] = useMutation(
    DELETE_DOCUMENT_PHOTO,
    {
      refetchQueries,
      awaitRefetchQueries: true,
    }
  )

  const [updateDocument, { loading: updatingDocument }] = useMutation(
    UPDATE_DOCUMENT_PHOTO,
    {
      refetchQueries,
      awaitRefetchQueries: true,
    }
  )

  return {
    markAsMissing,
    deleteDocument,
    updateDocument,
    loading: {
      markingAsMissing,
      deletingDocument,
      updatingDocument,
    },
  }
}
