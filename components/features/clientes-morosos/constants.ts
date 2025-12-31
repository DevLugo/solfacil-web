// Constants and styles for Clientes Morosos feature

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

export const PDF_EXPORT_ENDPOINT = `${API_BASE_URL}/api/export-bad-debt-pdf`

export const statusBadgeStyles = {
  badDebt: 'bg-destructive/10 text-destructive border-destructive/20',
  cleanup: 'bg-warning/10 text-warning border-warning/20',
} as const

export type BadDebtStatusType = keyof typeof statusBadgeStyles
