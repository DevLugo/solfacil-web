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
