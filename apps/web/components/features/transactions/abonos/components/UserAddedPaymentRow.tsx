'use client'

import { format } from 'date-fns'
import { Trash2, User, Plus, Check, Wallet, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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
import type { UserAddedPayment, ActiveLoan } from '../types'

interface UserAddedPaymentRowProps {
  payment: UserAddedPayment
  availableLoans: ActiveLoan[]
  selectedLoan: ActiveLoan | undefined
  isAdmin?: boolean
  onLoanChange: (loanId: string) => void
  onAmountChange: (amount: string) => void
  onCommissionChange: (commission: string) => void
  onPaymentMethodChange: (method: 'CASH' | 'MONEY_TRANSFER') => void
  onRemove: () => void
}

export function UserAddedPaymentRow({
  payment,
  availableLoans,
  selectedLoan,
  isAdmin,
  onLoanChange,
  onAmountChange,
  onCommissionChange,
  onPaymentMethodChange,
  onRemove,
}: UserAddedPaymentRowProps) {
  const hasValidAmount = parseFloat(payment.amount || '0') > 0
  const hasLoanSelected = !!payment.loanId
  const isComplete = hasValidAmount && hasLoanSelected

  return (
    <TableRow
      className={cn(
        'transition-colors bg-blue-50 dark:bg-blue-950/30',
        isComplete && 'bg-green-50 dark:bg-green-950/30'
      )}
      style={{
        borderLeft: `4px solid ${isComplete ? '#22c55e' : '#3b82f6'}`,
      }}
    >
      {/* Remove button */}
      <TableCell>
        <Button
          size="sm"
          variant="ghost"
          onClick={onRemove}
          className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
          title="Eliminar pago"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </TableCell>

      {/* Index */}
      <TableCell className="font-medium text-blue-600">
        <Plus className="h-4 w-4" />
      </TableCell>

      {/* Loan selector */}
      <TableCell colSpan={2}>
        <Select value={payment.loanId} onValueChange={onLoanChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Selecciona un préstamo..." />
          </SelectTrigger>
          <SelectContent>
            {availableLoans.map((loan) => (
              <SelectItem key={loan.id} value={loan.id}>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span className="font-medium">
                    {loan.borrower?.personalData?.fullName || 'Sin nombre'}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    ({loan.loantype?.name} - {formatCurrency(parseFloat(loan.expectedWeeklyPayment))})
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>

      {/* Sign date */}
      <TableCell className="text-right text-sm text-muted-foreground">
        {selectedLoan?.signDate
          ? format(new Date(selectedLoan.signDate), 'dd/MM/yy')
          : '-'}
      </TableCell>

      {/* Expected weekly payment */}
      <TableCell className="text-right font-medium">
        {selectedLoan
          ? formatCurrency(parseFloat(selectedLoan.expectedWeeklyPayment))
          : '-'}
      </TableCell>

      {/* Amount input */}
      <TableCell onClick={(e) => e.stopPropagation()}>
        <Input
          type="number"
          placeholder="0"
          value={payment.amount}
          onChange={(e) => onAmountChange(e.target.value)}
          className="w-[90px]"
        />
      </TableCell>

      {/* Commission input */}
      <TableCell onClick={(e) => e.stopPropagation()}>
        <Input
          type="number"
          placeholder="0"
          value={payment.commission}
          onChange={(e) => onCommissionChange(e.target.value)}
          className="w-[70px]"
        />
      </TableCell>

      {/* Payment method */}
      <TableCell onClick={(e) => e.stopPropagation()}>
        <Select
          value={payment.paymentMethod}
          onValueChange={(value) => onPaymentMethodChange(value as 'CASH' | 'MONEY_TRANSFER')}
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
      </TableCell>

      {/* Status */}
      <TableCell>
        {isComplete ? (
          <Badge className="bg-green-600 text-xs font-semibold">
            <Check className="h-3 w-3 mr-1" />
            Listo
          </Badge>
        ) : (
          <Badge variant="outline" className="text-xs text-blue-600 border-blue-300">
            <Plus className="h-3 w-3 mr-1" />
            Nuevo
          </Badge>
        )}
      </TableCell>

      {/* Admin-only columns (empty for new payments) */}
      {isAdmin && (
        <>
          <TableCell className="text-right bg-muted/50">
            <span className="text-sm text-muted-foreground">-</span>
          </TableCell>
          <TableCell className="text-right bg-muted/50">
            <span className="text-sm text-muted-foreground">-</span>
          </TableCell>
        </>
      )}
    </TableRow>
  )
}
