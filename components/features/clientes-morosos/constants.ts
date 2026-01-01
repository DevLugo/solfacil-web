// Constants and styles for Clientes Morosos feature

import { API_CONFIG } from '@/lib/constants/api'

export const PDF_EXPORT_ENDPOINT = `${API_CONFIG.BASE_URL}/api/export-bad-debt-pdf`

export const statusBadgeStyles = {
  badDebt: 'bg-destructive/10 text-destructive border-destructive/20',
  cleanup: 'bg-warning/10 text-warning border-warning/20',
} as const

export type BadDebtStatusType = keyof typeof statusBadgeStyles
