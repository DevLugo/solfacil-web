'use client'

import { useState, useMemo } from 'react'
import { useMutation } from '@apollo/client'
import { MapPin } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { useTransactionContext } from '../transaction-context'
import { CANCEL_LOAN_WITH_ACCOUNT_RESTORE } from '@/graphql/mutations/transactions'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/use-auth'
import { useCreditosQueries } from './hooks'
import {
  CreateLoansModal,
  EditLoanModal,
  SummaryCards,
  AccountBalanceCard,
  LoansTable,
  CancelLoanDialog,
} from './components'
import type { Loan } from './types'

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
      <h3 className="text-lg font-semibold mb-2">Selecciona una ruta y localidad</h3>
      <p className="text-muted-foreground max-w-sm">
        Selecciona una ruta y líder/localidad para ver y registrar los créditos del día
      </p>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="space-y-6">
      {/* Loading Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                  <div className="h-6 w-16 bg-muted rounded animate-pulse" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Loading Table */}
      <Card>
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-6 w-48 bg-muted rounded animate-pulse" />
              <div className="h-4 w-32 bg-muted rounded animate-pulse" />
            </div>
            <div className="h-10 w-32 bg-muted rounded animate-pulse" />
          </div>
        </div>
        <div className="px-6 pb-6">
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
                <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 bg-muted rounded animate-pulse" />
                  <div className="h-3 w-24 bg-muted rounded animate-pulse" />
                </div>
                <div className="h-4 w-20 bg-muted rounded animate-pulse" />
                <div className="h-4 w-20 bg-muted rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  )
}

export function CreditosTab() {
  const { selectedRouteId, selectedDate, selectedLeadId, selectedLocationId } =
    useTransactionContext()
  const { toast } = useToast()
  const { user } = useAuth()
  const isAdmin = user?.role === 'ADMIN'

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null)
  const [loanToCancel, setLoanToCancel] = useState<Loan | null>(null)

  // Queries
  const {
    loansToday,
    loansLoading,
    refetchLoans,
    loanTypes,
    loansForRenewal,
    accounts,
    defaultAccount,
    refetchAccounts,
  } = useCreditosQueries({
    selectedDate,
    selectedLeadId,
    selectedRouteId,
  })

  // Mutation for canceling loans
  const [cancelLoanWithAccountRestore, { loading: canceling }] = useMutation(
    CANCEL_LOAN_WITH_ACCOUNT_RESTORE
  )

  // Calculate totals
  const totals = useMemo(() => {
    const totalLoaned = loansToday.reduce(
      (sum, l) => sum + parseFloat(l.amountGived || '0'),
      0
    )
    const totalProfit = loansToday.reduce(
      (sum, l) => sum + parseFloat(l.profitAmount || '0'),
      0
    )
    const totalCommission = loansToday.reduce(
      (sum, l) => sum + parseFloat(l.comissionAmount || '0'),
      0
    )
    const renewals = loansToday.filter((l) => l.previousLoan !== null).length
    const newLoans = loansToday.length - renewals

    return {
      count: loansToday.length,
      loaned: totalLoaned,
      profit: totalProfit,
      commission: totalCommission,
      renewals,
      newLoans,
    }
  }, [loansToday])

  // Handle edit loan
  const handleEditLoan = (loan: Loan) => {
    setSelectedLoan(loan)
    setIsEditModalOpen(true)
  }

  // Handle cancel loan
  const handleCancelLoan = async () => {
    if (!loanToCancel || !defaultAccount) return

    try {
      await cancelLoanWithAccountRestore({
        variables: {
          id: loanToCancel.id,
          accountId: defaultAccount.id,
        },
      })

      toast({
        title: 'Crédito cancelado',
        description: `El crédito de ${loanToCancel.borrower.personalData.fullName} ha sido cancelado y el saldo restaurado.`,
      })

      setLoanToCancel(null)
      refetchLoans()
      refetchAccounts()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'No se pudo cancelar el crédito'
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      })
    }
  }

  // Handle success from create modal
  const handleCreateSuccess = () => {
    refetchLoans()
    refetchAccounts()
  }

  // Handle success from edit modal
  const handleEditSuccess = () => {
    refetchLoans()
    refetchAccounts()
  }

  if (!selectedRouteId || !selectedLeadId) {
    return <EmptyState />
  }

  if (loansLoading) {
    return <LoadingState />
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <SummaryCards totals={totals} />

      {/* Account Balance Info */}
      {defaultAccount && <AccountBalanceCard account={defaultAccount} />}

      {/* Loans Table */}
      <LoansTable
        loans={loansToday}
        selectedDate={selectedDate}
        isAdmin={isAdmin}
        onEdit={handleEditLoan}
        onCancel={setLoanToCancel}
        onCreateNew={() => setIsCreateModalOpen(true)}
      />

      {/* Create Loans Modal */}
      <CreateLoansModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        loanTypes={loanTypes}
        loansForRenewal={loansForRenewal}
        accounts={accounts}
        selectedDate={selectedDate}
        leadId={selectedLeadId || ''}
        grantorId={selectedLeadId || ''}
        locationId={selectedLocationId || undefined}
        onSuccess={handleCreateSuccess}
      />

      {/* Edit Loan Modal */}
      <EditLoanModal
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        loan={selectedLoan}
        loanTypes={loanTypes}
        locationId={selectedLocationId}
        onSuccess={handleEditSuccess}
      />

      {/* Cancel Confirmation Dialog */}
      <CancelLoanDialog
        loan={loanToCancel}
        account={defaultAccount}
        canceling={canceling}
        onConfirm={handleCancelLoan}
        onCancel={() => setLoanToCancel(null)}
      />
    </div>
  )
}
