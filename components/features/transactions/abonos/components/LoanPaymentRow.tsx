'use client'

import { format } from 'date-fns'
import {
  User,
  Phone,
  AlertTriangle,
  Check,
  Ban,
  Wallet,
  Building2,
  Pencil,
  Trash2,
  RotateCcw,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { TableRow, TableCell } from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { ActiveLoan, PaymentEntry, EditedPayment, LoanPayment } from '../types'
import { getRowClassName, hasIncompleteAval, hasIncompletePhone } from '../utils'
import { textStyles, actionButtonStyles, statusBadgeStyles } from '../../shared/theme'

interface LoanPaymentRowProps {
  loan: ActiveLoan
  index: number
  payment: PaymentEntry | undefined
  registeredPayment: LoanPayment | undefined
  editedPayment: EditedPayment | undefined
  leadPaymentReceivedId: string | null
  isAdmin?: boolean
  onPaymentChange: (amount: string) => void
  onCommissionChange: (commission: string) => void
  onPaymentMethodChange: (method: 'CASH' | 'MONEY_TRANSFER') => void
  onToggleNoPayment: (shiftKey: boolean) => void
  onStartEdit: () => void
  onEditChange: (field: keyof EditedPayment, value: string | boolean) => void
  onToggleDelete: () => void
  onCancelEdit: () => void
}

export function LoanPaymentRow({
  loan,
  index,
  payment,
  registeredPayment,
  editedPayment,
  leadPaymentReceivedId,
  isAdmin,
  onPaymentChange,
  onCommissionChange,
  onPaymentMethodChange,
  onToggleNoPayment,
  onStartEdit,
  onEditChange,
  onToggleDelete,
  onCancelEdit,
}: LoanPaymentRowProps) {
  const isRegistered = !!registeredPayment
  const isEditing = !!editedPayment
  const isMarkedForDeletion = editedPayment?.isDeleted
  const isNoPayment = payment?.isNoPayment || (leadPaymentReceivedId && !isRegistered)
  const hasPayment = payment && payment.amount && parseFloat(payment.amount) > 0 && !payment?.isNoPayment
  const isTransfer = payment?.paymentMethod === 'MONEY_TRANSFER'
  const isCash = payment?.paymentMethod === 'CASH' || !payment?.paymentMethod
  const hasZeroCommission = hasPayment && parseFloat(payment?.commission || '0') === 0
  const aval = loan.collaterals?.[0]
  const isIncompleteAval = hasIncompleteAval(loan)
  const isIncompletePhone = hasIncompletePhone(loan)
  const isIncomplete = isIncompleteAval || isIncompletePhone

  const rowClassName = getRowClassName({
    isMarkedForDeletion: !!isMarkedForDeletion,
    isEditing,
    isRegistered,
    isNoPayment: !!isNoPayment,
    isIncomplete,
    hasPayment: !!hasPayment,
    hasZeroCommission: !!hasZeroCommission,
    isTransfer: !!isTransfer,
    isCash: !!isCash,
  })

  const handleRowClick = (e: React.MouseEvent<HTMLTableRowElement>) => {
    const target = e.target as HTMLElement
    const selection = window.getSelection()
    if (selection && selection.toString().length > 0) return

    const isInput = target.closest('input, select, textarea')
    const isButton = target.closest('button')
    const isCheckbox = target.closest('[role="checkbox"]')
    if (isInput || isButton || isCheckbox) return

    if (isRegistered && registeredPayment) {
      if (isEditing) {
        onToggleDelete()
      } else {
        onStartEdit()
        setTimeout(() => onToggleDelete(), 0)
      }
      return
    }

    onToggleNoPayment(e.shiftKey)
  }

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isRegistered && registeredPayment) {
      if (isEditing) {
        onToggleDelete()
      } else {
        onStartEdit()
        setTimeout(() => onToggleDelete(), 0)
      }
    } else {
      onToggleNoPayment(e.shiftKey)
    }
  }

  return (
    <TableRow
      className={cn(
        'transition-colors select-none cursor-pointer',
        rowClassName,
        isNoPayment && 'line-through opacity-70'
      )}
      onClick={handleRowClick}
    >
      {/* Checkbox */}
      <TableCell
        onClick={handleCheckboxClick}
        className="cursor-pointer"
        title={isRegistered ? 'Click para marcar sin pago (strikethrough)' : 'Click para marcar sin pago'}
      >
        <Checkbox
          checked={isMarkedForDeletion || !!isNoPayment}
          onCheckedChange={() => handleCheckboxClick({ stopPropagation: () => {} } as React.MouseEvent)}
        />
      </TableCell>

      {/* Index */}
      <TableCell
        className="font-medium text-muted-foreground cursor-pointer"
        onClick={(e) => {
          e.stopPropagation()
          onToggleNoPayment(e.shiftKey)
        }}
        title="Click para marcar sin pago"
      >
        {index + 1}
      </TableCell>

      {/* Client */}
      <TableCell>
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <div>
            <p className="font-medium text-sm">
              {loan.borrower.personalData?.fullName || 'Sin nombre'}
            </p>
            {loan.borrower.personalData?.phones?.[0]?.number ? (
              <p className="text-xs text-muted-foreground">
                {loan.borrower.personalData.phones[0].number}
              </p>
            ) : (
              <p className={cn('text-xs flex items-center gap-1', textStyles.orange)}>
                <Phone className="h-3 w-3" />
                Sin teléfono
              </p>
            )}
          </div>
        </div>
      </TableCell>

      {/* Aval */}
      <TableCell>
        {aval ? (
          <div>
            <p className="text-sm">{aval.fullName || <span className={textStyles.orange}>Sin nombre</span>}</p>
            {aval.phones?.[0]?.number ? (
              <p className="text-xs text-muted-foreground">{aval.phones[0].number}</p>
            ) : (
              <p className={cn('text-xs flex items-center gap-1', textStyles.orange)}>
                <Phone className="h-3 w-3" />
                Sin teléfono
              </p>
            )}
          </div>
        ) : (
          <span className={cn('text-sm flex items-center gap-1', textStyles.orange)}>
            <AlertTriangle className="h-3 w-3" />
            Sin aval
          </span>
        )}
      </TableCell>

      {/* Sign date */}
      <TableCell className="text-right text-sm text-muted-foreground">
        {loan.signDate ? format(new Date(loan.signDate), 'dd/MM/yy') : '-'}
      </TableCell>

      {/* Expected weekly payment */}
      <TableCell className="text-right font-medium">
        {formatCurrency(parseFloat(loan.expectedWeeklyPayment))}
      </TableCell>

      {/* Amount */}
      <TableCell onClick={(e) => e.stopPropagation()}>
        {isRegistered ? (
          isEditing ? (
            <Input
              type="number"
              placeholder="0"
              value={editedPayment.amount}
              onChange={(e) => onEditChange('amount', e.target.value)}
              className={cn("w-[90px]", isMarkedForDeletion && "opacity-50")}
              disabled={isMarkedForDeletion}
            />
          ) : (
            <div className={cn('w-[90px] h-9 px-3 flex items-center text-sm font-medium', textStyles.muted)}>
              {formatCurrency(parseFloat(registeredPayment.amount))}
            </div>
          )
        ) : (
          <Input
            type="number"
            placeholder="0"
            value={payment?.amount || ''}
            onChange={(e) => onPaymentChange(e.target.value)}
            className={cn("w-[90px]", isNoPayment && "opacity-50")}
            disabled={!!isNoPayment}
          />
        )}
      </TableCell>

      {/* Commission */}
      <TableCell onClick={(e) => e.stopPropagation()}>
        {isRegistered ? (
          isEditing ? (
            <Input
              type="number"
              placeholder="0"
              value={editedPayment.comission}
              onChange={(e) => onEditChange('comission', e.target.value)}
              className={cn("w-[70px]", isMarkedForDeletion && "opacity-50")}
              disabled={isMarkedForDeletion}
            />
          ) : (
            <div className={cn('w-[70px] h-9 px-3 flex items-center text-sm', textStyles.muted)}>
              {formatCurrency(parseFloat(registeredPayment.comission || '0'))}
            </div>
          )
        ) : (
          <Input
            type="number"
            placeholder="0"
            value={payment?.commission || ''}
            onChange={(e) => onCommissionChange(e.target.value)}
            className={cn("w-[70px]", isNoPayment && "opacity-50")}
            disabled={!!isNoPayment}
          />
        )}
      </TableCell>

      {/* Payment method */}
      <TableCell onClick={(e) => e.stopPropagation()}>
        {isRegistered ? (
          isEditing ? (
            <Select
              value={editedPayment.paymentMethod}
              onValueChange={(value) => onEditChange('paymentMethod', value)}
              disabled={isMarkedForDeletion}
            >
              <SelectTrigger className={cn("w-[110px]", isMarkedForDeletion && "opacity-50")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CASH">
                  <div className="flex items-center gap-2">
                    <Wallet className="h-4 w-4" />
                    Efectivo
                  </div>
                </SelectItem>
                <SelectItem value="MONEY_TRANSFER">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Banco
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <div className={cn('w-[110px] h-9 px-3 flex items-center gap-2 text-sm', textStyles.muted)}>
              {registeredPayment.paymentMethod === 'MONEY_TRANSFER' ? (
                <>
                  <Building2 className="h-4 w-4" />
                  Banco
                </>
              ) : (
                <>
                  <Wallet className="h-4 w-4" />
                  Efectivo
                </>
              )}
            </div>
          )
        ) : (
          <Select
            value={payment?.paymentMethod || 'CASH'}
            onValueChange={(value) => onPaymentMethodChange(value as 'CASH' | 'MONEY_TRANSFER')}
            disabled={!!isNoPayment}
          >
            <SelectTrigger className={cn("w-[110px]", isNoPayment && "opacity-50")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="CASH">
                <div className="flex items-center gap-2">
                  <Wallet className="h-4 w-4" />
                  Efectivo
                </div>
              </SelectItem>
              <SelectItem value="MONEY_TRANSFER">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Banco
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        )}
      </TableCell>

      {/* Status */}
      <TableCell
        className={isRegistered && !isEditing ? 'cursor-default' : 'cursor-pointer'}
        onClick={(e) => {
          e.stopPropagation()
          if (!isRegistered) {
            onToggleNoPayment(e.shiftKey)
          }
        }}
        title={isRegistered && !isEditing ? 'Pago ya registrado - click en Editar para modificar' : !isRegistered ? 'Click para marcar sin pago' : ''}
      >
        {isRegistered ? (
          isEditing ? (
            <div className="flex items-center gap-1">
              {isMarkedForDeletion ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation()
                    onToggleDelete()
                  }}
                  className={cn('h-7 px-2', actionButtonStyles.restore)}
                  title="Restaurar pago"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation()
                    onToggleDelete()
                  }}
                  className={cn('h-7 px-2', actionButtonStyles.delete)}
                  title="Eliminar pago"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation()
                  onCancelEdit()
                }}
                className="h-7 px-2 text-muted-foreground hover:text-foreground"
                title="Cancelar edición"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <Badge className={cn('text-xs font-semibold', statusBadgeStyles.registered)}>
                <Check className="h-3 w-3 mr-1" />
                Registrado
              </Badge>
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation()
                  onStartEdit()
                }}
                className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                title="Editar pago"
              >
                <Pencil className="h-3 w-3" />
              </Button>
            </div>
          )
        ) : isNoPayment ? (
          <Badge variant="destructive" className="text-xs cursor-pointer font-semibold">
            <Ban className="h-3 w-3 mr-1" />
            Sin pago
          </Badge>
        ) : hasPayment && isTransfer ? (
          <Badge className={cn('text-xs cursor-pointer font-semibold', statusBadgeStyles.transfer)}>
            <Building2 className="h-3 w-3 mr-1" />
            Banco
          </Badge>
        ) : hasPayment ? (
          <Badge className={cn('text-xs cursor-pointer font-semibold', statusBadgeStyles.cash)}>
            <Wallet className="h-3 w-3 mr-1" />
            Efectivo
          </Badge>
        ) : (
          <Badge variant="outline" className="text-xs text-muted-foreground cursor-pointer">
            Pendiente
          </Badge>
        )}
        {hasZeroCommission && !isRegistered && (
          <Badge variant="outline" className={cn('text-xs ml-1', statusBadgeStyles.zeroCommission)}>
            $0
          </Badge>
        )}
      </TableCell>

      {/* Admin-only columns: Profit and Return to Capital */}
      {isAdmin && (
        <>
          <TableCell className="text-right bg-muted/50">
            {isRegistered && registeredPayment.transactions?.[0] ? (
              <span className={cn('text-sm font-medium', textStyles.success)}>
                {formatCurrency(parseFloat(registeredPayment.transactions[0].profitAmount || '0'))}
              </span>
            ) : (
              <span className="text-sm text-muted-foreground">-</span>
            )}
          </TableCell>
          <TableCell className="text-right bg-muted/50">
            {isRegistered && registeredPayment.transactions?.[0] ? (
              <span className={cn('text-sm font-medium', textStyles.blue)}>
                {formatCurrency(parseFloat(registeredPayment.transactions[0].returnToCapital || '0'))}
              </span>
            ) : (
              <span className="text-sm text-muted-foreground">-</span>
            )}
          </TableCell>
        </>
      )}
    </TableRow>
  )
}
