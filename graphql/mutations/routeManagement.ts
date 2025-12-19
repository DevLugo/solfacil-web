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
