'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useLazyQuery } from '@apollo/client'
import { Trash2, HandCoins, Wallet, Building2, Search, Loader2, User } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import { SEARCH_BORROWERS_QUERY } from '@/graphql/queries/transactions'

import { useCapturaOcr } from './captura-ocr-context'
import type { CapturaExtracobranzaEntry } from './types'

interface Props {
  jobId: string
}

interface BorrowerSearchResult {
  id: string
  personalData?: {
    id: string
    fullName?: string
    clientCode?: string
  }
  locationId?: string
  locationName?: string
  activeLoan?: {
    id: string
    pendingAmountStored?: string
    expectedWeeklyPayment?: string
  } | null
}

/**
 * Global extra collection capture. Fully decoupled from the OCR job's
 * localities — the operator can search ANY client from ANY route via
 * `SEARCH_BORROWERS_QUERY` (300ms debounced AJAX) and register payments.
 *
 * The backend derives the `leadId` from each loan's `lead` field when
 * materializing these into `LeadPaymentReceived`s on `confirmCapturaJob`,
 * using the job's OCR date.
 *
 * Operator flow: type → pick → fill monto + metodo manually (no pre-fill).
 */
export function CapturaExtracobranzaTable({ jobId }: Props) {
  const { getEditedResult, addExtracobranza, updateExtracobranza, removeExtracobranza } = useCapturaOcr()

  const editedResult = getEditedResult(jobId)
  const entries: CapturaExtracobranzaEntry[] = editedResult?.extracobranzas || []

  const [searchTerm, setSearchTerm] = useState('')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const [searchBorrowers, { data: borrowerData, loading }] = useLazyQuery(
    SEARCH_BORROWERS_QUERY,
    { fetchPolicy: 'network-only' }
  )

  // Prevent adding the same active loan twice.
  const usedLoanIds = useMemo(
    () => new Set(entries.map((e) => e.loanId).filter((id): id is string => !!id)),
    [entries]
  )

  // Debounced AJAX search (300ms). Fires only when term length >= 2.
  useEffect(() => {
    if (searchTerm.trim().length < 2) return
    const timer = setTimeout(() => {
      searchBorrowers({ variables: { searchTerm: searchTerm.trim(), limit: 20 } })
    }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm, searchBorrowers])

  // Close dropdown when clicking outside.
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Filter search results to: (1) active loan exists, (2) loan not already captured.
  const filteredResults: BorrowerSearchResult[] = useMemo(() => {
    const raw: BorrowerSearchResult[] = borrowerData?.searchBorrowers || []
    return raw.filter((b) => {
      if (!b.activeLoan?.id) return false
      if (usedLoanIds.has(b.activeLoan.id)) return false
      return true
    })
  }, [borrowerData, usedLoanIds])

  const handleSelectClient = (b: BorrowerSearchResult) => {
    if (!b.activeLoan?.id || !b.locationName) return

    addExtracobranza(jobId, {
      matchedClientPos: 0,
      matchedLocalidad: b.locationName,
      clientCode: b.personalData?.clientCode,
      borrowerName: b.personalData?.fullName || '',
      loanId: b.activeLoan.id,
      montoEfectivo: 0,
      montoTransferencia: 0,
    })

    // Reset input for next capture.
    setSearchTerm('')
    setIsDropdownOpen(false)
  }

  // Totals for footer strip
  const totals = useMemo(() => {
    let cash = 0
    let bank = 0
    for (const e of entries) {
      cash += e.montoEfectivo || 0
      bank += e.montoTransferencia || 0
    }
    return { cash, bank, total: cash + bank }
  }, [entries])

  const showDropdown = isDropdownOpen && searchTerm.trim().length >= 2
  const showNoResults = showDropdown && !loading && filteredResults.length === 0

  return (
    <Card>
      <CardHeader className="py-3 pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <HandCoins className="h-4 w-4 text-muted-foreground" />
              Extracobranza ({entries.length})
            </CardTitle>
            <CardDescription className="text-xs">
              Captura abonos de clientes de cualquier ruta sin pasar por la tabla de pagos.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 pt-0">
        {/* Inline AJAX autocomplete */}
        <div ref={containerRef} className="relative">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setIsDropdownOpen(true)
              }}
              onFocus={() => setIsDropdownOpen(true)}
              placeholder="Buscar cliente por nombre..."
              className="h-8 text-xs pl-7"
            />
            {loading && (
              <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />
            )}
          </div>

          {showDropdown && (
            <div className="absolute z-50 mt-1 w-full max-h-72 overflow-y-auto rounded-md border bg-popover shadow-md">
              {loading && (
                <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Buscando...
                </div>
              )}
              {showNoResults && (
                <div className="px-3 py-2 text-xs text-muted-foreground">
                  Sin resultados con préstamo activo.
                </div>
              )}
              {!loading &&
                filteredResults.map((b) => {
                  const pending = parseFloat(b.activeLoan?.pendingAmountStored || '0') || 0
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => handleSelectClient(b)}
                      className="flex w-full items-start gap-2 px-3 py-2 text-left text-xs hover:bg-accent border-b last:border-b-0"
                    >
                      <User className="h-3.5 w-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="font-medium truncate">
                          {b.personalData?.fullName || 'Sin nombre'}
                          {b.personalData?.clientCode && (
                            <span className="ml-1 text-muted-foreground">
                              - {b.personalData.clientCode}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-muted-foreground truncate">
                          {b.locationName}
                          {pending > 0 && (
                            <span className="ml-2">
                              Pend: <span className="tabular-nums">{formatCurrency(pending)}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  )
                })}
            </div>
          )}
        </div>

        {/* Entries list */}
        {entries.length > 0 && (
          <div className="space-y-1.5">
            {/* Column headers */}
            <div className="flex items-center gap-2 px-2 text-[10px] text-muted-foreground">
              <div className="flex-1" />
              <div className="w-[100px] flex items-center justify-end gap-1">
                <Wallet className="h-3 w-3 text-green-600" />
                <span>Efectivo</span>
              </div>
              <div className="w-[100px] flex items-center justify-end gap-1">
                <Building2 className="h-3 w-3 text-blue-600" />
                <span>Transferencia</span>
              </div>
              <div className="w-7" />
            </div>
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center gap-2 rounded-lg border bg-muted/20 px-2 py-1.5"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium truncate">{entry.borrowerName}</div>
                  <div className="text-[10px] text-muted-foreground truncate">
                    {entry.matchedLocalidad}
                    {entry.clientCode && ` - ${entry.clientCode}`}
                  </div>
                </div>
                <Input
                  type="number"
                  value={entry.montoEfectivo || ''}
                  onChange={(e) =>
                    updateExtracobranza(jobId, entry.id, {
                      montoEfectivo: parseFloat(e.target.value) || 0,
                    })
                  }
                  onWheel={(e) => e.currentTarget.blur()}
                  placeholder="0"
                  className="h-7 w-[100px] text-xs text-right"
                />
                <Input
                  type="number"
                  value={entry.montoTransferencia || ''}
                  onChange={(e) =>
                    updateExtracobranza(jobId, entry.id, {
                      montoTransferencia: parseFloat(e.target.value) || 0,
                    })
                  }
                  onWheel={(e) => e.currentTarget.blur()}
                  placeholder="0"
                  className="h-7 w-[100px] text-xs text-right"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={() => removeExtracobranza(jobId, entry.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Totals strip */}
        {entries.length > 0 && (
          <div className="flex items-center gap-4 flex-wrap rounded-lg bg-muted/30 border px-3 py-2">
            <div className="flex items-center gap-1.5">
              <Wallet className="h-4 w-4 text-green-600" />
              <span className="text-xs text-muted-foreground">Efectivo:</span>
              <span className="text-sm font-semibold text-green-700 dark:text-green-400 tabular-nums">
                {formatCurrency(totals.cash)}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Building2 className="h-4 w-4 text-blue-600" />
              <span className="text-xs text-muted-foreground">Banco:</span>
              <span className="text-sm font-semibold text-blue-700 dark:text-blue-400 tabular-nums">
                {formatCurrency(totals.bank)}
              </span>
            </div>
            <div className="h-5 w-px bg-border" />
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Total:</span>
              <span className="text-sm font-bold tabular-nums">
                {formatCurrency(totals.total)}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
