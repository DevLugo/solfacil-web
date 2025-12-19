import { gql } from '@apollo/client'

export const GET_ROUTES = gql`
  query GetRoutes {
    routes {
      id
      name
    }
  }
`

export const GET_LOCATIONS = gql`
  query GetLocations($routeId: ID) {
    locations(routeId: $routeId) {
      id
      name
      municipality {
        id
        name
        state {
          id
          name
        }
      }
    }
  }
`

export const GET_MUNICIPALITIES = gql`
  query GetMunicipalities {
    municipalities {
      id
      name
      state {
        id
        name
      }
    }
  }
`

export const CHECK_EXISTING_LEADER = gql`
  query CheckExistingLeader($locationId: ID!) {
    checkExistingLeader(locationId: $locationId) {
      id
      fullName
      locationName
    }
  }
`
