// Shared theme constants for transactions module
// All colors use CSS variables for dark/light theme support

// ============================================================
// BADGE VARIANTS - Semantic color schemes
// ============================================================

export type BadgeVariant =
  | 'default'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'purple'
  | 'orange'
  | 'slate'

/**
 * Badge styles using theme CSS variables
 * Works in both light and dark mode
 */
export const badgeStyles: Record<BadgeVariant, string> = {
  default: 'bg-muted text-muted-foreground border-border',
  success: 'bg-success/10 text-success border-success/20',
  warning: 'bg-warning/10 text-warning border-warning/20',
  danger: 'bg-destructive/10 text-destructive border-destructive/20',
  info: 'bg-info/10 text-info border-info/20',
  purple: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
  orange: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
  slate: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20',
}

// ============================================================
// ACCOUNT TYPE STYLING
// ============================================================

export type AccountType =
  | 'BANK'
  | 'OFFICE_CASH_FUND'
  | 'EMPLOYEE_CASH_FUND'
  | 'PREPAID_GAS'
  | 'TRAVEL_EXPENSES'

/**
 * Account type to badge variant mapping
 */
export const accountTypeToBadgeVariant: Record<AccountType, BadgeVariant> = {
  BANK: 'success',
  OFFICE_CASH_FUND: 'slate',
  EMPLOYEE_CASH_FUND: 'info',
  PREPAID_GAS: 'orange',
  TRAVEL_EXPENSES: 'purple',
}

/**
 * Account type styles - full className strings using theme variables
 */
export const accountTypeStyles: Record<AccountType, string> = {
  BANK: 'bg-success/10 text-success border-success/20',
  OFFICE_CASH_FUND: 'bg-muted text-muted-foreground border-border',
  EMPLOYEE_CASH_FUND: 'bg-info/10 text-info border-info/20',
  PREPAID_GAS: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
  TRAVEL_EXPENSES: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
}

// ============================================================
// LOAN STATUS STYLING
// ============================================================

export type LoanStatusType = 'active' | 'completed' | 'renewed' | 'overdue' | 'pending'

export const loanStatusStyles: Record<LoanStatusType, string> = {
  active: 'bg-success/10 text-success border-success/20',
  completed: 'bg-muted text-muted-foreground border-border',
  renewed: 'bg-info/10 text-info border-info/20',
  overdue: 'bg-destructive/10 text-destructive border-destructive/20',
  pending: 'bg-warning/10 text-warning border-warning/20',
}

export const loanStatusLabels: Record<LoanStatusType, string> = {
  active: 'Activo',
  completed: 'Terminado',
  renewed: 'Renovado',
  overdue: 'Vencido',
  pending: 'Pendiente',
}

// ============================================================
// PAYMENT ROW STYLING
// ============================================================

export type PaymentRowStatus =
  | 'success' // Paid in full
  | 'partial' // Partially paid
  | 'overpaid' // More than expected
  | 'pending' // Not yet due
  | 'overdue' // Past due, not paid
  | 'editing' // Currently editing

export const paymentRowStyles: Record<PaymentRowStatus, string> = {
  success: 'border-l-2 border-l-success bg-success/5',
  partial: 'border-l-2 border-l-warning bg-warning/5',
  overpaid: 'border-l-2 border-l-info bg-info/5',
  pending: 'border-l-2 border-l-muted bg-muted/5',
  overdue: 'border-l-2 border-l-destructive bg-destructive/5',
  editing: 'border-l-2 border-l-primary bg-primary/5',
}

// ============================================================
// KPI/STAT CARD STYLING
// ============================================================

export type KpiVariant = 'success' | 'danger' | 'info' | 'warning' | 'purple' | 'orange'

export const kpiStyles: Record<KpiVariant, { bg: string; text: string; border: string }> = {
  success: {
    bg: 'bg-success/10',
    text: 'text-success',
    border: 'border-success/20',
  },
  danger: {
    bg: 'bg-destructive/10',
    text: 'text-destructive',
    border: 'border-destructive/20',
  },
  info: {
    bg: 'bg-info/10',
    text: 'text-info',
    border: 'border-info/20',
  },
  warning: {
    bg: 'bg-warning/10',
    text: 'text-warning',
    border: 'border-warning/20',
  },
  purple: {
    bg: 'bg-purple-500/10',
    text: 'text-purple-600 dark:text-purple-400',
    border: 'border-purple-500/20',
  },
  orange: {
    bg: 'bg-orange-500/10',
    text: 'text-orange-600 dark:text-orange-400',
    border: 'border-orange-500/20',
  },
}

// ============================================================
// CLIENT FORM STATE STYLING (for autocomplete, forms)
// ============================================================

export type ClientFormState = 'newClient' | 'edited' | 'renewed' | 'otherLocation' | 'existing'

/**
 * Client form state styles - for the unified client autocomplete
 * Each state has consistent colors for container, avatar, icon, and badge
 */
export const clientFormStateStyles: Record<
  ClientFormState,
  {
    container: string
    avatar: string
    icon: string
    badge: string
    badgeLabel: string
  }
