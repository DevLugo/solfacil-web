import { gql } from '@apollo/client'

export const CREATE_NEW_LEADER = gql`
  mutation CreateNewLeader($input: CreateNewLeaderInput!) {
    createNewLeader(input: $input) {
      success
      message
      newLeaderId
      loansTransferred
    }
  }
`

export const UPDATE_LEADER = gql`
  mutation UpdateLeader($input: UpdateLeaderInput!) {
    updateLeader(input: $input) {
      id
      fullName
      birthDate
      phone
      locationName
      routeId
      routeName
      createdAt
    }
  }
`

export const CREATE_LOCATION = gql`
  mutation CreateLocation($input: CreateLocationInput!) {
    createLocation(input: $input) {
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
