'use client'

import { cn } from '@/lib/utils'
import { badgeStyles, type BadgeVariant } from '../constants'

interface StatusBadgeProps {
  children: React.ReactNode
  variant?: BadgeVariant
  className?: string
}

export function StatusBadge({ children, variant = 'default', className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border',
        badgeStyles[variant],
        className
      )}
    >
      {children}
    </span>
  )
}
