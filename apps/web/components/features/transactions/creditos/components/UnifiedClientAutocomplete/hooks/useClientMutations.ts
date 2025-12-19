'use client'

import { useMutation } from '@apollo/client'
import { gql } from '@apollo/client'
import { UPDATE_PHONE } from '@/graphql/mutations/transactions'

// Mutation para actualizar borrower (nombre)
const UPDATE_BORROWER_MUTATION = gql`
  mutation UpdateBorrower($id: ID!, $input: UpdateBorrowerInput!) {
    updateBorrower(id: $id, input: $input) {
      id
      personalData {
        id
        fullName
        phones {
          id
          number
        }
      }
    }
  }
`

// Mutation para actualizar PersonalData directamente (para avales)
const UPDATE_PERSONAL_DATA_MUTATION = gql`
  mutation UpdatePersonalData($id: ID!, $fullName: String!) {
    updatePersonalData(id: $id, fullName: $fullName) {
      id
      fullName
      phones {
        id
        number
      }
    }
  }
`

export function useClientMutations() {
  const [updateBorrower] = useMutation(UPDATE_BORROWER_MUTATION)
  const [updatePersonalData] = useMutation(UPDATE_PERSONAL_DATA_MUTATION)
  const [updatePhone] = useMutation(UPDATE_PHONE)

  return {
    updateBorrower,
    updatePersonalData,
    updatePhone,
  }
}
