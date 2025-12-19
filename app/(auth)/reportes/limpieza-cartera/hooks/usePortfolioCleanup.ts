'use client'

import { useState, useCallback } from 'react'
import { useQuery, useMutation, useLazyQuery } from '@apollo/client'
import {
  PREVIEW_PORTFOLIO_CLEANUP,
  GET_PORTFOLIO_CLEANUPS,
} from '@/graphql/queries/portfolioCleanup'
import {
  CREATE_PORTFOLIO_CLEANUP,
  UPDATE_PORTFOLIO_CLEANUP,
  DELETE_PORTFOLIO_CLEANUP,
} from '@/graphql/mutations/portfolioCleanup'

// Types
export interface CleanupLoanPreview {
  id: string
  clientName: string
  clientCode: string
  signDate: string
  pendingAmount: string
  routeName: string
}

export interface CleanupPreview {
  totalLoans: number
  totalPendingAmount: string
  sampleLoans: CleanupLoanPreview[]
}

export interface PortfolioCleanup {
  id: string
  name: string
  description: string | null
  cleanupDate: string
  toDate: string | null
  excludedLoansCount: number
  excludedAmount: string
  route: {
    id: string
    name: string
  } | null
  executedBy: {
    id: string
    email: string
  }
  createdAt: string
}

export interface CreateCleanupInput {
  name: string
  description?: string
  cleanupDate: Date
  maxSignDate: Date
  routeId?: string
}

export interface UpdateCleanupInput {
  name?: string
  description?: string
  cleanupDate?: Date
}

export function usePortfolioCleanup() {
  const [previewData, setPreviewData] = useState<CleanupPreview | null>(null)

  // Query for cleanup history
  const {
    data: cleanupsData,
    loading: cleanupsLoading,
    error: cleanupsError,
    refetch: refetchCleanups,
  } = useQuery(GET_PORTFOLIO_CLEANUPS, {
    variables: { limit: 50, offset: 0 },
  })

  // Lazy query for preview
  const [
    fetchPreview,
    { loading: previewLoading, error: previewError },
  ] = useLazyQuery(PREVIEW_PORTFOLIO_CLEANUP, {
    fetchPolicy: 'network-only',
    onCompleted: (data) => {
      setPreviewData(data.previewPortfolioCleanup)
    },
  })

  // Mutation for creating cleanup
  const [createCleanupMutation, { loading: createLoading }] = useMutation(
    CREATE_PORTFOLIO_CLEANUP,
    {
      onCompleted: () => {
        refetchCleanups()
        setPreviewData(null)
      },
    }
  )

  // Mutation for updating cleanup
  const [updateCleanupMutation, { loading: updateLoading }] = useMutation(
    UPDATE_PORTFOLIO_CLEANUP,
    {
      onCompleted: () => {
        refetchCleanups()
      },
    }
  )

  // Mutation for deleting cleanup
  const [deleteCleanupMutation, { loading: deleteLoading }] = useMutation(
    DELETE_PORTFOLIO_CLEANUP,
    {
      onCompleted: () => {
        refetchCleanups()
      },
    }
  )

  // Preview handler
  const getPreview = useCallback(
    async (maxSignDate: Date, routeId?: string) => {
      setPreviewData(null)
      await fetchPreview({
        variables: {
          maxSignDate: maxSignDate.toISOString(),
          routeId: routeId || null,
        },
      })
    },
    [fetchPreview]
  )

  // Create cleanup handler
  const createCleanup = useCallback(
    async (input: CreateCleanupInput) => {
      const result = await createCleanupMutation({
        variables: {
          input: {
            name: input.name,
            description: input.description,
            cleanupDate: input.cleanupDate.toISOString(),
            maxSignDate: input.maxSignDate.toISOString(),
            routeId: input.routeId || null,
          },
        },
      })
      return result.data?.createPortfolioCleanup
    },
    [createCleanupMutation]
  )

  // Clear preview
  const clearPreview = useCallback(() => {
    setPreviewData(null)
  }, [])

  // Update cleanup handler
  const updateCleanup = useCallback(
    async (id: string, input: UpdateCleanupInput) => {
      const result = await updateCleanupMutation({
        variables: {
          id,
          input: {
            name: input.name,
            description: input.description,
            cleanupDate: input.cleanupDate?.toISOString(),
          },
        },
      })
      return result.data?.updatePortfolioCleanup
    },
    [updateCleanupMutation]
  )

  // Delete cleanup handler
  const deleteCleanup = useCallback(
    async (id: string) => {
      const result = await deleteCleanupMutation({
        variables: { id },
      })
      return result.data?.deletePortfolioCleanup
    },
    [deleteCleanupMutation]
  )

  return {
    // Cleanup history
    cleanups: (cleanupsData?.portfolioCleanups || []) as PortfolioCleanup[],
    cleanupsLoading,
    cleanupsError,
    refetchCleanups,

    // Preview
    preview: previewData,
    previewLoading,
    previewError,
    getPreview,
    clearPreview,

    // Create
    createCleanup,
    createLoading,

    // Update
    updateCleanup,
    updateLoading,

    // Delete
    deleteCleanup,
    deleteLoading,
  }
}
