// Constants and styles for Clientes Morosos feature

export const statusBadgeStyles = {
  badDebt: 'bg-destructive/10 text-destructive border-destructive/20',
  cleanup: 'bg-warning/10 text-warning border-warning/20',
} as const

export type BadDebtStatusType = keyof typeof statusBadgeStyles
