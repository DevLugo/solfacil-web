import { gql } from '@apollo/client'

export const CHANGE_LOCATION_ROUTE = gql`
  mutation ChangeLocationRoute($locationId: ID!, $routeId: ID!, $effectiveDate: DateTime!) {
    changeLocationRoute(locationId: $locationId, routeId: $routeId, effectiveDate: $effectiveDate) {
      id
      locationId
      routeId
      route {
        id
        name
      }
      startDate
      endDate
    }
  }
`

export const ADD_LOCATION_ROUTE_HISTORY = gql`
  mutation AddLocationRouteHistory($input: LocationRouteHistoryInput!) {
    addLocationRouteHistory(input: $input) {
      id
      locationId
      routeId
      startDate
      endDate
    }
  }
`

export const UPDATE_LOCATION_ROUTE_HISTORY = gql`
  mutation UpdateLocationRouteHistory($id: ID!, $input: LocationRouteHistoryInput!) {
    updateLocationRouteHistory(id: $id, input: $input) {
      id
      locationId
      routeId
      startDate
      endDate
    }
  }
`

export const DELETE_LOCATION_ROUTE_HISTORY = gql`
  mutation DeleteLocationRouteHistory($id: ID!) {
    deleteLocationRouteHistory(id: $id)
  }
`

export const BATCH_CHANGE_LOCATION_ROUTES = gql`
  mutation BatchChangeLocationRoutes($input: BatchChangeLocationRouteInput!) {
    batchChangeLocationRoutes(input: $input) {
      success
      message
      changesApplied
      errors {
        locationId
        error
      }
      details {
        locationId
        locationName
        previousRouteId
        previousRouteName
        newRouteId
        newRouteName
      }
    }
  }
`

export const BATCH_UPSERT_HISTORICAL_ASSIGNMENT = gql`
  mutation BatchUpsertHistoricalAssignment($input: BatchUpsertHistoricalInput!) {
    batchUpsertHistoricalAssignment(input: $input) {
      success
      message
      recordsCreated
      recordsAdjusted
      recordsDeleted
      errors {
        locationId
        error
      }
      details {
        locationId
        locationName
        routeId
        routeName
        startDate
        endDate
      }
    }
  }
`
