import { gql } from '@apollo/client'

export const GET_LOCATION_ROUTE_HISTORY = gql`
  query GetLocationRouteHistory($locationId: ID!) {
    locationRouteHistory(locationId: $locationId) {
      id
      locationId
      routeId
      route {
        id
        name
      }
      startDate
      endDate
      createdAt
    }
  }
`

export const GET_LOCATIONS_IN_ROUTE_AT_DATE = gql`
  query GetLocationsInRouteAtDate($routeId: ID!, $date: DateTime!) {
    locationsInRouteAtDate(routeId: $routeId, date: $date) {
      id
      name
      route
      municipality
      municipalityRelation {
        id
        name
      }
    }
  }
`

export const GET_ROUTE_FOR_LOCATION_AT_DATE = gql`
  query GetRouteForLocationAtDate($locationId: ID!, $date: DateTime!) {
    routeForLocationAtDate(locationId: $locationId, date: $date) {
      id
      name
    }
  }
`
