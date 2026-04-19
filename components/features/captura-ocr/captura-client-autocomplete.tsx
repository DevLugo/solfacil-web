'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { useLazyQuery } from '@apollo/client'
import { Check, ChevronsUpDown, Search, X, Globe, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from '@/components/ui/command'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn, formatCurrency } from '@/lib/utils'
import { normalizeName } from '@/lib/fuzzy-match'
import { CAPTURA_SEARCH_BORROWERS_QUERY } from '@/graphql/queries/captura'
import type { CapturaClient } from './types'

/**
 * Forma del resultado de CAPTURA_SEARCH_BORROWERS_QUERY (un borrower con
 * personalData y opcionalmente activeLoan — que aquí puede venir ACTIVE o FINISHED).
 */
export interface GlobalBorrowerSearchResult {
  id: string
  loanFinishedCount?: number
  hasActiveLoans?: boolean
  pendingDebtAmount?: string | null
  locationId?: string | null
  locationName?: string | null
  isFromCurrentLocation?: boolean
  personalData: {
    id: string
    fullName: string
    clientCode: string
    phones?: Array<{ id: string; number: string }>
  }
  activeLoan?: {
    id: string
    requestedAmount: string
    amountGived: string
    pendingAmountStored: string
    profitAmount: string
    totalDebtAcquired: string
    expectedWeeklyPayment: string
    totalPaid: string
    signDate: string
    status?: string | null
    loantype?: {
      id: string
      name: string
      weekDuration: number
      rate: string
      loanPaymentComission: string
      loanGrantedComission: string
    } | null
    collaterals?: Array<{
      id: string
      fullName: string
      phones?: Array<{ number: string }>
    }>
    leadLocationName?: string
  } | null
}

interface Props {
  clientsList: CapturaClient[]
  selectedClient: CapturaClient | null
  onSelect: (client: CapturaClient | null) => void
  initialSearch?: string
  className?: string
  iconOnly?: boolean
  /** Habilita búsqueda global en DB cuando el término es >= 3 chars */
  enableGlobalSearch?: boolean
  /** Lead actual, se pasa a searchBorrowers para filtrar por líder */
  leadId?: string
  /** Localidad actual, se pasa a searchBorrowers para reordenar por localidad */
  locationId?: string
  /** Callback al seleccionar un resultado global (borrower con FINISHED o ACTIVE loan) */
  onGlobalSelect?: (borrower: GlobalBorrowerSearchResult) => void
  /**
   * Cuando se seleccionó un borrower vía búsqueda GLOBAL (no está en clientsList),
   * el consumidor pasa este objeto para que el trigger button muestre el nombre
   * y clientCode en lugar del placeholder "Buscar cliente...".
   */
  globalSelection?: { fullName: string; clientCode?: string } | null
  /**
   * Callback para limpiar una selección global (X en el trigger button).
   * Se llama en lugar de `onSelect(null)` para que el parent pueda limpiar
   * los campos específicos del global (borrowerId, previousLoanId, etc.).
   */
  onClearGlobal?: () => void
}

