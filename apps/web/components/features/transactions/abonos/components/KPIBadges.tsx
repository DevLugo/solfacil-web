import {
  Users,
  Check,
  Ban,
  Trash2,
  DollarSign,
  Wallet,
  Building2,
  AlertTriangle,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { formatCurrency, cn } from '@/lib/utils'
import type { CombinedTotals, PaymentTotals } from '../types'
import { badgeStyles } from '../../shared/theme'

interface KPIBadgesProps {
  filteredLoansCount: number
  registeredCount: number
  totals: PaymentTotals
  combinedTotals: CombinedTotals
  incompleteCount: number
  showOnlyIncomplete: boolean
  onToggleIncomplete: () => void
}

// Base badge class for all KPI badges
const kpiBadgeBase = 'text-xs py-0.5 px-2 cursor-default'

export function KPIBadges({
  filteredLoansCount,
  registeredCount,
  totals,
  combinedTotals,
  incompleteCount,
  showOnlyIncomplete,
  onToggleIncomplete,
}: KPIBadgesProps) {
  return (
    <TooltipProvider delayDuration={100}>
      <div className="flex flex-wrap items-center gap-1.5 justify-end">
        {/* Active clients */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className={kpiBadgeBase}>
              <Users className="h-3 w-3 mr-1" />
              {filteredLoansCount}
            </Badge>
          </TooltipTrigger>
          <TooltipContent><p>Clientes activos</p></TooltipContent>
        </Tooltip>

        {/* Already registered */}
        {registeredCount > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className={cn(kpiBadgeBase, badgeStyles.slate)}>
                <Check className="h-3 w-3 mr-1" />
                {registeredCount}
              </Badge>
            </TooltipTrigger>
            <TooltipContent><p>Ya registrados hoy</p></TooltipContent>
          </Tooltip>
        )}

        {/* New payments to save */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className={cn(kpiBadgeBase, badgeStyles.success)}>
              <Check className="h-3 w-3 mr-1" />
              {totals.count}
            </Badge>
          </TooltipTrigger>
          <TooltipContent><p>Abonos nuevos por guardar</p></TooltipContent>
        </Tooltip>

        {/* No payment */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className={cn(kpiBadgeBase, badgeStyles.danger)}>
              <Ban className="h-3 w-3 mr-1" />
              {combinedTotals.noPayment}
            </Badge>
          </TooltipTrigger>
          <TooltipContent><p>Marcados sin pago</p></TooltipContent>
        </Tooltip>

        {/* Deleted */}
        {combinedTotals.deleted > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className={cn(kpiBadgeBase, badgeStyles.danger)}>
                <Trash2 className="h-3 w-3 mr-1" />
                {combinedTotals.deleted}
              </Badge>
            </TooltipTrigger>
            <TooltipContent><p>Pagos a eliminar</p></TooltipContent>
          </Tooltip>
        )}

        {/* Commission */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className={cn(kpiBadgeBase, badgeStyles.purple)}>
              <DollarSign className="h-3 w-3 mr-1" />
              {formatCurrency(combinedTotals.commission)}
            </Badge>
          </TooltipTrigger>
          <TooltipContent><p>Comision del lider</p></TooltipContent>
        </Tooltip>

        {/* Cash */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className={cn(kpiBadgeBase, badgeStyles.success)}>
              <Wallet className="h-3 w-3 mr-1" />
              {formatCurrency(combinedTotals.cash)}
            </Badge>
          </TooltipTrigger>
          <TooltipContent><p>Cobrado en efectivo</p></TooltipContent>
        </Tooltip>

        {/* Bank transfer */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className={cn(kpiBadgeBase, badgeStyles.info)}>
              <Building2 className="h-3 w-3 mr-1" />
              {formatCurrency(combinedTotals.bank)}
            </Badge>
          </TooltipTrigger>
          <TooltipContent><p>Cobrado por transferencia</p></TooltipContent>
        </Tooltip>

        {/* Total */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className={cn(kpiBadgeBase, 'font-bold', badgeStyles.default)}>
              {formatCurrency(combinedTotals.total)}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <div className="space-y-1 text-xs">
              <p className="font-semibold">Distribucion Total</p>
              <p>Efectivo: {formatCurrency(combinedTotals.cash)}</p>
              <p>Transferencia: {formatCurrency(combinedTotals.bank)}</p>
              <p>Comision: {formatCurrency(combinedTotals.commission)}</p>
            </div>
          </TooltipContent>
        </Tooltip>

        {/* Incomplete */}
        {incompleteCount > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge
                variant="outline"
                className={cn(
                  'text-xs py-0.5 px-2 cursor-pointer transition-colors',
                  showOnlyIncomplete ? badgeStyles.warning : badgeStyles.orange
                )}
                onClick={onToggleIncomplete}
              >
                <AlertTriangle className="h-3 w-3 mr-1" />
                {incompleteCount}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>Click para {showOnlyIncomplete ? 'mostrar todos' : 'filtrar solo incompletos'}</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  )
}
