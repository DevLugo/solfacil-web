import { gql } from '@apollo/client'

export const UPDATE_EMPLOYEE_ROUTES = gql`
  mutation UpdateEmployeeRoutes($employeeId: ID!, $routeIds: [ID!]!) {
    updateEmployee(id: $employeeId, input: { routeIds: $routeIds }) {
      id
      type
      personalData {
        id
        fullName
      }
      routes {
        id
        name
      }
    }
  }
`

export const CREATE_ROUTE = gql`
  mutation CreateRoute($input: CreateRouteInput!) {
    createRoute(input: $input) {
      id
      name
    }
  }
`

export const CREATE_ACCOUNT = gql`
  mutation CreateAccount($input: CreateAccountInput!) {
    createAccount(input: $input) {
      id
      name
      type
      amount
      routes {
        id
        name
      }
    }
  }
`
