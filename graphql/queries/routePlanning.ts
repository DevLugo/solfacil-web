import { gql } from '@apollo/client'

export const GET_LOCATIONS_FOR_PLANNING = gql`
  query GetLocationsForPlanning($routeId: ID!) {
    locationsForPlanning(routeId: $routeId) {
      locationId
      locationName
      latitude
      longitude
      totalClientes
      clientesActivos
      clientesEnCV
      clientesAlCorriente
    }
  }
`

export const GET_ALL_LOCATIONS_FOR_PLANNING = gql`
  query GetAllLocationsForPlanning($routeIds: [ID!]) {
    allLocationsForPlanning(routeIds: $routeIds) {
      locationId
      locationName
      latitude
      longitude
      totalClientes
      clientesActivos
      clientesEnCV
      clientesAlCorriente
      routeId
      routeName
    }
  }
`

/**
 * NOTE: This query is available but NOT used in the frontend.
 *
 * The frontend calculates aggregated stats locally from GET_LOCATIONS_FOR_PLANNING data
 * because it's more efficient (avoids extra API call) and provides instant feedback
 * when selection changes.
 *
 * This query is kept for potential future use cases where server-side calculation
 * is preferred (e.g., batch operations, background jobs).
 */
export const GET_AGGREGATED_STATS = gql`
  query GetAggregatedLocationStats($locationIds: [ID!]!) {
    aggregatedLocationStats(locationIds: $locationIds) {
      totalLocations
      totalClientes
      clientesActivos
      clientesEnCV
      clientesAlCorriente
      totalDistanceKm
    }
  }
`

export const UPDATE_LOCATION_COORDINATES = gql`
  mutation UpdateLocationCoordinates($input: UpdateLocationCoordinatesInput!) {
    updateLocationCoordinates(input: $input) {
      id
      latitude
      longitude
    }
  }
`
