/**
 * Document utility functions
 * Provides reusable logic for document status calculation and manipulation
 */

import type {
  DocumentPhoto,
  DocumentStatus,
  LoanDocument,
  LoanDocumentStats
} from '@/types/documents'
import { EXPECTED_CLIENT_DOCUMENTS, EXPECTED_AVAL_DOCUMENTS } from '@/constants/documents'

/**
 * Calculate the expected number of documents for a loan
 * @param numberOfAvales Number of collaterals/avales
 * @returns Total expected documents
 */
export function getExpectedDocuments(numberOfAvales: number): number {
  return EXPECTED_CLIENT_DOCUMENTS + (numberOfAvales * EXPECTED_AVAL_DOCUMENTS)
}

/**
 * Find a document by its type in a list of documents
 * @param documents Array of documents
 * @param documentType Type of document to find
 * @returns Found document or undefined
 */
export function findDocumentByType(
  documents: DocumentPhoto[],
  documentType: string
): DocumentPhoto | undefined {
  return documents.find((d) => d.documentType === documentType)
}

/**
 * Get the status of a specific document
 * @param documents Array of documents
 * @param documentType Type of document to check
 * @returns Document status
 */
export function getDocumentStatus(
  documents: DocumentPhoto[],
  documentType: string
): DocumentStatus {
  const doc = findDocumentByType(documents, documentType)
  if (!doc) return 'not-uploaded'
  if (doc.isMissing) return 'missing'
  if (doc.isError) return 'error'
  return 'ok'
}

/**
 * Check if a document is marked as missing
 * @param documents Array of documents
 * @param documentType Type of document to check
 * @returns True if document is marked as missing
 */
export function isDocumentMarkedAsMissing(
  documents: DocumentPhoto[],
  documentType: string
): boolean {
  const doc = findDocumentByType(documents, documentType)
  return doc?.isMissing === true
}

/**
 * Get Cloudinary thumbnail URL with transformations
 * @param photoUrl Original Cloudinary URL
 * @param width Thumbnail width
 * @param height Thumbnail height
 * @returns Transformed thumbnail URL or null
 */
export function getCloudinaryThumbnail(
  photoUrl: string | null | undefined,
  width: number = 120,
  height: number = 120
): string | null {
  if (!photoUrl) return null

  return photoUrl.replace(
    '/upload/',
    `/upload/c_fill,w_${width},h_${height},q_auto:good/`
  )
}

/**
 * Get thumbnail URL for a specific document type
 * @param documents Array of documents
 * @param documentType Type of document
 * @returns Thumbnail URL or null
 */
export function getDocumentThumbnail(
  documents: DocumentPhoto[],
  documentType: string
): string | null {
  const doc = findDocumentByType(documents, documentType)
  if (!doc || !doc.photoUrl) return null
  return getCloudinaryThumbnail(doc.photoUrl)
}

/**
 * Calculate comprehensive statistics for loan documents
 * @param loan Loan document with documentPhotos and collaterals
 * @returns Statistics object with counts and flags
 */
export function calculateLoanDocumentStats(loan: {
  documentPhotos?: DocumentPhoto[]
  collaterals?: Array<{ id: string }>
}): LoanDocumentStats {
  const documentPhotos = loan.documentPhotos || []
  const numberOfAvales = loan.collaterals?.length || 0

  // Basic counts
  const totalDocuments = documentPhotos.length
  const documentsWithErrors = documentPhotos.filter((doc) => doc.isError).length
  const missingDocuments = documentPhotos.filter((doc) => doc.isMissing).length
  const correctDocuments = documentPhotos.filter(
    (doc) => !doc.isError && !doc.isMissing
  ).length

  // Expected and uploaded counts
  const expectedDocuments = getExpectedDocuments(numberOfAvales)
  const uploadedDocuments = documentPhotos.filter((doc) => !doc.isMissing).length

  // Status flags
  // hasPending = "No revisados" - documents that haven't been reviewed yet
  // A document is "reviewed" when it has any status: uploaded, error, or missing
  // Only show as pending if there are documents without any status (not in documentPhotos)
  const hasPending = totalDocuments < expectedDocuments
  const hasProblems = documentsWithErrors > 0

  return {
    totalDocuments,
    expectedDocuments,
    uploadedDocuments,
    correctDocuments,
    documentsWithErrors,
    missingDocuments,
    hasProblems,
    hasPending,
  }
}

/**
 * Get the overall status label and variant for a loan
 * @param stats Loan document statistics
 * @returns Status label and badge variant
 */
export function getLoanStatusBadge(stats: LoanDocumentStats): {
  label: string
  variant: 'default' | 'secondary' | 'destructive'
} {
  if (stats.totalDocuments === 0) {
    return { label: 'Pendiente', variant: 'secondary' }
  }
  if (stats.hasProblems) {
    return { label: 'Con problemas', variant: 'destructive' }
  }
  if (stats.hasPending) {
    return { label: 'Pendiente', variant: 'secondary' }
  }
  return { label: 'Completo', variant: 'default' }
}
