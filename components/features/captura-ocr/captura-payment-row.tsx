'use client'

import { Wallet, Building2, AlertCircle, XCircle } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { TableRow, TableCell } from '@/components/ui/table'
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip'
import { formatCurrency, cn } from '@/lib/utils'
import type { CapturaClient } from './types'

export interface CapturaPaymentRowState {
  marca: string
  montoPagado: number
  comision: number
  paymentMethod: 'CASH' | 'MONEY_TRANSFER'
  notas: string
}

interface Props {
  client: CapturaClient
  paymentState: CapturaPaymentRowState
  index: number
  matchConfidence?: string
  onToggleFalta: (shiftKey: boolean) => void
  onAmountChange: (amount: number) => void
  onPaymentMethodChange: (method: 'CASH' | 'MONEY_TRANSFER') => void
  onNotesChange: (notes: string) => void
}

function getRowStyle(marca: string, matchConfidence?: string) {
  if (marca === 'FALTA') {
    return 'bg-red-100/80 dark:bg-red-950/60 border-l-4 border-l-red-500 dark:border-l-red-400'
  }
  if (marca === 'ILEGIBLE') {
    return 'bg-yellow-100/80 dark:bg-yellow-950/60 border-l-4 border-l-yellow-500 dark:border-l-yellow-400'
  }
  if (marca === 'RECUPERADO') {
    return 'bg-green-100/80 dark:bg-green-950/60 border-l-4 border-l-green-500 dark:border-l-green-400'
  }
  if (marca !== 'REGULAR') {
    return 'bg-amber-100/80 dark:bg-amber-950/60 border-l-4 border-l-amber-500 dark:border-l-amber-400'
  }
  if (matchConfidence === 'LOW') {
    return 'bg-yellow-50/50 dark:bg-yellow-950/30 border-l-4 border-l-yellow-400/70 dark:border-l-yellow-500/60'
  }
  return 'bg-green-100/80 dark:bg-green-950/60 border-l-4 border-l-green-500 dark:border-l-green-400'
}

function OcrConfidenceIndicator({ confidence }: { confidence?: string }) {
  if (!confidence || confidence === 'HIGH') return null

  const styles: Record<string, string> = {
    MEDIUM: 'text-yellow-600 dark:text-yellow-400',
    LOW: 'text-red-600 dark:text-red-400',
  }
  const labels: Record<string, string> = {
    MEDIUM: 'Confianza media OCR',
    LOW: 'Baja confianza OCR',
  }
  const icons: Record<string, React.ReactNode> = {
    MEDIUM: <AlertCircle className="h-3 w-3" />,
    LOW: <XCircle className="h-3 w-3" />,
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn('inline-flex ml-1', styles[confidence])}>
            {icons[confidence]}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">{labels[confidence]}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export function CapturaPaymentRow({
  client,
  paymentState,
  index,
  matchConfidence,
  onToggleFalta,
  onAmountChange,
  onPaymentMethodChange,
  onNotesChange,
}: Props) {
  const { marca, montoPagado, paymentMethod, notas } = paymentState
  const isFalta = marca === 'FALTA'

  const handleRowClick = (e: React.MouseEvent<HTMLTableRowElement>) => {
    const target = e.target as HTMLElement
    const isInteractive = target.closest('input, select, textarea, button, [role="checkbox"], [data-radix-collection-item]')
    if (isInteractive) return
    e.preventDefault()
    onToggleFalta(e.shiftKey)
  }

  const handleRowKeyDown = (e: React.KeyboardEvent<HTMLTableRowElement>) => {
    if (e.key === ' ' && !e.ctrlKey && !e.metaKey) {
      // Solo toggle si el focus esta en la fila, no en un input hijo
      const target = e.target as HTMLElement
      if (target.closest('input, select, textarea')) return
      e.preventDefault()
      onToggleFalta(e.shiftKey)
    }
  }

  const handleToggleMethod = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isFalta) return
    onPaymentMethodChange(paymentMethod === 'CASH' ? 'MONEY_TRANSFER' : 'CASH')
  }

  const amountDiffers = !isFalta && montoPagado !== client.expectedWeeklyPayment

  return (
    <TableRow
      tabIndex={0}
      className={cn(
        'transition-colors select-none cursor-pointer',
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-inset',
        getRowStyle(marca, matchConfidence),
        isFalta && 'opacity-80'
      )}
      onClick={handleRowClick}
      onKeyDown={handleRowKeyDown}
    >
      {/* Checkbox */}
      <TableCell className="w-[32px] py-1 px-2">
        <Checkbox
          checked={isFalta}
          onCheckedChange={() => onToggleFalta(false)}
        />
      </TableCell>

      {/* Client name + code */}
      <TableCell className="py-1 px-2">
        <div className="flex items-center gap-1">
          <p className={cn('text-xs font-medium truncate max-w-[220px]', isFalta && 'line-through')}>
            {client.borrowerName || '---'}
          </p>
          <OcrConfidenceIndicator confidence={matchConfidence} />
        </div>
        <p className="text-[10px] text-muted-foreground font-mono">{client.clientCode}</p>
      </TableCell>

      {/* Amount paid + commission inline */}
      <TableCell className="w-[100px] py-1 px-1" onClick={(e) => e.stopPropagation()}>
        <Input
          type="number"
          value={isFalta ? 0 : montoPagado}
          onChange={(e) => onAmountChange(parseFloat(e.target.value) || 0)}
          onWheel={(e) => e.currentTarget.blur()}
          className={cn(
            'h-7 w-[85px] text-right text-xs tabular-nums',
            isFalta && 'opacity-50'
          )}
          disabled={isFalta}
        />
        {!isFalta && amountDiffers && (
          <div className="flex items-center justify-end mt-0.5">
            <span className="text-[10px] text-muted-foreground line-through tabular-nums">
              {formatCurrency(client.expectedWeeklyPayment)}
            </span>
          </div>
        )}
      </TableCell>

      {/* Payment method toggle */}
      <TableCell className="w-[36px] py-1 px-1">
        {!isFalta && (
          <button
            onClick={handleToggleMethod}
            className={cn(
              'h-6 w-6 rounded flex items-center justify-center transition-colors',
              paymentMethod === 'CASH'
                ? 'text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30'
                : 'text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30'
            )}
            title={paymentMethod === 'CASH' ? 'Efectivo (click para cambiar)' : 'Banco (click para cambiar)'}
          >
            {paymentMethod === 'CASH'
              ? <Wallet className="h-3.5 w-3.5" />
              : <Building2 className="h-3.5 w-3.5" />
            }
          </button>
        )}
      </TableCell>
    </TableRow>
  )
}
