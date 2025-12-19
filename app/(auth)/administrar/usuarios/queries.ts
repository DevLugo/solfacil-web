import { gql } from '@apollo/client'

export const GET_USERS = gql`
  query GetUsers($role: UserRole, $limit: Int, $offset: Int) {
    users(role: $role, limit: $limit, offset: $offset) {
      id
      name
      email
      role
      employee {
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
      telegramUser {
        id
        chatId
        name
        isActive
      }
      createdAt
    }
  }
`

export const GET_EMPLOYEES_FOR_LINKING = gql`
  query GetEmployeesForLinking {
    employees {
      id
      type
      personalData {
        id
        fullName
        clientCode
      }
      routes {
        id
        name
      }
      user {
        id
      }
      loansGranted {
        id
        requestedAmount
        amountGived
        status
        signDate
      }
      loansManagedAsLead {
        id
        requestedAmount
        amountGived
        status
        signDate
      }
    }
  }
`

export const CREATE_USER = gql`
  mutation CreateUser($input: CreateUserInput!) {
    createUser(input: $input) {
      id
      name
      email
      role
    }
  }
`

export const UPDATE_USER = gql`
  mutation UpdateUser($id: ID!, $input: UpdateUserInput!) {
    updateUser(id: $id, input: $input) {
      id
      name
      email
      role
    }
  }
`

export const DELETE_USER = gql`
  mutation DeleteUser($id: ID!) {
    deleteUser(id: $id)
  }
`
