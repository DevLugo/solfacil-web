import { useState, useEffect } from 'react'
import { useQuery } from '@apollo/client'
import { GET_LOANS_BY_WEEK_LOCATION, GET_CURRENT_WEEK } from '@/graphql/queries/documents'
import { GET_LOCATIONS } from '@/graphql/queries/leader'
import { getCurrentWeek } from '../utils/weekUtils'

/**
 * Main hook for managing document state, filters, and queries
 * Handles week selection, location filtering, and loan data fetching
 */
export function useDocumentManager() {
  // Initialize with current week
  const currentWeek = getCurrentWeek()
  const [weekInfo, setWeekInfo] = useState({
    year: currentWeek.year,
    weekNumber: currentWeek.weekNumber,
  })
  const [selectedLocation, setSelectedLocation] = useState<string>('')
  const [selectedRouteId, setSelectedRouteId] = useState<string>('')

  // Fetch current week from backend for validation
  const { data: currentWeekData } = useQuery(GET_CURRENT_WEEK, {
    fetchPolicy: 'cache-and-network',
  })

  // Update week info when backend data is available
  useEffect(() => {
    if (currentWeekData?.currentWeek) {
      setWeekInfo({
        year: currentWeekData.currentWeek.year,
        weekNumber: currentWeekData.currentWeek.weekNumber,
      })
    }
  }, [currentWeekData])

  // Fetch locations for the selected route
  const {
    data: locationsData,
    loading: locationsLoading,
    refetch: refetchLocations,
  } = useQuery(GET_LOCATIONS, {
    variables: { routeId: selectedRouteId || undefined },
    skip: !selectedRouteId,
  })

  // Fetch loans by week and location (location is optional)
  const {
    data: loansData,
    loading: loansLoading,
    refetch: refetchLoans,
    error: loansError,
  } = useQuery(GET_LOANS_BY_WEEK_LOCATION, {
    variables: {
      year: weekInfo.year,
      weekNumber: weekInfo.weekNumber,
      locationId: selectedLocation || undefined,
    },
    fetchPolicy: 'cache-and-network',
  })

  // Handlers
  const handleWeekChange = (year: number, weekNumber: number) => {
    setWeekInfo({ year, weekNumber })
  }

  const handleLocationChange = (locationId: string) => {
    setSelectedLocation(locationId)
  }

  const handleRouteChange = (routeId: string) => {
    setSelectedRouteId(routeId)
    setSelectedLocation('') // Reset location when route changes
  }

  return {
    // State
    weekInfo,
    selectedLocation,
    selectedRouteId,

    // Data
    loans: loansData?.loansByWeekAndLocation || [],
    locations: locationsData?.locations || [],
    currentWeekFromBackend: currentWeekData?.currentWeek,

    // Loading states
    loansLoading,
    locationsLoading,

    // Errors
    loansError,

    // Actions
    handleWeekChange,
    handleLocationChange,
    handleRouteChange,
    refetchLoans,
    refetchLocations,
  }
}
