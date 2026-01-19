import { useState, useEffect, useRef } from 'react'
import { useQuery } from '@apollo/client'
import { GET_LOANS_BY_WEEK_LOCATION, GET_CURRENT_WEEK } from '@/graphql/queries/documents'
import { GET_LOCATIONS } from '@/graphql/queries/leader'
import { getCurrentWeek } from '../utils/weekUtils'

export function useDocumentManager() {
  const currentWeek = getCurrentWeek()
  const [weekInfo, setWeekInfo] = useState({
    year: currentWeek.year,
    weekNumber: currentWeek.weekNumber,
  })
  const [selectedLocation, setSelectedLocation] = useState<string>('')
  const [selectedRouteId, setSelectedRouteId] = useState<string>('')
  const hasInitializedFromBackend = useRef(false)

  const { data: currentWeekData } = useQuery(GET_CURRENT_WEEK, {
    fetchPolicy: 'cache-and-network',
  })

  useEffect(() => {
    if (currentWeekData?.currentWeek && !hasInitializedFromBackend.current) {
      hasInitializedFromBackend.current = true
      setWeekInfo({
        year: currentWeekData.currentWeek.year,
        weekNumber: currentWeekData.currentWeek.weekNumber,
      })
    }
  }, [currentWeekData])

  const {
    data: locationsData,
    loading: locationsLoading,
    refetch: refetchLocations,
  } = useQuery(GET_LOCATIONS, {
    variables: { routeId: selectedRouteId || undefined },
  })

  const hasFilters = selectedRouteId || selectedLocation

  const {
    data: loansData,
    loading: loansLoading,
    refetch: refetchLoans,
    error: loansError,
  } = useQuery(GET_LOANS_BY_WEEK_LOCATION, {
    variables: {
      year: weekInfo.year,
      weekNumber: weekInfo.weekNumber,
      routeId: selectedRouteId || undefined,
      locationId: selectedLocation || undefined,
    },
    skip: !hasFilters,
    fetchPolicy: 'cache-and-network',
  })

  const handleWeekChange = (year: number, weekNumber: number) => {
    setWeekInfo({ year, weekNumber })
  }

  const handleLocationChange = (locationId: string) => {
    setSelectedLocation(locationId)
  }

  const handleRouteChange = (routeId: string) => {
    setSelectedRouteId(routeId)
    setSelectedLocation('')
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
