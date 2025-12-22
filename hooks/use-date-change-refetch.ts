'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

interface UseDateChangeRefetchOptions {
  /**
   * The selected date to watch for changes
   */
  selectedDate: Date
  /**
   * Whether the refetch should be enabled (e.g., has required IDs)
   */
  enabled: boolean
  /**
   * Function(s) to call when date changes
   */
  refetchFn: (() => Promise<unknown>) | (() => Promise<unknown>)[]
}

interface UseDateChangeRefetchResult {
  /**
   * Whether a date-change refetch is in progress
   */
  isRefetching: boolean
  /**
   * Manually trigger a refetch
   */
  triggerRefetch: () => Promise<void>
}

/**
 * Hook to handle refetching data when a date changes.
 *
 * This is useful for Apollo queries that don't have the date in their variables
 * but need to refetch when the user selects a different date.
 *
 * @example
 * ```tsx
 * const { data, loading: loadingRaw, refetch } = useQuery(MY_QUERY, { ... })
 *
 * const { isRefetching } = useDateChangeRefetch({
 *   selectedDate,
 *   enabled: !!selectedLeadId,
 *   refetchFn: refetch,
 * })
 *
 * const loading = loadingRaw || isRefetching
 * ```
 *
 * @example With multiple refetch functions
 * ```tsx
 * const { isRefetching } = useDateChangeRefetch({
 *   selectedDate,
 *   enabled: !!selectedLeadId,
 *   refetchFn: [refetchLoans, refetchPayments, refetchAccounts],
 * })
 * ```
 */
export function useDateChangeRefetch({
  selectedDate,
  enabled,
  refetchFn,
}: UseDateChangeRefetchOptions): UseDateChangeRefetchResult {
  const [isRefetching, setIsRefetching] = useState(false)
  const previousDateRef = useRef<string>(selectedDate.toISOString())

  const triggerRefetch = useCallback(async () => {
    setIsRefetching(true)
    try {
      const fns = Array.isArray(refetchFn) ? refetchFn : [refetchFn]
      await Promise.all(fns.map(fn => fn()))
    } finally {
      setIsRefetching(false)
    }
  }, [refetchFn])

  useEffect(() => {
    const currentDateStr = selectedDate.toISOString().split('T')[0]
    const previousDateStr = previousDateRef.current.split('T')[0]

    if (currentDateStr !== previousDateStr && enabled) {
      previousDateRef.current = selectedDate.toISOString()
      triggerRefetch()
    }
  }, [selectedDate, enabled, triggerRefetch])

  return { isRefetching, triggerRefetch }
}
