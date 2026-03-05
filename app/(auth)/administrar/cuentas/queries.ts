import { gql } from '@apollo/client'

export const GET_ACCOUNTS = gql`
  query GetAccountsAdmin {
    accounts {
      id
      name
      type
      amount
      accountBalance
      routes {
        id
        name
      }
      createdAt
    }
  }
`

export const GET_ROUTES_FOR_ACCOUNTS = gql`
  query GetRoutesForAccounts {
    routes {
      id
      name
    }
  }
`

export const CREATE_ACCOUNT = gql`
  mutation CreateAccountAdmin($input: CreateAccountInput!) {
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

export const UPDATE_ACCOUNT = gql`
  mutation UpdateAccountAdmin($id: ID!, $input: UpdateAccountInput!) {
    updateAccount(id: $id, input: $input) {
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
