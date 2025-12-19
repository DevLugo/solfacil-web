// Theme-aware constants for historial-clientes module
// All colors use CSS variables for dark/light theme support

// ============================================================
// LOAN STATUS STYLES
// ============================================================

export type LoanStatusType = 'active' | 'completed' | 'renewed' | 'cancelled'
export type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info'

/**
 * Maps loan status to badge variant for StatusBadge component
 */
export const statusToBadgeVariant: Record<LoanStatusType, BadgeVariant> = {
  active: 'success',
  completed: 'default',
  renewed: 'info',
  cancelled: 'danger',
}

/**
 * Maps loan status to Spanish label
 */
export const statusLabels: Record<LoanStatusType, string> = {
  active: 'Activo',
  completed: 'Terminado',
  renewed: 'Renovado',
  cancelled: 'Cancelado',
}

/**
 * Maps API loan status to internal status type
 */
export const mapApiStatus = (
  apiStatus: string,
  wasRenewed: boolean
): LoanStatusType => {
  if (apiStatus === 'CANCELLED') return 'cancelled'
  if (wasRenewed) return 'renewed'
  if (apiStatus === 'FINISHED') return 'completed'
  return 'active'
}

// ============================================================
// PAYMENT COVERAGE STYLES
// ============================================================

export type CoverageType = 'FULL' | 'COVERED_BY_SURPLUS' | 'PARTIAL' | 'MISS'

/**
 * Coverage type styles using theme CSS variables
 * These classes work with both light and dark themes
 */
export const coverageStyles: Record<CoverageType, string> = {
  FULL: 'bg-success/10 border-success/30 text-success',
  COVERED_BY_SURPLUS: 'bg-info/10 border-info/30 text-info',
  PARTIAL: 'bg-warning/10 border-warning/30 text-warning',
  MISS: 'bg-destructive/10 border-destructive/30 text-destructive',
}

/**
 * Coverage styles for table rows (lighter background)
 */
export const coverageRowStyles: Record<CoverageType, string> = {
  FULL: 'bg-success/5 border-l-4 border-l-success',
  COVERED_BY_SURPLUS: 'bg-info/5 border-l-4 border-l-info',
  PARTIAL: 'bg-warning/5 border-l-4 border-l-warning',
  MISS: 'bg-destructive/5 border-l-4 border-l-destructive',
}

// ============================================================
// BADGE VARIANT STYLES
// ============================================================

/**
 * Badge styles using theme CSS variables
 */
export const badgeStyles: Record<BadgeVariant, string> = {
  default: 'bg-muted text-muted-foreground border-border',
  success: 'bg-success/10 text-success border-success/20',
  warning: 'bg-warning/10 text-warning border-warning/20',
  danger: 'bg-destructive/10 text-destructive border-destructive/20',
  info: 'bg-info/10 text-info border-info/20',
}

// ============================================================
// ROLE BADGES
// ============================================================

export type ClientRole = 'Cliente' | 'Aval'

export const roleStyles: Record<ClientRole, string> = {
  Cliente: 'bg-success/10 text-success',
  Aval: 'bg-warning/10 text-warning',
}

// ============================================================
// PAYMENT LEGEND
// ============================================================

export const paymentLegendItems = [
  { label: 'Completo', style: 'bg-success/10 border-l-2 border-l-success' },
  { label: 'Sobrepago', style: 'bg-success/10 border-l-2 border-l-success' },
  { label: 'Múltiples Pagos', style: 'bg-info/10 border-l-2 border-l-info' },
  { label: 'Cubierto por Sobrante', style: 'bg-info/10 border-l-2 border-l-info' },
  { label: 'Parcial', style: 'bg-warning/10 border-l-2 border-l-warning' },
  { label: 'Sin Pago', style: 'bg-destructive/10 border-l-2 border-l-destructive' },
] as const
