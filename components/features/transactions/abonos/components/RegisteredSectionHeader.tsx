'use client'

import { CheckCircle2, Lock, Pencil } from 'lucide-react'
import { TableRow, TableCell } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

interface RegisteredSectionHeaderProps {
  registeredCount: number
  isAdmin?: boolean
  hasDistribution?: boolean
  onEditDistribution?: () => void
}

export function RegisteredSectionHeader({
  registeredCount,
  isAdmin,
  hasDistribution,
  onEditDistribution,
}: RegisteredSectionHeaderProps) {
  // Calculate total columns: base 10 + 2 admin columns if admin
  const totalColumns = isAdmin ? 12 : 10

  return (
    <TableRow className="bg-slate-100/80 dark:bg-slate-800/60 hover:bg-slate-100/80 dark:hover:bg-slate-800/60 border-y-2 border-slate-300 dark:border-slate-600">
      <TableCell colSpan={totalColumns} className="py-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-200/80 dark:bg-slate-700/80">
            <Lock className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
              Capturados
            </span>
          </div>
          <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>{registeredCount} pago{registeredCount !== 1 ? 's' : ''} guardado{registeredCount !== 1 ? 's' : ''}</span>
          </div>

          {/* Edit distribution button */}
          {hasDistribution && onEditDistribution && (
            <TooltipProvider delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs gap-1 text-primary hover:text-primary hover:bg-primary/10"
                    onClick={onEditDistribution}
                  >
                    <Pencil className="h-3 w-3" />
                    Editar distribución
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Editar distribución (efectivo/banco)</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          <div className="flex-1 h-px bg-slate-300 dark:bg-slate-600 ml-2" />
        </div>
      </TableCell>
    </TableRow>
  )
}
