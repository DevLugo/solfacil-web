'use client'

import { useState, useCallback } from 'react'
import { History } from 'lucide-react'
import {
  SearchBar,
  ClientProfile,
  LoansList,
  LoanDocumentPhotos,
  ClientProfileSkeleton,
  LoansListSkeleton,
} from './components'
import { useClientHistory } from './hooks'
import type { ClientSearchResult } from './types'

export function HistorialClientes() {
  const [selectedClient, setSelectedClient] = useState<ClientSearchResult | null>(null)
  const [pdfLoading, setPdfLoading] = useState(false)
  const { data: historyData, loading, fetchClientHistory, reset } = useClientHistory()

  const handleSelectClient = useCallback((client: ClientSearchResult) => {
    setSelectedClient(client)
    // Auto-fetch history when client is selected
    fetchClientHistory(client.id)
  }, [fetchClientHistory])

  const handleClear = useCallback(() => {
    setSelectedClient(null)
    reset()
  }, [reset])

  const handleGeneratePDF = useCallback(
    async (detailed: boolean) => {
      if (!selectedClient || pdfLoading) return

      setPdfLoading(true)
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
        const response = await fetch(`${apiUrl}/api/export-client-history-pdf`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            clientId: selectedClient.id,
            detailed,
          }),
        })

        if (!response.ok) {
          throw new Error('Failed to generate PDF')
        }

        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `historial-${selectedClient.clientCode}-${detailed ? 'detallado' : 'resumen'}.pdf`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
      } catch (error) {
        console.error('PDF generation error:', error)
        alert('Error: No se pudo conectar al servidor. Verifica que el API esté corriendo.')
      } finally {
        setPdfLoading(false)
      }
    },
    [selectedClient, pdfLoading]
  )

  return (
    <div className="p-3 md:p-4 max-w-5xl mx-auto">
      {/* Page Header - Compact */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold">Historial de Clientes</h1>
        </div>
      </div>

      {/* Search Bar */}
      <SearchBar
        selectedClient={selectedClient}
        onSelectClient={handleSelectClient}
        onClear={handleClear}
        onGeneratePDF={historyData ? handleGeneratePDF : undefined}
        hasSelectedClient={!!historyData}
        isLoading={loading}
        pdfLoading={pdfLoading}
      />

      {/* Loading State */}
      {loading && (
        <>
          <ClientProfileSkeleton />
          <LoansListSkeleton count={2} />
          <LoansListSkeleton count={1} />
        </>
      )}

      {/* Client History Data */}
      {!loading && historyData && (
        <>
          {/* Client Profile */}
          <ClientProfile
            client={historyData.client}
            summary={historyData.summary}
          />

          {/* Document Photos - Show for most recent loan */}
          {historyData.loansAsClient.length > 0 && (() => {
            const sortedLoans = [...historyData.loansAsClient].sort(
              (a, b) => new Date(b.signDate).getTime() - new Date(a.signDate).getTime()
            )
            const mostRecentLoan = sortedLoans[0]
            return (
              <LoanDocumentPhotos
                loanId={mostRecentLoan.id}
                loanDate={mostRecentLoan.signDateFormatted}
              />
            )
          })()}

          {/* Loans as Client */}
          {historyData.summary.totalLoansAsClient > 0 && (
            <LoansList
              loans={historyData.loansAsClient}
              title="Préstamos como Cliente"
              isCollateral={false}
            />
          )}

          {/* Loans as Collateral */}
          {historyData.summary.totalLoansAsCollateral > 0 && (
            <LoansList
              loans={historyData.loansAsCollateral}
              title="Préstamos como Aval"
              isCollateral={true}
            />
          )}

          {/* Empty state when no loans */}
          {historyData.summary.totalLoansAsClient === 0 &&
            historyData.summary.totalLoansAsCollateral === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <History className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Sin historial de préstamos</p>
              </div>
            )}
        </>
      )}

      {/* Empty state when no client selected */}
      {!loading && !historyData && !selectedClient && (
        <div className="text-center py-8 text-muted-foreground">
          <History className="h-10 w-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Selecciona un cliente para ver su historial</p>
        </div>
      )}
    </div>
  )
}

// Re-export types
export type { ClientSearchResult, ClientHistoryData } from './types'
