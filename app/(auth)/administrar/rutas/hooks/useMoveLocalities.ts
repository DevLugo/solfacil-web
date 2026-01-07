import { useState, useCallback } from 'react'
import { useMutation, useQuery } from '@apollo/client'
import { useToast } from '@/hooks/use-toast'
import { UPDATE_EMPLOYEE_ROUTES } from '@/graphql/mutations/routeManagement'
import { CHANGE_LOCATION_ROUTE } from '@/graphql/mutations/locationHistory'
import { GET_LOCATION_ROUTE_HISTORY } from '@/graphql/queries/locationHistory'
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

  const [changeLocationRoute] = useMutation(CHANGE_LOCATION_ROUTE, {
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
      // Execute mutations sequentially for each selected locality
      for (const employeeId of selectedLocalities) {
        // Update employee routes (existing behavior)
        await updateEmployeeRoutes({
          variables: { employeeId, routeIds: [targetRouteId] },
        })
      }

      // Also update location route history if locationIds are provided
      if (localityIds && localityIds.length > 0) {
        for (const locationId of localityIds) {
          if (locationId) {
            await changeLocationRoute({
              variables: {
                locationId,
                routeId: targetRouteId,
                effectiveDate: effectiveDate.toISOString(),
              },
            })
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
  }, [targetRouteId, selectedLocalities, effectiveDate, updateEmployeeRoutes, changeLocationRoute, toast])

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
