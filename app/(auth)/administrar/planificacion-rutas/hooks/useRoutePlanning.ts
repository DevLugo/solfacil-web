'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useQuery, useMutation } from '@apollo/client'
import {
  GET_ALL_LOCATIONS_FOR_PLANNING,
  UPDATE_LOCATION_COORDINATES,
} from '@/graphql/queries/routePlanning'

export interface LocationForPlanning {
  locationId: string
  locationName: string
  latitude: number | null
  longitude: number | null
  totalClientes: number
  clientesActivos: number
  clientesEnCV: number
  clientesAlCorriente: number
  routeId: string
  routeName: string
}

export interface DayPlan {
  dayOfWeek: number
  locationIds: string[]
}

export interface AggregatedStats {
  totalLocations: number
  totalClientes: number
  clientesActivos: number
  clientesEnCV: number
  clientesAlCorriente: number
  totalDistanceKm: number
}

// ============================================================================
// Constants
// ============================================================================

const STORAGE_KEY_PREFIX = 'route-planning-day-plans-'
const EARTH_RADIUS_KM = 6371
const DAYS_IN_WEEK = 6 // Monday to Saturday

/** Generate empty day plans for the week (Mon-Sat) */
const createEmptyDayPlans = (): DayPlan[] =>
  Array.from({ length: DAYS_IN_WEEK }, (_, i) => ({ dayOfWeek: i, locationIds: [] }))

// ============================================================================
// Utility Functions
// ============================================================================

/** Check if a location has valid coordinates */
const hasValidCoordinates = (l: LocationForPlanning): boolean =>
  l.latitude !== null && l.longitude !== null

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180

/**
 * Calculate distance between two coordinates using Haversine formula.
 * Returns distance in kilometers.
 *
 * NOTE: This is a local copy of the function from @solufacil/business-logic
 * because the business-logic package is server-only and cannot be imported
 * in client components. The implementation is identical to ensure consistency.
 *
 * @see api/packages/business-logic/src/utils/geo.ts
 */
function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLat = toRadians(lat2 - lat1)
  const dLon = toRadians(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return EARTH_RADIUS_KM * c
}

/**
 * Hook for managing route planning state and operations
 * Handles location selection, day assignments, and distance calculations
 *
 * @param routeIds - Array of route IDs to show (empty array = all routes)
 */
