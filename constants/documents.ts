/**
 * Document type configurations and constants
 */

import type { DocumentTypeConfig } from '@/types/documents'

export const EXPECTED_CLIENT_DOCUMENTS = 3 // INE, DOMICILIO, PAGARE
export const EXPECTED_AVAL_DOCUMENTS = 2 // INE, DOMICILIO

export const DOCUMENT_TYPES_CLIENTE: DocumentTypeConfig[] = [
  { value: 'INE', label: 'INE', icon: '🪪' },
  { value: 'DOMICILIO', label: 'Comprobante de domicilio', icon: '🏠' },
  { value: 'PAGARE', label: 'Pagaré', icon: '📄' },
]

export const DOCUMENT_TYPES_AVAL: DocumentTypeConfig[] = [
  { value: 'INE', label: 'INE', icon: '🪪' },
  { value: 'DOMICILIO', label: 'Comprobante de domicilio', icon: '🏠' },
]

export const REFETCH_QUERIES_KEYS = {
  LOANS_BY_WEEK: 'GetLoansByWeekAndLocation',
} as const
