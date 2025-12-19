'use client'

import {
  User,
  AlertTriangle,
  CheckCircle,
  Trash2,
  Pencil,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { TableCell, TableRow } from '@/components/ui/table'
import { formatCurrency } from '@/lib/utils'
import type { Loan } from '../types'

interface LoanTableRowProps {
  loan: Loan
  isAdmin: boolean
  onEdit: (loan: Loan) => void
  onCancel: (loan: Loan) => void
}

export function LoanTableRow({ loan, isAdmin, onEdit, onCancel }: LoanTableRowProps) {
  const aval = loan.collaterals[0]
  const hasAval = aval && aval.fullName
  const isRenewal = loan.previousLoan !== null

  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <div>
            <div className="flex items-center gap-2">
              <p className="font-medium">
                {loan.borrower.personalData?.fullName || 'Sin nombre'}
              </p>
              {isRenewal && (
                <Badge variant="outline" className="text-xs gap-1">
                  <RefreshCw className="h-3 w-3" />
                  Renovación
                </Badge>
              )}
            </div>
            {loan.borrower.personalData?.phones?.[0]?.number && (
              <p className="text-xs text-muted-foreground">
                {loan.borrower.personalData.phones[0].number}
              </p>
            )}
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge variant="outline">{loan.loantype.name}</Badge>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          {hasAval ? (
            <>
              <CheckCircle className="h-4 w-4 text-success" />
              <span className="text-sm">{aval.fullName}</span>
            </>
          ) : (
            <>
              <AlertTriangle className="h-4 w-4 text-warning" />
              <span className="text-sm text-muted-foreground">Pendiente</span>
            </>
          )}
        </div>
      </TableCell>
      <TableCell className="text-right">
        <div className="space-y-0.5">
          <div className="font-medium">
            {formatCurrency(parseFloat(loan.requestedAmount))}
          </div>
          <div className="text-xs text-muted-foreground">
            Entregado: {formatCurrency(parseFloat(loan.amountGived))}
          </div>
          {isRenewal && loan.previousLoan && (
            <div className="text-xs text-warning">
              Deuda anterior: {formatCurrency(parseFloat(loan.previousLoan.pendingAmountStored || '0'))}
            </div>
          )}
        </div>
      </TableCell>
      <TableCell className="text-right">
        {formatCurrency(parseFloat(loan.expectedWeeklyPayment))}
      </TableCell>
      <TableCell className="text-right">
        {formatCurrency(parseFloat(loan.totalDebtAcquired || '0'))}
      </TableCell>
      {isAdmin && (
        <>
          <TableCell className="text-right bg-muted/50">
            <div className="text-xs text-muted-foreground">Capital</div>
            <div className="font-medium">{formatCurrency(parseFloat(loan.requestedAmount))}</div>
          </TableCell>
          <TableCell className="text-right bg-muted/50">
            <div className="text-xs text-muted-foreground">Ganancia</div>
            <div className="font-medium">{formatCurrency(parseFloat(loan.profitAmount || '0'))}</div>
          </TableCell>
        </>
      )}
      <TableCell>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onEdit(loan)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={() => onCancel(loan)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}
