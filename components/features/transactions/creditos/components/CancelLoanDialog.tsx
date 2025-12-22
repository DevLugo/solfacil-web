'use client'

import { useEffect, useMemo } from 'react'
import { useLazyQuery } from '@apollo/client'
import { Loader2, ArrowRight, Banknote, Building2 } from 'lucide-react'
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
import { LOAN_PAYMENTS_BY_LOAN_QUERY } from '@/graphql/queries/transactions'
import type { Loan, Account } from '../types'

interface LoanPayment {
  id: string
  amount: string
  comission: string
  receivedAt: string
  paymentMethod: 'CASH' | 'MONEY_TRANSFER'
}

interface CancelLoanDialogProps {
  loan: Loan | null
  account: Account | undefined
  bankAccount?: Account | undefined
  canceling: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function CancelLoanDialog({
  loan,
  account,
  bankAccount,
  canceling,
  onConfirm,
  onCancel,
}: CancelLoanDialogProps) {
  // Fetch loan payments when dialog opens
  const [fetchPayments, { data: paymentsData, loading: loadingPayments }] = useLazyQuery(
    LOAN_PAYMENTS_BY_LOAN_QUERY
  )

  useEffect(() => {
    if (loan) {
      fetchPayments({ variables: { loanId: loan.id } })
    }
  }, [loan, fetchPayments])

  const payments: LoanPayment[] = paymentsData?.loanPayments || []

  // Calculate totals
  const { cashPayments, bankPayments, totalCashAmount, totalBankAmount, totalComissions } = useMemo(() => {
    let cashTotal = 0
    let bankTotal = 0
    let comissionsTotal = 0
    const cash: LoanPayment[] = []
    const bank: LoanPayment[] = []

    for (const payment of payments) {
      const amount = parseFloat(payment.amount)
      const comission = parseFloat(payment.comission || '0')
      comissionsTotal += comission

      if (payment.paymentMethod === 'MONEY_TRANSFER') {
        bankTotal += amount
        bank.push(payment)
      } else {
        cashTotal += amount
        cash.push(payment)
      }
    }

    return {
      cashPayments: cash,
      bankPayments: bank,
      totalCashAmount: cashTotal,
      totalBankAmount: bankTotal,
      totalComissions: comissionsTotal,
    }
  }, [payments])

  // Calculate account balances after cancellation
  const accountBalances = useMemo(() => {
    if (!loan || !account) return null

    const amountGived = parseFloat(loan.amountGived)
    const loanComission = parseFloat(loan.comissionAmount || '0')
    const currentAccountBalance = parseFloat(account.amount)

    // Route account: +amountGived +loanComission -cashPayments +paymentComissions
    const routeChange = amountGived + loanComission - totalCashAmount + totalComissions
    const newAccountBalance = currentAccountBalance + routeChange

    // Bank account (if applicable)
    let currentBankBalance = 0
    let newBankBalance = 0
    if (bankAccount && totalBankAmount > 0) {
      currentBankBalance = parseFloat(bankAccount.amount)
      newBankBalance = currentBankBalance - totalBankAmount
    }

    return {
      // Breakdown values
      amountGived,
      loanComission,
      totalCashAmount,
      totalComissions,
      // Calculated values
      routeChange,
      currentAccountBalance,
      newAccountBalance,
      currentBankBalance,
      newBankBalance,
      hasBankChanges: totalBankAmount > 0,
    }
  }, [loan, account, bankAccount, totalCashAmount, totalBankAmount, totalComissions])

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })
  }

  return (
    <AlertDialog open={!!loan} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>Cancelar Crédito</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              {loan && (
                <>
                  <p>
                    ¿Estás seguro de cancelar el crédito de{' '}
                    <strong>{loan.borrower.personalData.fullName}</strong> por{' '}
                    <strong>{formatCurrency(parseFloat(loan.amountGived))}</strong>?
                  </p>

                  {/* Payments to delete */}
                  {loadingPayments ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Cargando pagos...
                    </div>
                  ) : payments.length > 0 ? (
                    <div className="border rounded-lg p-3 bg-muted/50">
                      <p className="font-medium text-foreground mb-2">
                        Pagos a eliminar ({payments.length}):
                      </p>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {payments.map((payment) => (
                          <div
                            key={payment.id}
                            className="flex items-center justify-between text-sm"
                          >
                            <span className="flex items-center gap-2">
                              {payment.paymentMethod === 'MONEY_TRANSFER' ? (
                                <Building2 className="h-3 w-3 text-blue-500" />
                              ) : (
                                <Banknote className="h-3 w-3 text-green-500" />
                              )}
                              {formatDate(payment.receivedAt)}
                            </span>
                            <span className="font-medium">
                              {formatCurrency(parseFloat(payment.amount))}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="border-t mt-2 pt-2 flex justify-between text-sm font-medium">
                        <span>Total pagos:</span>
                        <span>{formatCurrency(totalCashAmount + totalBankAmount)}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">
                      Este crédito no tiene pagos registrados.
                    </p>
                  )}

                  {/* Account balance preview */}
                  {accountBalances && (
                    <div className="border rounded-lg p-3 space-y-3">
                      <p className="font-medium text-foreground">Efecto en cuentas:</p>

                      {/* Route account breakdown */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                          <Banknote className="h-4 w-4 text-green-500" />
                          {account?.name || 'Cuenta de ruta'}
                        </div>

                        {/* Breakdown */}
                        <div className="ml-6 space-y-1 text-sm text-muted-foreground">
                          <div className="flex justify-between">
                            <span>Saldo actual:</span>
                            <span className="font-mono">{formatCurrency(accountBalances.currentAccountBalance)}</span>
                          </div>
                          <div className="flex justify-between text-green-600">
                            <span>+ Monto prestado a devolver:</span>
                            <span className="font-mono">+{formatCurrency(accountBalances.amountGived)}</span>
                          </div>
                          {accountBalances.loanComission > 0 && (
                            <div className="flex justify-between text-green-600">
                              <span>+ Comisión del crédito:</span>
                              <span className="font-mono">+{formatCurrency(accountBalances.loanComission)}</span>
                            </div>
                          )}
                          {accountBalances.totalCashAmount > 0 && (
                            <div className="flex justify-between text-red-600">
                              <span>- Abonos en efectivo:</span>
                              <span className="font-mono">-{formatCurrency(accountBalances.totalCashAmount)}</span>
                            </div>
                          )}
                          {accountBalances.totalComissions > 0 && (
                            <div className="flex justify-between text-green-600">
                              <span>+ Comisiones de pagos:</span>
                              <span className="font-mono">+{formatCurrency(accountBalances.totalComissions)}</span>
                            </div>
                          )}
                          <div className="flex justify-between pt-1 border-t font-medium text-foreground">
                            <span>Nuevo saldo:</span>
                            <span className={`font-mono ${accountBalances.routeChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatCurrency(accountBalances.newAccountBalance)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Bank account (if applicable) */}
                      {accountBalances.hasBankChanges && bankAccount && (
                        <div className="space-y-1 pt-2 border-t">
                          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                            <Building2 className="h-4 w-4 text-blue-500" />
                            {bankAccount.name || 'Cuenta de banco'}
                          </div>

                          <div className="ml-6 space-y-1 text-sm text-muted-foreground">
                            <div className="flex justify-between">
                              <span>Saldo actual:</span>
                              <span className="font-mono">{formatCurrency(accountBalances.currentBankBalance)}</span>
                            </div>
                            <div className="flex justify-between text-red-600">
                              <span>- Abonos por transferencia:</span>
                              <span className="font-mono">-{formatCurrency(totalBankAmount)}</span>
                            </div>
                            <div className="flex justify-between pt-1 border-t font-medium text-foreground">
                              <span>Nuevo saldo:</span>
                              <span className="font-mono text-red-600">
                                {formatCurrency(accountBalances.newBankBalance)}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>No, mantener</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={canceling || loadingPayments}
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