export function CapturaClientAutocomplete({
  clientsList,
  selectedClient,
  onSelect,
  initialSearch,
  className,
  iconOnly,
  enableGlobalSearch = false,
  leadId,
  locationId,
  onGlobalSelect,
  globalSelection,
  onClearGlobal,
}: Props) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const hasGlobalSelection = !selectedClient && !!globalSelection
  const displayLabel = selectedClient
    ? `${(selectedClient.borrowerName || '').toUpperCase()} (${selectedClient.clientCode})`
    : hasGlobalSelection
      ? `${globalSelection!.fullName.toUpperCase()}${globalSelection!.clientCode ? ` (${globalSelection!.clientCode})` : ''}`
      : (initialSearch || '').toUpperCase()

  const labelRef = useRef<HTMLSpanElement>(null)
  const [truncated, setTruncated] = useState(false)
  useEffect(() => {
    const el = labelRef.current
    if (!el) return
    const check = () => setTruncated(el.scrollWidth > el.clientWidth + 1)
    check()
    const observer = new ResizeObserver(check)
    observer.observe(el)
    return () => observer.disconnect()
  }, [displayLabel])
  const showTooltip = !iconOnly && truncated && displayLabel.length > 0

  const filterFn = useMemo(() => {
    return (value: string, searchTerm: string) => {
      const norm = normalizeName(searchTerm)
      if (!norm) return 1
      const candidateNorm = normalizeName(value)
      if (candidateNorm.includes(norm)) return 1
      const reversed = norm.split(' ').reverse().join(' ')
      if (candidateNorm.includes(reversed)) return 1
      return 0
    }
  }, [])

  // Búsqueda global con debounce
  const [runGlobalSearch, globalSearchResult] = useLazyQuery<{ searchBorrowers: GlobalBorrowerSearchResult[] }>(
    CAPTURA_SEARCH_BORROWERS_QUERY,
    { fetchPolicy: 'network-only' }
  )

  useEffect(() => {
    if (!enableGlobalSearch) return
    const trimmed = search.trim()
    if (trimmed.length < 3) return
    const handle = setTimeout(() => {
      runGlobalSearch({
        variables: {
          searchTerm: trimmed,
          leadId,
          locationId,
          limit: 10,
        },
      })
    }, 300)
    return () => clearTimeout(handle)
  }, [search, enableGlobalSearch, leadId, locationId, runGlobalSearch])

  const globalResults = globalSearchResult.data?.searchBorrowers ?? []

  // Filtrar resultados globales para NO mostrar clientes que ya están en clientsList
  // (evita duplicados visuales; esos ya los puede seleccionar desde arriba).
  const localBorrowerIds = useMemo(
    () => new Set(clientsList.map((c) => c.borrowerId).filter(Boolean) as string[]),
    [clientsList]
  )
  const localPersonalDataNames = useMemo(
    () => new Set(clientsList.map((c) => normalizeName(c.borrowerName || '')).filter(Boolean)),
    [clientsList]
  )
  /**
   * Deduplicación crítica:
   *  1) Excluye borrowers ya presentes en clientsList (por id).
   *  2) Dedupe por `personalData.id` — una misma PersonalData no debe aparecer dos
   *     veces aunque esté ligada a múltiples Borrower records (legacy de renovaciones
   *     antiguas que creaban nuevas PersonalData en lugar de reusar).
   *  3) Dedupe secundario por (normalizeName + clientCode) — maneja duplicados
   *     históricos donde se crearon PersonalData distintas para la misma persona
   *     real. Se prioriza la fila con préstamo ACTIVE > mayor loanFinishedCount
   *     > isFromCurrentLocation, para que al renovar siempre apuntemos al último
   *     crédito real del cliente.
   *  4) Excluye PersonalData cuyo normalized(fullName) ya aparece en la lista local
   *     (evita mostrar lo mismo que ya está en "En esta localidad").
   */
  const filteredGlobalResults = useMemo(() => {
    const notInLocal = globalResults.filter((b) => !localBorrowerIds.has(b.id))

    const score = (x: GlobalBorrowerSearchResult) =>
      (x.activeLoan?.status === 'ACTIVE' ? 1_000_000 : 0) +
      (x.loanFinishedCount || 0) * 100 +
      (x.isFromCurrentLocation ? 50 : 0) +
      (x.activeLoan ? 10 : 0)

    // Step 1: dedup por personalData.id
    const byPd = new Map<string, GlobalBorrowerSearchResult>()
    for (const b of notInLocal) {
      const key = b.personalData.id
      const existing = byPd.get(key)
      if (!existing || score(b) > score(existing)) byPd.set(key, b)
    }

    // Step 2: dedup secundario por nombre normalizado + clientCode
    const byNameCode = new Map<string, GlobalBorrowerSearchResult>()
    for (const b of byPd.values()) {
      const key = `${normalizeName(b.personalData.fullName)}|${b.personalData.clientCode || ''}`
      const existing = byNameCode.get(key)
      if (!existing || score(b) > score(existing)) byNameCode.set(key, b)
    }

    // Step 3: excluir nombres que ya están en el grupo local
    return Array.from(byNameCode.values()).filter(
      (b) => !localPersonalDataNames.has(normalizeName(b.personalData.fullName))
    )
  }, [globalResults, localBorrowerIds, localPersonalDataNames])

  return (
    <Popover open={open} onOpenChange={setOpen} modal>
      {iconOnly ? (
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            type="button"
            aria-label="Buscar cliente existente"
            className={cn('h-8 w-8 shrink-0', className)}
          >
            <Search className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
      ) : (
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className={cn(
                  'h-8 justify-between text-xs font-normal',
                  hasGlobalSelection && 'border-purple-300 bg-purple-50/40 text-purple-900 dark:border-purple-700 dark:bg-purple-950/30 dark:text-purple-100',
                  className,
                )}
              >
                <span ref={labelRef} className="truncate min-w-0 flex items-center gap-1">
                  {hasGlobalSelection && <Globe className="h-3 w-3 text-purple-600 dark:text-purple-400 shrink-0" />}
                  {selectedClient || hasGlobalSelection ? displayLabel : (initialSearch || 'Buscar cliente...')}
                </span>
                <div className="flex items-center gap-0.5 ml-1 shrink-0">
                  {selectedClient && (
                    <span
                      role="button"
                      className="h-4 w-4 flex items-center justify-center rounded-sm hover:bg-muted"
                      onClick={(e) => {
                        e.stopPropagation()
                        onSelect(null)
                      }}
                    >
                      <X className="h-3 w-3" />
                    </span>
                  )}
                  {hasGlobalSelection && onClearGlobal && (
                    <span
                      role="button"
                      className="h-4 w-4 flex items-center justify-center rounded-sm hover:bg-muted"
                      onClick={(e) => {
                        e.stopPropagation()
                        onClearGlobal()
                      }}
                    >
                      <X className="h-3 w-3" />
                    </span>
                  )}
                  <ChevronsUpDown className="h-3 w-3 opacity-50" />
                </div>
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
            {showTooltip && (
              <TooltipContent side="top" className="text-xs max-w-[320px] break-words">
                {displayLabel}
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      )}
      <PopoverContent className="w-[380px] p-0 z-[60]" align="start">
        <Command filter={filterFn}>
          <CommandInput
            placeholder="Buscar por nombre o codigo..."
            className="h-8 text-xs"
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty className="py-2 text-xs text-center text-muted-foreground">
              {enableGlobalSearch && search.trim().length < 3
                ? 'Escribe al menos 3 letras para buscar en toda la DB'
                : 'No se encontro cliente'}
            </CommandEmpty>
            <CommandGroup heading={<span className="text-[10px] uppercase tracking-wider">En esta localidad (activos)</span>}>
              {clientsList.map((client) => (
                <CommandItem
                  key={client.pos}
                  value={`${client.borrowerName || ''} ${client.clientCode}`}
                  onSelect={() => {
                    onSelect(client)
                    setOpen(false)
                  }}
                  className="text-xs"
                >
                  <Check
                    className={cn(
                      'mr-1.5 h-3 w-3 shrink-0',
                      selectedClient?.pos === client.pos ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium">{(client.borrowerName || '').toUpperCase() || '---'}</span>
                      <span className="font-mono text-muted-foreground shrink-0">{client.clientCode}</span>
                    </div>
                    {client.pendingBalance != null && client.pendingBalance > 0 && (
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="outline" className="h-4 px-1 text-[10px] text-red-600 border-red-200">
                          Deuda: {formatCurrency(client.pendingBalance)}
                        </Badge>
                        {client.loantypeName && (
                          <span className="text-[10px] text-muted-foreground">{client.loantypeName}</span>
                        )}
                      </div>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
            {enableGlobalSearch && onGlobalSelect && (
              <CommandGroup heading={
                <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider">
                  <Globe className="h-3 w-3" />
                  En toda la DB (FINISHED o ACTIVE)
                  {globalSearchResult.loading && <Loader2 className="h-3 w-3 animate-spin ml-1" />}
                </span>
              }>
                {filteredGlobalResults.map((borrower) => {
                  const isFinished = borrower.activeLoan?.status === 'FINISHED'
                  const phone = borrower.personalData.phones?.[0]?.number
                  return (
                    <CommandItem
                      key={`global-${borrower.id}`}
                      // Prefijo "global" para no colisionar con pos numéricos del local group
                      value={`${borrower.personalData.fullName} ${borrower.personalData.clientCode}`}
                      onSelect={() => {
                        onGlobalSelect(borrower)
                        setOpen(false)
                      }}
                      className="text-xs"
                    >
                      <Check className="mr-1.5 h-3 w-3 shrink-0 opacity-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="truncate font-medium">{borrower.personalData.fullName.toUpperCase()}</span>
                          <span className="font-mono text-muted-foreground shrink-0">
                            {borrower.personalData.clientCode}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          {borrower.activeLoan?.status && (
                            <Badge
                              variant="outline"
                              className={cn(
                                'h-4 px-1 text-[10px]',
                                isFinished
                                  ? 'text-green-700 border-green-300 bg-green-50'
                                  : 'text-blue-700 border-blue-300 bg-blue-50'
                              )}
                            >
                              {borrower.activeLoan.status}
                            </Badge>
                          )}
                          {borrower.locationName && (
                            <span className="text-[10px] text-muted-foreground truncate">
                              {borrower.locationName}
                            </span>
                          )}
                          {phone && (
                            <span className="text-[10px] text-muted-foreground shrink-0">{phone}</span>
                          )}
                        </div>
                      </div>
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
