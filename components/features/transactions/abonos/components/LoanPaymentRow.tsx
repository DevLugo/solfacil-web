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
  CheckCircle2,
  Pencil,
  X,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
import { hasIncompleteAval, hasIncompletePhone } from '../utils'
import { textStyles } from '../../shared/theme'

interface LoanPaymentRowProps {
  loan: ActiveLoan
  index: number
  displayIndex: number
  payment: PaymentEntry | undefined
  registeredPayment: LoanPayment | undefined
  editedPayment: EditedPayment | undefined
  leadPaymentReceivedId: string | null
  isAdmin?: boolean
  onPaymentChange: (amount: string) => void
  onCommissionChange: (commission: string) => void
  onPaymentMethodChange: (method: 'CASH' | 'MONEY_TRANSFER') => void
  onToggleNoPayment: (shiftKey: boolean) => void
  onStartEdit: (startDeleted?: boolean) => void
  onEditChange: (field: keyof EditedPayment, value: string | boolean) => void
  onToggleDelete: () => void
  onCancelEdit: () => void
}

export function LoanPaymentRow({
  loan,
  index,
  displayIndex,
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
  // === STATE DETECTION ===
  const isRegistered = !!registeredPayment
  const isEditing = !!editedPayment
  const isMarkedForDeletion = editedPayment?.isDeleted
  const isDayCaptured = !!leadPaymentReceivedId
  const isCapturedAsNoPayment = isDayCaptured && !isRegistered

  // Determine if this row represents "no payment" from the payments state
  const isNoPayment = !!payment?.isNoPayment
  const hasPaymentAmount = payment && parseFloat(payment.amount || '0') > 0 && !isNoPayment

  // For registered rows, determine original payment state
  const registeredHasPayment = isRegistered && parseFloat(registeredPayment?.amount || '0') > 0

  // Determine if user is adding a payment to a falta
  // A falta becomes "adding payment" when isNoPayment is explicitly set to false
  const isAddingPaymentToFalta = isCapturedAsNoPayment && payment && payment.isNoPayment === false

  // Final state: does this row show as "no payment"?
  // - For registered payments being edited: check if marked for deletion
  // - For registered payments not editing: check if original amount is 0
  // - For faltas: check if user is adding a payment (isNoPayment === false means they're adding)
  // - For pending: check isNoPayment state
  const showAsNoPayment = isRegistered
    ? (isEditing ? isMarkedForDeletion : !registeredHasPayment)
    : isCapturedAsNoPayment
      ? !isAddingPaymentToFalta // Falta shows as no payment unless user is adding
      : isNoPayment

  // Does this row have a payment to show?
  const hasPayment = isRegistered
    ? (isEditing ? !isMarkedForDeletion && parseFloat(editedPayment?.amount || '0') > 0 : registeredHasPayment)
    : hasPaymentAmount || isAddingPaymentToFalta

  // Is this row in "captured" visual state? (muted colors)
  const isCaptured = isDayCaptured || isRegistered

  const aval = loan.collaterals?.[0]
  const isIncompleteAval = hasIncompleteAval(loan)
  const isIncompletePhone = hasIncompletePhone(loan)

  // === ROW STYLING ===
  // Simple 2-color scheme: green (has payment) or red (no payment)
  // Captured = muted colors, Pending = vivid colors
  const getRowStyle = () => {
    if (isCaptured) {
      // Captured rows - muted colors
      if (showAsNoPayment) {
        return 'bg-rose-50/70 dark:bg-rose-950/50 border-l-4 border-l-rose-400/70 dark:border-l-rose-500/60'
      }
      return 'bg-emerald-50/70 dark:bg-emerald-950/50 border-l-4 border-l-emerald-400/70 dark:border-l-emerald-500/60'
    } else {
      // Pending rows - vivid colors
      if (showAsNoPayment) {
        return 'bg-red-100/80 dark:bg-red-950/60 border-l-4 border-l-red-500 dark:border-l-red-400'
      }
      if (hasPayment) {
        return 'bg-green-100/80 dark:bg-green-950/60 border-l-4 border-l-green-500 dark:border-l-green-400'
      }
      return ''
    }
  }

  // === CLICK HANDLING ===
  // Unified: toggle between payment and no payment
  const handleToggle = (shiftKey: boolean = false) => {
    if (isRegistered) {
      // For registered payments, just enter edit mode on click
      // User can explicitly use the checkbox to mark for deletion
      if (!isEditing) {
        onStartEdit()
      }
      // If already editing, clicking row does nothing (user must use checkbox or cancel button)
    } else {
      // For pending rows OR faltas (captured but no payment record)
      // Toggle no payment - this allows adding a payment to a falta
      onToggleNoPayment(shiftKey)
    }
  }

  const handleRowClick = (e: React.MouseEvent<HTMLTableRowElement>) => {
    // Don't handle clicks on interactive elements
    const target = e.target as HTMLElement
    const isInteractive = target.closest('input, select, textarea, button, [role="checkbox"], [data-radix-collection-item]')
    if (isInteractive) return

    // Prevent default to avoid text selection issues
    e.preventDefault()
    handleToggle(e.shiftKey)
  }

  // === BADGE STYLING ===
  const getBadgeStyle = () => {
    if (isCaptured) {
      if (showAsNoPayment) {
        return 'bg-rose-600/90 dark:bg-rose-500/90 text-white hover:bg-rose-600 dark:hover:bg-rose-500'
      }
      return 'bg-emerald-600/90 dark:bg-emerald-500/90 text-white hover:bg-emerald-600 dark:hover:bg-emerald-500'
    } else {
      if (showAsNoPayment) {
        return 'bg-red-600 dark:bg-red-500 text-white hover:bg-red-700 dark:hover:bg-red-600'
      }
      if (hasPayment) {
        return 'bg-green-600 dark:bg-green-500 text-white hover:bg-green-700 dark:hover:bg-green-600'
      }
      return ''
    }
  }

  // === RENDER ===
  return (
    <TableRow
      className={cn(
        'transition-colors select-none cursor-pointer',
        getRowStyle(),
        showAsNoPayment && 'line-through opacity-80'
      )}
      onClick={handleRowClick}
    >
      {/* Checkbox - same behavior as row click */}
      <TableCell className="cursor-pointer">
        <Checkbox
          checked={showAsNoPayment}
          onCheckedChange={() => {
            if (isRegistered) {
              // For registered payments, toggle delete in edit mode
              if (!isEditing) {
                // Start edit mode with payment already marked for deletion
                onStartEdit(true)
              } else {
                onToggleDelete()
              }
            } else {
              // For pending rows OR faltas, toggle no payment
              onToggleNoPayment(false)
            }
          }}
        />
      </TableCell>

      {/* Index */}
      <TableCell className="font-medium text-muted-foreground">
        {displayIndex}
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
          // Registered payment - show input when editing, otherwise show value
          isEditing && !isMarkedForDeletion ? (
            <Input
              type="number"
              placeholder="0"
              value={editedPayment?.amount || ''}
              onChange={(e) => onEditChange('amount', e.target.value)}
              onWheel={(e) => e.currentTarget.blur()}
              className="w-[90px]"
            />
          ) : (
            <div className={cn(
              'w-[90px] h-9 px-3 flex items-center text-sm font-medium',
              showAsNoPayment ? 'text-muted-foreground' : textStyles.muted
            )}>
              {showAsNoPayment ? '-' : formatCurrency(parseFloat(registeredPayment?.amount || '0'))}
            </div>
          )
        ) : (
          // Pending or falta - show input (enabled when adding payment)
          <Input
            type="number"
            placeholder="0"
            value={payment?.amount || ''}
            onChange={(e) => onPaymentChange(e.target.value)}
            onWheel={(e) => e.currentTarget.blur()}
            className={cn(
              "w-[90px] border-2 border-dashed border-muted-foreground/30 bg-muted/30 focus:border-solid focus:border-primary focus:bg-background",
              showAsNoPayment && "opacity-50"
            )}
            disabled={showAsNoPayment}
          />
        )}
      </TableCell>

      {/* Commission */}
      <TableCell onClick={(e) => e.stopPropagation()}>
        {isRegistered ? (
          // Registered payment - show input when editing, otherwise show value
          isEditing && !isMarkedForDeletion ? (
            <Input
              type="number"
              placeholder="0"
              value={editedPayment?.comission || ''}
              onChange={(e) => onEditChange('comission', e.target.value)}
              onWheel={(e) => e.currentTarget.blur()}
              className="w-[70px]"
            />
          ) : (
            <div className={cn(
              'w-[70px] h-9 px-3 flex items-center text-sm',
              showAsNoPayment ? 'text-muted-foreground' : textStyles.muted
            )}>
              {showAsNoPayment ? '-' : formatCurrency(parseFloat(registeredPayment?.comission || '0'))}
            </div>
          )
        ) : (
          // Pending or falta - show input (enabled when adding payment)
          <Input
            type="number"
            placeholder="0"
            value={payment?.commission || ''}
            onChange={(e) => onCommissionChange(e.target.value)}
            onWheel={(e) => e.currentTarget.blur()}
            className={cn(
              "w-[70px] border-2 border-dashed border-muted-foreground/30 bg-muted/30 focus:border-solid focus:border-primary focus:bg-background",
              showAsNoPayment && "opacity-50"
            )}
            disabled={showAsNoPayment}
          />
        )}
      </TableCell>

      {/* Payment method */}
      <TableCell onClick={(e) => e.stopPropagation()}>
        {isRegistered ? (
          // Registered payment - show select when editing, otherwise show value
          isEditing && !isMarkedForDeletion ? (
            <Select
              value={editedPayment?.paymentMethod || 'CASH'}
              onValueChange={(value) => onEditChange('paymentMethod', value)}
            >
              <SelectTrigger className="w-[110px]">
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
            <div className={cn(
              'w-[110px] h-9 px-3 flex items-center gap-2 text-sm',
              showAsNoPayment ? 'text-muted-foreground' : textStyles.muted
            )}>
              {showAsNoPayment ? (
                '-'
              ) : registeredPayment?.paymentMethod === 'MONEY_TRANSFER' ? (
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
          // Pending or falta - show select (enabled when adding payment)
          <Select
            value={payment?.paymentMethod || 'CASH'}
            onValueChange={(value) => onPaymentMethodChange(value as 'CASH' | 'MONEY_TRANSFER')}
            disabled={showAsNoPayment}
          >
            <SelectTrigger className={cn("w-[110px]", showAsNoPayment && "opacity-50")}>
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

      {/* Status Badge + Edit Button */}
      <TableCell onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-1">
          {isCaptured ? (
            <>
              <Badge className={cn('text-xs font-semibold shadow-sm', getBadgeStyle())}>
                <CheckCircle2 className="h-3 w-3 mr-1" />
                {showAsNoPayment ? 'Falta' : isEditing ? 'Editando' : 'Capturado'}
              </Badge>
              {/* Edit/Cancel button for registered payments */}
              {isRegistered && (
                isEditing ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                    onClick={onCancelEdit}
                    title="Cancelar edición"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                    onClick={() => onStartEdit()}
                    title="Editar pago"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                )
              )}
            </>
          ) : showAsNoPayment ? (
            <Badge className={cn('text-xs font-semibold shadow-sm', getBadgeStyle())}>
              <Ban className="h-3 w-3 mr-1" />
              Sin pago
            </Badge>
          ) : hasPayment ? (
            <Badge className={cn('text-xs font-semibold shadow-sm', getBadgeStyle())}>
              <Check className="h-3 w-3 mr-1" />
              {payment?.paymentMethod === 'MONEY_TRANSFER' ? 'Banco' : 'Efectivo'}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs text-muted-foreground">
              Pendiente
            </Badge>
          )}
        </div>
      </TableCell>

      {/* Admin-only columns */}
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