export function useRoutePlanning(routeIds: string[]) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [dayPlans, setDayPlans] = useState<DayPlan[]>(createEmptyDayPlans)
  const [editingLocationId, setEditingLocationId] = useState<string | null>(null)

  // Fetch locations for the selected routes (or all if none selected)
  const { data, loading, error, refetch } = useQuery(GET_ALL_LOCATIONS_FOR_PLANNING, {
    variables: { routeIds: routeIds.length > 0 ? routeIds : null },
    fetchPolicy: 'cache-and-network',
  })

  // Mutation to update coordinates
  const [updateCoordinatesMutation, { loading: updatingCoordinates }] = useMutation(
    UPDATE_LOCATION_COORDINATES,
    {
      onCompleted: () => {
        refetch()
        setEditingLocationId(null)
      },
    }
  )

  const locations = useMemo(() => {
    return (data?.allLocationsForPlanning ?? []) as LocationForPlanning[]
  }, [data])

  // Generate storage key based on selected routes
  const storageKey = useMemo(() => {
    const sortedIds = [...routeIds].sort().join('-')
    return `${STORAGE_KEY_PREFIX}${sortedIds || 'all'}`
  }, [routeIds])

  // Load day plans from localStorage when routes change
  useEffect(() => {
    const stored = localStorage.getItem(storageKey)
    if (stored) {
      try {
        setDayPlans(JSON.parse(stored) as DayPlan[])
      } catch {
        setDayPlans(createEmptyDayPlans())
      }
    } else {
      setDayPlans(createEmptyDayPlans())
    }
    setSelectedIds(new Set())
  }, [storageKey])

  // Persist day plans to localStorage
  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(dayPlans))
  }, [dayPlans, storageKey])

  // Toggle location selection
  const toggleLocation = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  // Select all locations with coordinates
  const selectAll = useCallback(() => {
    const withCoords = locations.filter(hasValidCoordinates)
    setSelectedIds(new Set(withCoords.map((l) => l.locationId)))
  }, [locations])

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  // Add multiple locations to selection (for box selection)
  const addToSelection = useCallback((ids: string[]) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      ids.forEach((id) => next.add(id))
      return next
    })
  }, [])

  // Assign location(s) to a day
  const assignToDay = useCallback((locationId: string, dayOfWeek: number) => {
    setDayPlans((prev) => {
      // Remove from all other days first
      const updated = prev.map((plan) => ({
        ...plan,
        locationIds: plan.locationIds.filter((id) => id !== locationId),
      }))
      // Add to target day
      return updated.map((plan) =>
        plan.dayOfWeek === dayOfWeek
          ? { ...plan, locationIds: [...plan.locationIds, locationId] }
          : plan
      )
    })
  }, [])

  // Remove location from a day
  const removeFromDay = useCallback((locationId: string, dayOfWeek: number) => {
    setDayPlans((prev) =>
      prev.map((plan) =>
        plan.dayOfWeek === dayOfWeek
          ? { ...plan, locationIds: plan.locationIds.filter((id) => id !== locationId) }
          : plan
      )
    )
  }, [])

  // Calculate total distance for a set of location IDs
  const calculateDistance = useCallback(
    (ids: string[]): number => {
      if (ids.length < 2) return 0

      const locs = ids
        .map((id) => locations.find((l) => l.locationId === id))
        .filter((l): l is LocationForPlanning => l !== undefined && hasValidCoordinates(l))

      if (locs.length < 2) return 0

      const total = locs.reduce((sum, loc, i) => {
        if (i === 0) return 0
        const prev = locs[i - 1]
        return sum + haversineDistance(prev.latitude!, prev.longitude!, loc.latitude!, loc.longitude!)
      }, 0)

      return Math.round(total * 10) / 10
    },
    [locations]
  )

  // Calculate aggregated stats for selected locations (single-pass for performance)
  const aggregatedStats = useMemo((): AggregatedStats | null => {
    if (selectedIds.size === 0) return null

    const selected = locations.filter((l) => selectedIds.has(l.locationId))

    // Single-pass aggregation instead of multiple reduce calls
    const totals = selected.reduce(
      (acc, l) => ({
        totalClientes: acc.totalClientes + l.totalClientes,
        clientesActivos: acc.clientesActivos + l.clientesActivos,
        clientesEnCV: acc.clientesEnCV + l.clientesEnCV,
        clientesAlCorriente: acc.clientesAlCorriente + l.clientesAlCorriente,
      }),
      { totalClientes: 0, clientesActivos: 0, clientesEnCV: 0, clientesAlCorriente: 0 }
    )

    return {
      totalLocations: selected.length,
      ...totals,
      totalDistanceKm: calculateDistance(Array.from(selectedIds)),
    }
  }, [selectedIds, locations, calculateDistance])

  // Update coordinates for a location
  const updateCoordinates = useCallback(
    async (locationId: string, latitude: number, longitude: number) => {
      await updateCoordinatesMutation({
        variables: {
          input: { locationId, latitude, longitude },
        },
      })
    },
    [updateCoordinatesMutation]
  )

  // Start editing a location's coordinates
  const startEditingCoordinates = useCallback((locationId: string) => {
    setEditingLocationId(locationId)
  }, [])

  // Cancel editing
  const cancelEditingCoordinates = useCallback(() => {
    setEditingLocationId(null)
  }, [])

  // Get unique routes from locations for filtering
  const availableRoutes = useMemo(() => {
    const routeMap = new Map<string, { id: string; name: string }>()
    for (const loc of locations) {
      if (!routeMap.has(loc.routeId)) {
        routeMap.set(loc.routeId, { id: loc.routeId, name: loc.routeName })
      }
    }
    return Array.from(routeMap.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [locations])

  return {
    locations,
    availableRoutes,
    selectedIds,
    dayPlans,
    aggregatedStats,
    loading,
    error,
    editingLocationId,
    updatingCoordinates,
    toggleLocation,
    selectAll,
    clearSelection,
    addToSelection,
    assignToDay,
    removeFromDay,
    calculateDistance,
    updateCoordinates,
    startEditingCoordinates,
    cancelEditingCoordinates,
    refetch,
  }
}
