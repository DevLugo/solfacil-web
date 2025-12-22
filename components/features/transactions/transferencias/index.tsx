'use client'

import { MapPin } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { useTransactionContext } from '../transaction-context'
import {
  AccountBalanceCard,
  TransferForm,
  TransferHistoryTable,
  SuccessDialog,
  BatchOperationsBar,
} from './components'
import { useTransferQueries, useTransferForm } from './hooks'

// ============================================================================
// EMPTY STATE
// ============================================================================

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
      <h3 className="text-lg font-semibold mb-2">Selecciona una ruta</h3>
      <p className="text-muted-foreground max-w-sm">
        Selecciona una ruta y fecha para ver y registrar transferencias
      </p>
    </div>
  )
}

// ============================================================================
// LOADING STATE
// ============================================================================

function LoadingState() {
  return (
    <div className="space-y-6">
      {/* Account Balances Skeleton */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-6 w-20" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Transfer Form Skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-64 mt-1" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-32" />
        </CardContent>
      </Card>

      {/* Transfer History Skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32 mt-1" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4 py-3 border-b">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20 ml-auto" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function TransferenciasTab() {
  const { selectedRouteId, selectedDate, selectedLeadId } = useTransactionContext()

  // Queries
  const { transfers, accounts, transfersLoading, accountsLoading, refetchAll } = useTransferQueries({
    selectedRouteId,
    selectedDate,
  })

  // Form
  const {
    formData,
    setIsCapitalInvestment,
    setSourceAccountId,
    setDestinationAccountId,
    setAmount,
    setDescription,
    isSubmitting,
    showSuccessDialog,
    setShowSuccessDialog,
    isAmountValid,
    isFormValid,
    availableBalance,
    destinationOptions,
    sourceAccount,
    handleSubmit,
  } = useTransferForm({
    selectedRouteId,
    selectedLeadId,
    selectedDate,
    accounts,
    onSuccess: refetchAll,
  })

  return (
    <div className="space-y-6">
      {/* Batch Operations - Always visible */}
      <BatchOperationsBar onSuccess={refetchAll} />

      {/* Route-specific content */}
      {!selectedRouteId ? (
        <EmptyState />
      ) : accountsLoading || transfersLoading ? (
        <LoadingState />
      ) : (
        <>
          {/* Account Balances */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {accounts.map((account) => (
              <AccountBalanceCard key={account.id} account={account} />
            ))}
          </div>

          {/* Transfer Form */}
          <TransferForm
            isCapitalInvestment={formData.isCapitalInvestment}
            sourceAccountId={formData.sourceAccountId}
            destinationAccountId={formData.destinationAccountId}
            amount={formData.amount}
            description={formData.description}
            onIsCapitalInvestmentChange={setIsCapitalInvestment}
            onSourceAccountIdChange={setSourceAccountId}
            onDestinationAccountIdChange={setDestinationAccountId}
            onAmountChange={setAmount}
            onDescriptionChange={setDescription}
            isSubmitting={isSubmitting}
            isAmountValid={isAmountValid}
            isFormValid={isFormValid}
            availableBalance={availableBalance}
            accounts={accounts}
            destinationOptions={destinationOptions}
            sourceAccount={sourceAccount}
            onSubmit={handleSubmit}
          />

          {/* Transfers List */}
          <TransferHistoryTable
            transfers={transfers}
            loading={transfersLoading}
            selectedDate={selectedDate}
          />

          {/* Success Dialog */}
          <SuccessDialog
            open={showSuccessDialog}
            onOpenChange={setShowSuccessDialog}
            isCapitalInvestment={formData.isCapitalInvestment}
          />
        </>
      )}
    </div>
  )
}
