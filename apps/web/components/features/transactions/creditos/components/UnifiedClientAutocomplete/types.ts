import type { UnifiedClientValue, PreviousLoan } from '../../types'

export interface UnifiedClientAutocompleteProps {
  mode: 'borrower' | 'aval'
  value?: UnifiedClientValue | null
  onValueChange: (value: UnifiedClientValue | null) => void
  // For borrower mode
  leadId?: string
  // For aval mode - exclude borrower from results
  excludeBorrowerId?: string
  // Location for prioritization and warnings
  locationId?: string | null
  // Active loans for renewal - shows loan info in dropdown
  activeLoansForRenewal?: PreviousLoan[]
  placeholder?: string
  disabled?: boolean
  // Allow creating new clients
  allowCreate?: boolean
  // Show inline editing
  allowEdit?: boolean
  className?: string
}

// Re-export for convenience
export type { UnifiedClientValue, PreviousLoan } from '../../types'
