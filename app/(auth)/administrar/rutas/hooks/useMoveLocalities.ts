import { useState, useCallback } from 'react'
import { useMutation } from '@apollo/client'
import { useToast } from '@/hooks/use-toast'
import { UPDATE_EMPLOYEE_ROUTES } from '@/graphql/mutations/routeManagement'
import type { RouteWithStats } from '../types'

/**
 * Hook for managing locality selection and move operations
 * Handles multi-select state and mutation execution
 */
export function useMoveLocalities(sourceRoute: RouteWithStats) {
  const { toast } = useToast()
  const [selectedLocalities, setSelectedLocalities] = useState<Set<string>>(new Set())
  const [targetRouteId, setTargetRouteId] = useState<string>('')
  const [isMoving, setIsMoving] = useState(false)

  const [updateEmployeeRoutes] = useMutation(UPDATE_EMPLOYEE_ROUTES, {
    refetchQueries: ['GetRoutesWithStats'],
  })

  const toggleLocality = useCallback((employeeId: string) => {
    setSelectedLocalities((prev) => {
      const next = new Set(prev)
      if (next.has(employeeId)) {
        next.delete(employeeId)
      } else {
        next.add(employeeId)
      }
      return next
    })
  }, [])

  const handleMove = useCallback(async () => {
    if (!targetRouteId || selectedLocalities.size === 0) return

    setIsMoving(true)

    try {
      // Execute mutations sequentially for each selected locality
      for (const employeeId of selectedLocalities) {
        await updateEmployeeRoutes({
          variables: { employeeId, routeIds: [targetRouteId] },
        })
      }

      toast({
        title: 'Localities moved',
        description: `${selectedLocalities.size} ${
          selectedLocalities.size === 1 ? 'locality' : 'localities'
        } moved successfully`,
      })

      // Reset state
      setSelectedLocalities(new Set())
      setTargetRouteId('')
    } catch (error) {
      console.error('Error moving localities:', error)
      toast({
        title: 'Error',
        description: 'Error moving localities. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsMoving(false)
    }
  }, [targetRouteId, selectedLocalities, updateEmployeeRoutes, toast])

  const clearSelection = useCallback(() => {
    setSelectedLocalities(new Set())
    setTargetRouteId('')
  }, [])

  return {
    selectedLocalities,
    targetRouteId,
    isMoving,
    toggleLocality,
    setTargetRouteId,
    handleMove,
    clearSelection,
  }
}
