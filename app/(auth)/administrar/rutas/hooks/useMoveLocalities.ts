import { useState, useCallback } from 'react'
import { useMutation } from '@apollo/client'
import { useToast } from '@/hooks/use-toast'
import { UPDATE_EMPLOYEE_ROUTES } from '@/graphql/mutations/routeManagement'
import { BATCH_CHANGE_LOCATION_ROUTES } from '@/graphql/mutations/locationHistory'
import type { RouteWithStats } from '../types'

/**
 * Hook for managing locality selection and move operations
 * Handles multi-select state and mutation execution
 * Now supports effective date for location route history
 */
export function useMoveLocalities(sourceRoute: RouteWithStats) {
  const { toast } = useToast()
  const [selectedLocalities, setSelectedLocalities] = useState<Set<string>>(new Set())
  const [targetRouteId, setTargetRouteId] = useState<string>('')
  const [isMoving, setIsMoving] = useState(false)
  const [effectiveDate, setEffectiveDate] = useState<Date>(new Date())

  const [updateEmployeeRoutes] = useMutation(UPDATE_EMPLOYEE_ROUTES, {
    refetchQueries: ['GetRoutesWithStats'],
  })

  const [batchChangeLocationRoutes] = useMutation(BATCH_CHANGE_LOCATION_ROUTES, {
    refetchQueries: ['GetRoutesWithStats', 'GetLocationRouteHistory'],
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

  const handleMove = useCallback(async (localityIds?: string[]) => {
    if (!targetRouteId || selectedLocalities.size === 0) return

    setIsMoving(true)

    try {
      // Execute mutations sequentially for each selected employee (existing behavior)
      for (const employeeId of selectedLocalities) {
        await updateEmployeeRoutes({
          variables: { employeeId, routeIds: [targetRouteId] },
        })
      }

      // Batch update location route history if locationIds are provided
      if (localityIds && localityIds.length > 0) {
        const validLocationIds = localityIds.filter(Boolean)
        if (validLocationIds.length > 0) {
          const result = await batchChangeLocationRoutes({
            variables: {
              input: {
                locationIds: validLocationIds,
                newRouteId: targetRouteId,
                effectiveDate: effectiveDate.toISOString(),
              },
            },
          })

          const batchResult = result.data?.batchChangeLocationRoutes
          if (batchResult && batchResult.errors?.length > 0) {
            console.warn('Some locations had errors:', batchResult.errors)
          }
        }
      }

      toast({
        title: 'Localidades movidas',
        description: `${selectedLocalities.size} ${
          selectedLocalities.size === 1 ? 'localidad movida' : 'localidades movidas'
        } exitosamente con fecha efectiva ${effectiveDate.toLocaleDateString()}`,
      })

      // Reset state
      setSelectedLocalities(new Set())
      setTargetRouteId('')
      setEffectiveDate(new Date())
    } catch (error) {
      console.error('Error moving localities:', error)
      toast({
        title: 'Error',
        description: 'Error al mover localidades. Intenta de nuevo.',
        variant: 'destructive',
      })
    } finally {
      setIsMoving(false)
    }
  }, [targetRouteId, selectedLocalities, effectiveDate, updateEmployeeRoutes, batchChangeLocationRoutes, toast])

  const clearSelection = useCallback(() => {
    setSelectedLocalities(new Set())
    setTargetRouteId('')
    setEffectiveDate(new Date())
  }, [])

  return {
    selectedLocalities,
    targetRouteId,
    isMoving,
    effectiveDate,
    toggleLocality,
    setTargetRouteId,
    setEffectiveDate,
    handleMove,
    clearSelection,
  }
}
