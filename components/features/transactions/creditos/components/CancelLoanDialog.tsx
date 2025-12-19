'use client'

import { Loader2 } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { formatCurrency } from '@/lib/utils'
import type { Loan, Account } from '../types'

interface CancelLoanDialogProps {
  loan: Loan | null
  account: Account | undefined
  canceling: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function CancelLoanDialog({
  loan,
  account,
  canceling,
  onConfirm,
  onCancel,
}: CancelLoanDialogProps) {
  return (
    <AlertDialog open={!!loan} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancelar Crédito</AlertDialogTitle>
          <AlertDialogDescription>
            {loan && (
              <>
                ¿Estás seguro de cancelar el crédito de{' '}
                <strong>{loan.borrower.personalData.fullName}</strong> por{' '}
                <strong>{formatCurrency(parseFloat(loan.amountGived))}</strong>?
                <br />
                <br />
                El monto será restaurado a la cuenta {account?.name}.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>No, mantener</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={canceling}
            className="bg-destructive hover:bg-destructive/90"
          >
            {canceling && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Sí, cancelar crédito
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
