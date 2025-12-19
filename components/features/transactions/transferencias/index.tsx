'use client'

import { MapPin, Loader2 } from 'lucide-react'
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
    <div className="flex items-center justify-center py-12">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
      ) : accountsLoading ? (
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
