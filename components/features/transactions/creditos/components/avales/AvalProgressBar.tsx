'use client'

import { CheckCircle2, Clock, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { LoanForAval } from '../../types'
import { isAvalCaptured } from '../../types'

interface AvalProgressBarProps {
  loans: LoanForAval[]
}

export function AvalProgressBar({ loans }: AvalProgressBarProps) {
  const total = loans.length
  const captured = loans.filter(isAvalCaptured).length
  const pending = total - captured
  const percentage = total > 0 ? Math.round((captured / total) * 100) : 0

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      {/* Stats row */}
      <div className="grid grid-cols-3 divide-x">
        <div className="px-5 py-4 flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center">
            <FileText className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <p className="text-2xl font-semibold tracking-tight">{total}</p>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Créditos</p>
          </div>
        </div>
        <div className="px-5 py-4 flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="text-2xl font-semibold tracking-tight text-emerald-700 dark:text-emerald-400">{captured}</p>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Capturados</p>
          </div>
        </div>
        <div className="px-5 py-4 flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center">
            <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="text-2xl font-semibold tracking-tight text-amber-700 dark:text-amber-400">{pending}</p>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Pendientes</p>
          </div>
        </div>
      </div>
      {/* Progress bar */}
      <div className="px-5 pb-4 pt-1">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-muted-foreground">Progreso</span>
          <span className={cn(
            'text-xs font-bold tabular-nums',
            percentage === 100 ? 'text-emerald-600' : 'text-foreground',
          )}>
            {percentage}%
          </span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-700 ease-out',
              percentage === 100 ? 'bg-emerald-500' : 'bg-amber-500',
            )}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    </div>
  )
}
