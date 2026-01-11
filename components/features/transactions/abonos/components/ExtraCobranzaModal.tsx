'use client'

import { useState, useMemo, useEffect } from 'react'
import { useQuery } from '@apollo/client'
import { PlusCircle, Search, User, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { cn, formatCurrency } from '@/lib/utils'
import { ALL_ACTIVE_LOANS_BY_LEAD_QUERY } from '@/graphql/queries/transactions'
import type { ActiveLoan } from '../types'

interface ExtraCobranzaModalProps {
  leadId: string | null
  existingLoanIds: Set<string>
  onSelectLoan: (loan: ActiveLoan) => void
  disabled?: boolean
}

export function ExtraCobranzaModal({
  leadId,
  existingLoanIds,
  onSelectLoan,
  disabled,
}: ExtraCobranzaModalProps) {
  const [open, setOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  // Reset search when modal closes
  useEffect(() => {
    if (!open) {
      setSearchTerm('')
    }
  }, [open])

  // Query all active loans (including portfolio cleanup)
  // Pre-fetch when leadId is available (don't wait for modal to open)
  const { data, loading, error } = useQuery(ALL_ACTIVE_LOANS_BY_LEAD_QUERY, {
    variables: { leadId },
    skip: !leadId,
    fetchPolicy: 'cache-and-network',
  })

  // Debug logging
  useEffect(() => {
    if (open) {
      console.log('[ExtraCobranzaModal] Modal opened', {
        leadId,
        loading,
        error: error?.message,
        dataExists: !!data,
        loansCount: data?.loans?.edges?.length || 0,
        existingLoanIdsCount: existingLoanIds.size,
      })
    }
  }, [open, leadId, loading, error, data, existingLoanIds])

  const allLoans: ActiveLoan[] = useMemo(() => {
    const loans = data?.loans?.edges?.map((edge: { node: ActiveLoan }) => edge.node) || []
    console.log('[ExtraCobranzaModal] allLoans:', loans.length)
    return loans
  }, [data])

  // Filter out loans already in the list and apply search filter
  const filteredLoans = useMemo(() => {
    // Show ALL loans from the query (don't filter by existingLoanIds)
    // The purpose is to allow double payments or payments for any client
    let available = allLoans

    if (!searchTerm.trim()) {
      return available
    }

    const term = searchTerm.toLowerCase().trim()
    return available.filter((loan) => {
      const borrowerName = loan.borrower?.personalData?.fullName?.toLowerCase() || ''
      const collateralNames = loan.collaterals?.map(c => c.fullName?.toLowerCase() || '').join(' ') || ''
      return borrowerName.includes(term) || collateralNames.includes(term)
    })
  }, [allLoans, searchTerm])

  const handleSelect = (loan: ActiveLoan) => {
    onSelectLoan(loan)
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          disabled={disabled}
          className={cn(
            'h-8 px-2 gap-1.5',
            'text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-700',
            'hover:bg-blue-50 dark:hover:bg-blue-950/30'
          )}
        >
          <PlusCircle className="h-3.5 w-3.5" />
          <span className="text-xs sm:text-sm">Extra</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px] p-0 gap-0">
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle className="text-base">Agregar Cobranza Extra</DialogTitle>
        </DialogHeader>

        {/* Search input */}
        <div className="px-4 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 uppercase"
              autoFocus
            />
          </div>
        </div>

        {/* Results list */}
        <ScrollArea className="max-h-[300px] border-t">
          {loading && allLoans.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Cargando clientes...
            </div>
          ) : error ? (
            <div className="py-6 px-4 text-center">
              <p className="text-sm font-medium text-destructive">Error al cargar clientes</p>
              <p className="text-xs text-muted-foreground mt-1">
                {error.message.includes('Failed to fetch') || error.message.includes('NetworkError')
                  ? 'No se pudo conectar al servidor. Verifica tu conexión.'
                  : error.message}
              </p>
            </div>
          ) : filteredLoans.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              {allLoans.length === 0
                ? 'No hay clientes activos en esta localidad'
                : 'No se encontraron coincidencias'}
            </div>
          ) : (
            <div className="py-1">
              {filteredLoans.map((loan) => {
                // Check if loan is marked as bad debt
                const isBadDebt = !!(loan as any).badDebtDate

                return (
                  <button
                    key={loan.id}
                    onClick={() => handleSelect(loan)}
                    className={cn(
                      'w-full px-4 py-2.5 text-left',
                      'hover:bg-accent transition-colors',
                      'focus:bg-accent focus:outline-none',
                      'border-b last:border-b-0 border-border/50',
                      isBadDebt && 'bg-orange-50 dark:bg-orange-950/20'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        'mt-0.5 p-1.5 rounded-full',
                        isBadDebt ? 'bg-orange-100 dark:bg-orange-900/50' : 'bg-muted'
                      )}>
                        {isBadDebt ? (
                          <AlertTriangle className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />
                        ) : (
                          <User className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm truncate">
                            {loan.borrower?.personalData?.fullName || 'Sin nombre'}
                          </p>
                          {isBadDebt && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/50 dark:text-orange-400 dark:border-orange-700">
                              Deuda Mala
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          <span>Semanal: {formatCurrency(parseFloat(loan.expectedWeeklyPayment || '0'))}</span>
                          <span className="text-muted-foreground/50">•</span>
                          <span>Pendiente: {formatCurrency(parseFloat(loan.pendingAmountStored || '0'))}</span>
                        </div>
                        {loan.collaterals && loan.collaterals.length > 0 && (
                          <p className="text-xs text-muted-foreground/70 mt-0.5 truncate">
                            Aval: {loan.collaterals[0].fullName}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