> = {
  newClient: {
    container: 'border-info/50 bg-info/5 dark:bg-info/10',
    avatar: 'bg-info/20 dark:bg-info/30',
    icon: 'text-info',
    badge: 'bg-info/20 text-info dark:bg-info/30',
    badgeLabel: 'Nuevo',
  },
  edited: {
    container: 'border-success/50 bg-success/5 dark:bg-success/10',
    avatar: 'bg-success/20 dark:bg-success/30',
    icon: 'text-success',
    badge: 'bg-success/20 text-success dark:bg-success/30',
    badgeLabel: 'Editado',
  },
  renewed: {
    container: 'border-purple-500/50 bg-purple-500/5 dark:bg-purple-500/10',
    avatar: 'bg-purple-500/20 dark:bg-purple-500/30',
    icon: 'text-purple-600 dark:text-purple-400',
    badge: 'bg-purple-500/20 text-purple-600 dark:bg-purple-500/30 dark:text-purple-400',
    badgeLabel: 'Renovacion',
  },
  otherLocation: {
    container: 'border-warning/50 bg-warning/5 dark:bg-warning/10',
    avatar: 'bg-warning/20 dark:bg-warning/30',
    icon: 'text-warning',
    badge: 'bg-warning/20 text-warning dark:bg-warning/30',
    badgeLabel: 'Otra Localidad',
  },
  existing: {
    container: 'border-input bg-muted/30',
    avatar: 'bg-muted',
    icon: 'text-muted-foreground',
    badge: 'bg-muted text-muted-foreground',
    badgeLabel: '',
  },
}

/**
 * Get the effective client form state based on value properties
 */
export const getClientFormState = (
  clientState: string,
  isFromCurrentLocation: boolean
): ClientFormState => {
  if (clientState === 'newClient') return 'newClient'
  if (clientState === 'edited') return 'edited'
  if (clientState === 'renewed') return 'renewed'
  if (!isFromCurrentLocation) return 'otherLocation'
  return 'existing'
}

// ============================================================
// GRADIENT PRESETS
// ============================================================

export const gradientStyles = {
  primary: 'from-primary/80 to-primary',
  success: 'from-success/80 to-success',
  danger: 'from-destructive/80 to-destructive',
  info: 'from-info/80 to-info',
  purple: 'from-purple-500/80 to-purple-600',
  orange: 'from-orange-500/80 to-orange-600',
} as const

// ============================================================
// LOAN PAYMENT ROW STYLING (abonos table rows)
// ============================================================

export type LoanPaymentRowState =
  | 'deleted'
  | 'editing'
  | 'registered'
  | 'noPayment'
  | 'incomplete'
  | 'zeroCommission'
  | 'transfer'
  | 'cash'
  | 'default'

/**
 * Loan payment row styles with border-left indicators
 * Uses 4px border-left for visual state indication
 */
export const loanPaymentRowStyles: Record<LoanPaymentRowState, string> = {
  deleted: 'bg-destructive/10 dark:bg-destructive/20 border-l-4 border-l-destructive',
  editing: 'bg-warning/10 dark:bg-warning/20 border-l-4 border-l-warning',
  registered: 'bg-muted/50 dark:bg-muted/30 opacity-75 border-l-4 border-l-muted-foreground',
  noPayment: 'bg-destructive/10 dark:bg-destructive/15 border-l-4 border-l-destructive/80',
  incomplete: 'bg-orange-500/10 dark:bg-orange-500/15 border-l-4 border-l-orange-500',
  zeroCommission: 'bg-amber-500/10 dark:bg-amber-500/15 border-l-4 border-l-amber-500',
  transfer: 'bg-purple-500/10 dark:bg-purple-500/15 border-l-4 border-l-purple-500',
  cash: 'bg-success/10 dark:bg-success/15 border-l-4 border-l-success',
  default: 'border-l-4 border-l-transparent',
}

// ============================================================
// TEXT STYLES - Semantic text colors
// ============================================================

export const textStyles = {
  // Primary semantic colors
  muted: 'text-muted-foreground',
  success: 'text-success',
  danger: 'text-destructive',
  warning: 'text-warning',
  info: 'text-info',
  // Extended palette
  orange: 'text-orange-600 dark:text-orange-400',
  purple: 'text-purple-600 dark:text-purple-400',
  slate: 'text-slate-600 dark:text-slate-400',
  blue: 'text-blue-600 dark:text-blue-400',
  green: 'text-green-600 dark:text-green-400',
  amber: 'text-amber-600 dark:text-amber-400',
} as const

// ============================================================
// BUTTON ACTION STYLES
// ============================================================

export const actionButtonStyles = {
  restore: 'text-success hover:text-success hover:bg-success/10',
  delete: 'text-destructive hover:text-destructive hover:bg-destructive/10',
  cancel: 'text-muted-foreground hover:text-foreground',
} as const

// ============================================================
// STATUS BADGE STYLES (solid backgrounds for status indicators)
// ============================================================

export const statusBadgeStyles = {
  registered: 'bg-slate-600 dark:bg-slate-500',
  noPayment: '', // Uses variant="destructive"
  transfer: 'bg-purple-600 hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600',
  cash: 'bg-success hover:bg-success/90',
  pending: '', // Uses variant="outline"
  zeroCommission: 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700',
} as const

// ============================================================
// EXPENSE/COMMISSION STYLING
// ============================================================

export const commissionRowStyle = 'bg-warning/5 dark:bg-warning/10'
export const commissionIconStyle = 'text-warning'

// ============================================================
// UTILITY FUNCTION
// ============================================================

/**
 * Get combined badge className
 */
export const getBadgeClass = (variant: BadgeVariant): string => {
  return `inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${badgeStyles[variant]}`
}
