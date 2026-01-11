'use client'

import type { ReactNode } from 'react'
import {
  Search,
  Loader2,
  Save,
  Gavel,
  Pencil,
  AlertTriangle,
  CheckSquare,
  XSquare,
  RotateCcw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

// Button style constants for action buttons
const actionButtonStyles = {
  multa: 'text-orange-600 dark:text-orange-400 border-orange-300 dark:border-orange-700 hover:bg-orange-50 dark:hover:bg-orange-950/30 hover:text-orange-700 dark:hover:text-orange-300',
  saveEdits: 'bg-warning hover:bg-warning/90',
  falcos: 'text-orange-600 dark:text-orange-400 border-orange-300 dark:border-orange-700 hover:bg-orange-50 dark:hover:bg-orange-950/30',
  weekly: 'text-green-600 dark:text-green-400 border-green-300 dark:border-green-700 hover:bg-green-50 dark:hover:bg-green-950/30',
  noPayment: 'text-red-600 dark:text-red-400 border-red-300 dark:border-red-700 hover:bg-red-50 dark:hover:bg-red-950/30',
  clear: 'text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-950/30',
}

interface ActionBarProps {
  searchTerm: string
  onSearchChange: (value: string) => void
  globalCommission: string
  onGlobalCommissionChange: (value: string) => void
  onApplyGlobalCommission: () => void
  onSetAllWeekly: () => void
  onSetAllNoPayment: () => void
  onClearAll: () => void
  onOpenMultaModal: () => void
  onOpenFalcosDrawer: () => void
  extraCobranzaSlot?: ReactNode
  falcosPendientesCount: number
  onSaveAll: () => void
  onSaveEditedPayments: () => void
  filteredLoansCount: number
  totalsCount: number
  totalsNoPayment: number
  isSubmitting: boolean
  isSavingEdits: boolean
  hasEditedPayments: boolean
  editedCount: number
  deletedCount: number
}

export function ActionBar({
  searchTerm,
  onSearchChange,
  globalCommission,
  onGlobalCommissionChange,
  onApplyGlobalCommission,
  onSetAllWeekly,
  onSetAllNoPayment,
  onClearAll,
  onOpenMultaModal,
  onOpenFalcosDrawer,
  extraCobranzaSlot,
  falcosPendientesCount,
  onSaveAll,
  onSaveEditedPayments,
  filteredLoansCount,
  totalsCount,
  totalsNoPayment,
  isSubmitting,
  isSavingEdits,
  hasEditedPayments,
  editedCount,
  deletedCount,
}: ActionBarProps) {
  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex flex-wrap items-center gap-3 mt-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[180px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar cliente..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value.toUpperCase())}
            className="pl-9 h-8 uppercase"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 ml-auto">
          {/* Comisión Global */}
          <div className="flex items-center gap-1.5 bg-muted/50 rounded-md px-2 py-1">
            <span className="text-xs text-muted-foreground whitespace-nowrap">Comisión:</span>
            <div className="relative">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
              <Input
                type="number"
                placeholder="0"
                value={globalCommission}
                onChange={(e) => onGlobalCommissionChange(e.target.value)}
                onWheel={(e) => e.currentTarget.blur()}
                className="w-[60px] h-7 text-sm pl-5 pr-1"
              />
            </div>
            <Button
              size="sm"
              variant="secondary"
              onClick={onApplyGlobalCommission}
              disabled={!globalCommission || filteredLoansCount === 0}
              className="h-7 px-2 text-xs"
            >
              Aplicar
            </Button>
          </div>

          <div className="h-5 w-px bg-border" />

          {/* Acciones Masivas - Grupo con labels claros */}
          <div className="flex items-center gap-1 bg-muted/30 rounded-md p-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onSetAllWeekly}
                  disabled={filteredLoansCount === 0}
                  className={cn('h-7 px-2 gap-1', actionButtonStyles.weekly)}
                >
                  <CheckSquare className="h-3.5 w-3.5" />
                  <span className="text-xs">Todos</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Aplicar pago semanal a todos los clientes</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onSetAllNoPayment}
                  disabled={filteredLoansCount === 0}
                  className={cn('h-7 px-2 gap-1', actionButtonStyles.noPayment)}
                >
                  <XSquare className="h-3.5 w-3.5" />
                  <span className="text-xs">Faltas</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Marcar todos como falta (sin pago)</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onClearAll}
                  disabled={totalsCount === 0 && totalsNoPayment === 0}
                  className={cn('h-7 px-2 gap-1', actionButtonStyles.clear)}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span className="text-xs">Limpiar</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Limpiar todos los pagos ingresados</p>
              </TooltipContent>
            </Tooltip>
          </div>

          <div className="h-5 w-px bg-border" />

          {/* Acciones Especiales */}
          {extraCobranzaSlot}

          <Button
            size="sm"
            variant="outline"
            onClick={onOpenMultaModal}
            className={cn('h-8 px-2 gap-1.5', actionButtonStyles.multa)}
          >
            <Gavel className="h-3.5 w-3.5" />
            <span className="text-xs sm:text-sm">Multa</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={onOpenFalcosDrawer}
            className={cn('h-8 px-2 gap-1.5', actionButtonStyles.falcos)}
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            <span className="text-xs sm:text-sm">Falcos</span>
            {falcosPendientesCount > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-xs">
                {falcosPendientesCount}
              </Badge>
            )}
          </Button>

          {/* Guardar - Solo aparece cuando hay cambios */}
          {totalsCount > 0 && !hasEditedPayments && (
            <>
              <div className="h-5 w-px bg-border" />
              <Button
                size="sm"
                onClick={onSaveAll}
                disabled={isSubmitting}
                className="gap-1.5 h-8"
              >
                {isSubmitting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                Guardar ({totalsCount})
              </Button>
            </>
          )}

          {hasEditedPayments && (
            <>
              <div className="h-5 w-px bg-border" />
              <Button
                size="sm"
                onClick={onSaveEditedPayments}
                disabled={isSavingEdits}
                className={cn('gap-1.5 h-8', actionButtonStyles.saveEdits)}
              >
                {isSavingEdits ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Pencil className="h-3.5 w-3.5" />
                )}
                Guardar Cambios ({editedCount + deletedCount})
              </Button>
            </>
          )}
        </div>
      </div>
    </TooltipProvider>
  )
}
