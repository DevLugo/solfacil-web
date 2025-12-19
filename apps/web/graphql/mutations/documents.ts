import { gql } from '@apollo/client'

/**
 * Mutation to upload a new document photo
 * Supports uploading from camera or gallery with validation status
 */
export const UPLOAD_DOCUMENT_PHOTO = gql`
  mutation UploadDocumentPhoto($input: UploadDocumentInput!) {
    uploadDocumentPhoto(input: $input) {
      id
      title
      description
      photoUrl
      publicId
      documentType
      isError
      errorDescription
      isMissing
      personalData {
        id
        fullName
      }
      loan {
        id
      }
      createdAt
      updatedAt
    }
  }
`

/**
 * Mutation to update an existing document photo
 * Used for validating documents (marking as correct, error, or missing)
 */
export const UPDATE_DOCUMENT_PHOTO = gql`
  mutation UpdateDocumentPhoto($id: ID!, $input: UpdateDocumentInput!) {
    updateDocumentPhoto(id: $id, input: $input) {
      id
      title
      description
      isError
      errorDescription
      isMissing
      updatedAt
    }
  }
`

/**
 * Mutation to delete a document photo
 */
export const DELETE_DOCUMENT_PHOTO = gql`
  mutation DeleteDocumentPhoto($id: ID!) {
    deleteDocumentPhoto(id: $id)
  }
`

/**
 * Mutation to mark a document as missing
 * Creates a document record without photo marked as isMissing
 */
export const MARK_DOCUMENT_AS_MISSING = gql`
  mutation MarkDocumentAsMissing($input: MarkDocumentAsMissingInput!) {
    markDocumentAsMissing(input: $input) {
      id
      title
      description
      documentType
      isMissing
      isError
      errorDescription
      photoUrl
      publicId
      personalData {
        id
        fullName
      }
      loan {
        id
      }
      createdAt
      updatedAt
    }
  }
`
