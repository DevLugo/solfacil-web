/**
 * Shared types for document management
 */

export interface DocumentPhoto {
  id: string
  photoUrl: string
  publicId: string
  documentType: string
  isError: boolean
  isMissing: boolean
  errorDescription?: string | null
  personalData?: {
    id: string
    fullName: string
  }
}

export interface Collateral {
  id: string
  fullName: string
  clientCode: string
}

export interface PersonalData {
  id: string
  fullName: string
  clientCode?: string
}

export interface LoanDocument {
  id: string
  amountGived: string
  signDate: string
  status: string
  borrower: {
    id: string
    personalData: PersonalData
  }
  loantype: {
    name: string
  }
  documentPhotos: DocumentPhoto[]
  collaterals?: Collateral[]
  lead?: {
    id: string
    personalData: {
      id: string
      fullName: string
    }
    location?: {
      id: string
      name: string
    }
  }
}

export type DocumentStatus = 'not-uploaded' | 'missing' | 'error' | 'ok'

export type DocumentType = 'INE' | 'DOMICILIO' | 'PAGARE'

export interface DocumentTypeConfig {
  value: DocumentType
  label: string
  icon: string
}

export interface LoanDocumentStats {
  totalDocuments: number
  expectedDocuments: number
  uploadedDocuments: number
  correctDocuments: number
  documentsWithErrors: number
  missingDocuments: number
  hasProblems: boolean
  hasPending: boolean
}
