'use client'

import { useState } from 'react'
import { ChevronDown, MapPin } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { LoanAvalRow } from './LoanAvalRow'
import type { LocationGroupData } from '../../types'

interface LocationGroupProps {
  group: LocationGroupData
  onUpdated: () => void
}

export function LocationGroup({ group, onUpdated }: LocationGroupProps) {
  const [isOpen, setIsOpen] = useState(true)
  const total = group.loans.length
  const { captured } = group
  const allCaptured = captured === total
  const noneCaptured = captured === 0

  return (
    <div
      className={cn(
        'rounded-xl border overflow-hidden transition-colors',
        allCaptured && 'border-emerald-200 dark:border-emerald-900/50',
      )}
    >
      {/* Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors',
          allCaptured
            ? 'bg-emerald-50/80 hover:bg-emerald-50 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/30'
            : 'bg-muted/30 hover:bg-muted/50',
        )}
      >
        <div className={cn(
          'h-8 w-8 rounded-lg flex items-center justify-center shrink-0',
          allCaptured
            ? 'bg-emerald-100 dark:bg-emerald-900/40'
            : 'bg-background border',
        )}>
          <MapPin className={cn(
            'h-4 w-4',
            allCaptured ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground',
          )} />
        </div>
        <div className="flex-1 min-w-0">
          <span className="font-medium text-sm">{group.locationName}</span>
          <span className="text-xs text-muted-foreground ml-2">
            {total} crédito{total !== 1 ? 's' : ''}
          </span>
        </div>
        <Badge
          variant={allCaptured ? 'default' : noneCaptured ? 'destructive' : 'secondary'}
          className={cn(
            'text-xs tabular-nums font-mono shrink-0',
            allCaptured && 'bg-emerald-600 hover:bg-emerald-600',
          )}
        >
          {captured}/{total}
        </Badge>
        <ChevronDown className={cn(
          'h-4 w-4 text-muted-foreground transition-transform duration-200 shrink-0',
          !isOpen && '-rotate-90',
        )} />
      </button>

      {/* Loans */}
      {isOpen && (
        <div className="divide-y">
          {group.loans.map((loan) => (
            <LoanAvalRow key={loan.id} loan={loan} onUpdated={onUpdated} />
          ))}
        </div>
      )}
    </div>
  )
}
