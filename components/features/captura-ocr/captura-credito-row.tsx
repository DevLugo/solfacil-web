'use client'

import { useCallback, useMemo, useEffect, useRef, useState } from 'react'
import { Trash2, Minus, Plus, Shield, UserPlus, RotateCw, AlertTriangle } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn, formatCurrency } from '@/lib/utils'

import { useCapturaOcr } from './captura-ocr-context'
import { CapturaClientAutocomplete } from './captura-client-autocomplete'
import { CapturaAvalAutocomplete, type AvalOption } from './captura-aval-autocomplete'
import { CapturaRenewalSummary } from './captura-renewal-summary'
import { fuzzyMatchName, normalizeName } from '@/lib/fuzzy-match'
import type { CapturaCredit, CapturaClient, CapturaLoanType, CapturaException } from './types'

/** Given a client pos, returns how much that client is paying in this same captura session */
function getPaymentForClient(
  excepciones: CapturaException[] | undefined,
  clientsList: CapturaClient[] | undefined,
  clientPos: number,
): number {
  const exc = excepciones?.find(e => e.pos === clientPos)
  if (exc) {
    return exc.marca === 'FALTA' ? 0 : (exc.montoPagado || 0)
  }
  // No exception = REGULAR, pays expectedWeeklyPayment
  const client = clientsList?.find(c => c.pos === clientPos)
  return client?.expectedWeeklyPayment || 0
}

/**
 * Single source of truth for how much cash is physically delivered to the client.
 *
 * - Nuevo: entregado = monto (always)
 * - Renovacion con match: entregado = monto - max(0, pendingBalance - sameSessionPayment)
 *   The result is clamped to [0, monto] so we never show negative entregas
 *   nor more than the new loan amount.
 * - Renovacion sin match: fallback = monto (operator will pick client later)
 */
function computeEntregado(params: {
  monto: number
  isRenewal: boolean
  matchedClient: CapturaClient | null
  excepciones: CapturaException[]
  clientsList: CapturaClient[]
}): number {
  const { monto, isRenewal, matchedClient, excepciones, clientsList } = params
  if (!isRenewal || !matchedClient) return monto
  const pendingBalance = matchedClient.pendingBalance || 0
  const sameSessionPayment = getPaymentForClient(excepciones, clientsList, matchedClient.pos)
  const debtAfterSessionPayment = Math.max(0, pendingBalance - sameSessionPayment)
  const entregado = monto - debtAfterSessionPayment
  // Clamp: never negative, never more than requested monto
  return Math.min(monto, Math.max(0, entregado))
}

// Preset amounts for quick selection (same as CreateLoansModal)
const PRESET_AMOUNTS = [3000, 3500, 4000]
const AMOUNT_STEP = 500
const noSpinnerClass = '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'

interface Props {
  jobId: string
  localidad: string
  credit: CapturaCredit
  index: number
  clientsList: CapturaClient[]
  excepciones: CapturaException[]
  loantypes: CapturaLoanType[]
}

export function CapturaCreditoRow({ jobId, localidad, credit: creditProp, index, clientsList, excepciones, loantypes }: Props) {
  const { updateCredit, removeCredit, getEditedResult } = useCapturaOcr()
  const hasInitOcr = useRef(false)

  // Read credit directly from context to ensure latest state
  const editedResult = getEditedResult(jobId)
  const editedLocality = editedResult?.localities?.find(l => l.localidad === localidad)
  const credit = editedLocality?.creditos?.[index] || creditProp

  const isRenewal = credit.tipo === 'R'

  // Find the matched client from clientsList
  const matchedClient = useMemo(() => {
    if (!credit.matchedClientPos) return null
    return clientsList.find(c => c.pos === credit.matchedClientPos) || null
  }, [credit.matchedClientPos, clientsList])

  // Find DB client for diff comparison (works even without formal matchedClient)
  const dbComparisonClient = useMemo(() => {
    if (matchedClient) return matchedClient
    if (!isRenewal || clientsList.length === 0) return null
    if (credit.loanIdAnterior) {
      const byLoan = clientsList.find(c => c.loanId === credit.loanIdAnterior)
      if (byLoan) return byLoan
    }
    if (credit.nombre) {
      const match = fuzzyMatchName(credit.nombre, clientsList, 5)
      if (match && match.confidence !== 'NONE') {
        return clientsList[match.clientIndex]
      }
    }
    return null
  }, [matchedClient, isRenewal, credit.loanIdAnterior, credit.nombre, clientsList])

  // Find the selected loantype
  const selectedLoanType = useMemo(() => {
    if (credit.loantypeId) return loantypes.find(lt => lt.id === credit.loantypeId) || null
    // Auto-derive from semanas (OCR extracted weeks)
    if (credit.semanas) {
      const match = loantypes.find(lt => lt.weekDuration === credit.semanas)
      return match || null
    }
    return null
  }, [credit.loantypeId, credit.semanas, loantypes])

  // Custom amount mode
  const isPresetAmount = PRESET_AMOUNTS.includes(credit.monto)
  const [isCustomMode, setIsCustomMode] = useState(!isPresetAmount && credit.monto > 0)

  // Build available avals: DB entries first (case-insensitive dedup), then OCR-only, then new-clients from same session
  const availableAvals = useMemo(() => {
    const seen = new Map<string, AvalOption>() // normalized name → option

    // 1. Collect all DB avales from clientsList collaterals
    for (const c of clientsList) {
      if (c.collateralName) {
        const key = normalizeName(c.collateralName)
        if (!seen.has(key)) {
          seen.set(key, { name: c.collateralName, phone: c.collateralPhone || '', source: 'db' })
        }
      }
    }

    // 2. Check OCR aval: if normalized name matches a DB entry, skip (DB wins). Else add as 'ocr'.
    if (credit.aval?.nombre) {
      const key = normalizeName(credit.aval.nombre)
      if (!seen.has(key)) {
        seen.set(key, { name: credit.aval.nombre, phone: credit.aval.telefono || '', source: 'ocr' })
      }
    }

    // 3. New clients from other creditos in the same locality session
    //    (otros creditos sin matchedClientPos, con nombre, excluyendo self)
    if (editedLocality?.creditos) {
      editedLocality.creditos.forEach((other, i) => {
        if (i === index) return
        if (other.matchedClientPos) return
        if (!other.nombre) return
        const key = normalizeName(other.nombre)
        if (seen.has(key)) return
        seen.set(key, {
          name: other.nombre,
          phone: other.telefonoTitular || '',
          source: 'new-client',
        })
      })
    }

    // DB entries first, then OCR-only, then new-client
    const dbEntries = [...seen.values()].filter(a => a.source === 'db')
    const ocrEntries = [...seen.values()].filter(a => a.source === 'ocr')
    const newClientEntries = [...seen.values()].filter(a => a.source === 'new-client')
    return [...dbEntries, ...ocrEntries, ...newClientEntries]
  }, [clientsList, credit.aval?.nombre, credit.aval?.telefono, editedLocality?.creditos, index])

  // Fuzzy match del nombre del aval contra todos los collaterals de clientsList.
  //   - HIGH: match identico (post-normalization) → sin warning
  //   - MEDIUM/LOW: match aproximado → warning ambar, operador debe validar
  //   - null/NONE: aval nuevo, no hay candidato en BD
  const avalDbFuzzyMatch = useMemo(() => {
    const avalName = credit.aval?.nombre
    if (!avalName) return null
    const candidates: Array<{ borrowerName: string; phone: string }> = []
    const seen = new Set<string>()
    for (const c of clientsList) {
      if (!c.collateralName) continue
      const key = normalizeName(c.collateralName)
      if (seen.has(key)) continue
      seen.add(key)
      candidates.push({ borrowerName: c.collateralName, phone: c.collateralPhone || '' })
    }
    if (candidates.length === 0) return null
    const match = fuzzyMatchName(avalName, candidates, 2)
    if (!match || match.confidence === 'NONE') return null
    const hit = candidates[match.clientIndex]
    return { confidence: match.confidence, name: hit.borrowerName, phone: hit.phone }
  }, [credit.aval?.nombre, clientsList])

  // Solo marcamos como "a validar" cuando el match NO es exacto (MEDIUM/LOW).
  // HIGH = mismo nombre post-normalizacion (tildes, mayusculas, palabras filler)
  // → no necesita validacion manual.
  const avalNeedsValidation = avalDbFuzzyMatch != null && avalDbFuzzyMatch.confidence !== 'HIGH'

  // Renovacion sin match: tipo=R pero no hay matchedClient. Posiblemente el
  // nombre OCR no corresponde a ningun cliente en la lista de la localidad.
  const unmatchedRenewal = isRenewal && !matchedClient

  // Save OCR original on first render for edit tracking
  useEffect(() => {
    if (hasInitOcr.current) return
    hasInitOcr.current = true
    const changes: Partial<CapturaCredit> = {}

    if (!credit._ocrOriginal && (credit.nombre || credit.monto > 0)) {
      changes._ocrOriginal = {
        nombre: credit.nombre,
        monto: credit.monto,
        avalNombre: credit.aval?.nombre,
        avalTelefono: credit.aval?.telefono,
      }
    }
    // Always set OCR tracking fields if not already present (needed for diff display)
    if (!credit._ocrPhone) changes._ocrPhone = credit.telefonoTitular || ''
    if (!credit._ocrAvalPhone) changes._ocrAvalPhone = credit.aval?.telefono || ''
    if (!credit._ocrAvalNombre) changes._ocrAvalNombre = credit.aval?.nombre || ''

    if (Object.keys(changes).length > 0) update(changes)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auto-set loantypeId: match from semanas, or default to 14-week type.
  // Depends on editedResult so it re-runs after ensureEditedResult populates the Map
  // (child effects fire before parent effects, so editedResult may be null on first render).
  const hasEditedResult = !!editedResult
  useEffect(() => {
    if (!editedResult || credit.loantypeId || loantypes.length === 0) return
    // Try to match from semanas (OCR or client data)
    let match = credit.semanas
      ? loantypes.find(lt => lt.weekDuration === credit.semanas)
      : null
    // Fallback: default to 14-week type (most common)
    if (!match) {
      match = loantypes.find(lt => lt.weekDuration === 14) || null
    }
    if (match) {
      update({
        loantypeId: match.id,
        semanas: match.weekDuration,
        porcentaje: parseFloat(match.rate) * 100,
        // Keep entregado consistent in case the prior value was stale/missing.
        entregado: computeEntregado({
          monto: credit.monto,
          isRenewal,
          matchedClient,
          excepciones,
          clientsList,
        }),
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loantypes.length, credit.loantypeId, hasEditedResult])

  // Auto-select matching client for renewals (row-level fallback)
  useEffect(() => {
    if (!isRenewal || matchedClient || clientsList.length === 0) return

    // Try loanIdAnterior exact match
    if (credit.loanIdAnterior) {
      const client = clientsList.find(c => c.loanId === credit.loanIdAnterior)
      if (client) {
        handleClientSelect(client)
        return
      }
    }

    // Try fuzzy name match
    if (credit.nombre) {
      const match = fuzzyMatchName(credit.nombre, clientsList, 5)
      if (match && match.confidence !== 'NONE') {
        handleClientSelect(clientsList[match.clientIndex])
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRenewal, matchedClient, clientsList.length])

  const update = useCallback((changes: Partial<CapturaCredit>) => {
    updateCredit(jobId, localidad, index, changes)
  }, [updateCredit, jobId, localidad, index])

  // Calculate weekly payment
  const weeklyPayment = useMemo(() => {
    if (!selectedLoanType || !credit.monto) return 0
    const rate = parseFloat(selectedLoanType.rate) || 0
    const totalDebt = credit.monto * (1 + rate)
    return totalDebt / selectedLoanType.weekDuration
  }, [selectedLoanType, credit.monto])

  // --- Handlers ---

  const handleClientSelect = useCallback((client: CapturaClient | null) => {
    if (!client) {
      // Cleared selection → becomes "Nuevo"
      update({
        tipo: 'N',
        loanIdAnterior: undefined,
        matchedClientPos: undefined,
        matchConfidence: undefined,
        clientCode: undefined,
        entregado: credit.monto,
        aval: null,
        _dbPhone: undefined,
        _dbAvalPhone: undefined,
        _dbAvalNombre: undefined,
      })
      return
    }

    const entregado = computeEntregado({
      monto: credit.monto,
      isRenewal: true,
      matchedClient: client,
      excepciones,
      clientsList,
    })

    // Auto-fill loantype from matched client (by id, or by weekDuration, or default 14-week)
    const clientLoanType = (client.loantypeId
      ? loantypes.find(lt => lt.id === client.loantypeId)
      : null)
      || (client.weekDuration ? loantypes.find(lt => lt.weekDuration === client.weekDuration) : null)
      || loantypes.find(lt => lt.weekDuration === 14)
      || null

    // Capture OCR values BEFORE overwriting (use saved _ocr* if available, else current values)
    const ocrPhone = credit._ocrPhone || credit.telefonoTitular || ''
    const ocrAvalPhone = credit._ocrAvalPhone || credit.aval?.telefono || ''
    const ocrAvalNombre = credit._ocrAvalNombre || credit.aval?.nombre || ''

    // DB values from matched client
    const dbPhone = client.borrowerPhone || ''
    const dbAvalPhone = client.collateralPhone || ''
    const dbAvalNombre = client.collateralName || ''

    // DEFAULT = OCR: keep OCR values in fields, store DB as alternative
    // Only use DB value if OCR had nothing
    // Exception: if OCR and DB match case-insensitively, use DB (canonical)
    const telefonoTitular = ocrPhone || dbPhone
    const avalNombre = (ocrAvalNombre && dbAvalNombre &&
      normalizeName(ocrAvalNombre) === normalizeName(dbAvalNombre))
        ? dbAvalNombre
        : (ocrAvalNombre || dbAvalNombre)
    const avalTelefono = ocrAvalPhone || dbAvalPhone

    update({
      tipo: 'R',
      loanIdAnterior: client.loanId,
      matchedClientPos: client.pos,
      matchConfidence: 'HIGH',
      clientCode: client.clientCode,
      entregado,
      monto: credit.monto || client.requestedAmount || 0,
      semanas: clientLoanType?.weekDuration || client.weekDuration || credit.semanas,
      porcentaje: clientLoanType ? parseFloat(clientLoanType.rate) * 100 : (client.rate != null ? client.rate * 100 : credit.porcentaje),
      loantypeId: clientLoanType?.id || credit.loantypeId,
      // Aval: default = OCR value (or DB if OCR had nothing)
      aval: (avalNombre || avalTelefono)
        ? { nombre: avalNombre, telefono: avalTelefono }
        : credit.aval,
      // Phone: default = OCR value (or DB if OCR had nothing)
      telefonoTitular,
      // DB values for diff comparison
      _dbPhone: dbPhone,
      _dbAvalPhone: dbAvalPhone,
      _dbAvalNombre: dbAvalNombre,
      // OCR originals for toggle back
      _ocrPhone: ocrPhone,
      _ocrAvalPhone: ocrAvalPhone,
      _ocrAvalNombre: ocrAvalNombre,
    })
  }, [credit.monto, credit.semanas, credit.porcentaje, credit.loantypeId, credit.aval, credit.telefonoTitular, credit._ocrPhone, credit._ocrAvalPhone, credit._ocrAvalNombre, loantypes, excepciones, clientsList, update])

  const handleLoanTypeChange = useCallback((ltId: string) => {
    const lt = loantypes.find(l => l.id === ltId)
    if (!lt) return
    const changes: Partial<CapturaCredit> = {
      loantypeId: lt.id,
      semanas: lt.weekDuration,
      porcentaje: parseFloat(lt.rate) * 100,
      // Recompute entregado: monto didn't change but the client context might
      // have (e.g. operator changed loan type after the client paid this week).
      // Keep entregado in sync so Resumen projection is correct.
      entregado: computeEntregado({
        monto: credit.monto,
        isRenewal,
        matchedClient,
        excepciones,
        clientsList,
      }),
    }
    // Recalc first payment amount if active (commission stays as user set it)
    if (credit.primerPago) {
      const rate = parseFloat(lt.rate) || 0
      const totalDebt = credit.monto * (1 + rate)
      const wp = totalDebt / lt.weekDuration
      changes.primerPagoMonto = Math.round(wp)
    }
    update(changes)
  }, [loantypes, credit.monto, credit.primerPago, isRenewal, matchedClient, excepciones, clientsList, update])

  const handlePresetAmount = useCallback((amount: number) => {
    setIsCustomMode(false)
    const changes: Partial<CapturaCredit> = {
      monto: amount,
      entregado: computeEntregado({
        monto: amount,
        isRenewal,
        matchedClient,
        excepciones,
        clientsList,
      }),
    }
    if (credit.primerPago && selectedLoanType) {
      const rate = parseFloat(selectedLoanType.rate) || 0
      const totalDebt = amount * (1 + rate)
      changes.primerPagoMonto = Math.round(totalDebt / selectedLoanType.weekDuration)
    }
    update(changes)
  }, [isRenewal, matchedClient, credit.primerPago, selectedLoanType, excepciones, clientsList, update])

  const handleCustomAmount = useCallback(() => {
    setIsCustomMode(true)
    if (credit.monto === 0) {
      const defaultAmount = PRESET_AMOUNTS[PRESET_AMOUNTS.length - 1]
      handleMontoChange(defaultAmount)
    }
  }, [credit.monto])

  const handleMontoChange = useCallback((monto: number) => {
    const changes: Partial<CapturaCredit> = {
      monto,
      entregado: computeEntregado({
        monto,
        isRenewal,
        matchedClient,
        excepciones,
        clientsList,
      }),
    }
    if (credit.primerPago && selectedLoanType) {
      const rate = parseFloat(selectedLoanType.rate) || 0
      const totalDebt = monto * (1 + rate)
      changes.primerPagoMonto = Math.round(totalDebt / selectedLoanType.weekDuration)
    }
    update(changes)
  }, [isRenewal, matchedClient, credit.primerPago, selectedLoanType, excepciones, clientsList, update])

  const handleFirstPaymentToggle = useCallback((enabled: boolean) => {
    if (enabled && weeklyPayment > 0) {
      update({
        primerPago: true,
        primerPagoMonto: Math.round(weeklyPayment),
        primerPagoComision: 0,
      })
    } else {
      update({
        primerPago: false,
        primerPagoMonto: undefined,
        primerPagoComision: undefined,
      })
    }
  }, [weeklyPayment, selectedLoanType, update])

  const handleAvalSelect = useCallback((aval: AvalOption | null) => {
    if (!aval) {
      update({ aval: null })
    } else {
      update({ aval: { nombre: aval.name, telefono: aval.phone } })
    }
  }, [update])

  // Edit indicators (case-insensitive for names)
  const ocrOrig = credit._ocrOriginal
  const isNameEdited = ocrOrig && normalizeName(credit.nombre || '') !== normalizeName(ocrOrig.nombre || '')
  const isMontoEdited = ocrOrig && credit.monto !== ocrOrig.monto
  const isAvalNameEdited = ocrOrig && normalizeName(credit.aval?.nombre || '') !== normalizeName(ocrOrig.avalNombre || '')
  const isAvalPhoneEdited = ocrOrig && (credit.aval?.telefono || '') !== (ocrOrig.avalTelefono || '')

  // Diff values: DB from dbComparisonClient (works even without formal match), OCR from tracking fields
  const dbPhone = dbComparisonClient?.borrowerPhone || ''
  const dbAvalPhone = dbComparisonClient?.collateralPhone || ''
  const dbAvalNombre = dbComparisonClient?.collateralName || ''
  const ocrPhone = credit._ocrPhone || ''
  const ocrAvalPhone = credit._ocrAvalPhone || ocrOrig?.avalTelefono || ''
  const ocrAvalNombre = credit._ocrAvalNombre || ocrOrig?.avalNombre || ''

  // Computed values for right column summary
  const totalDebt = useMemo(() => {
    if (!selectedLoanType || !credit.monto) return 0
    const rate = parseFloat(selectedLoanType.rate) || 0
    return credit.monto * (1 + rate)
  }, [selectedLoanType, credit.monto])

  return (
    <div className={cn(
      'group relative border rounded-lg bg-card shadow-sm px-2.5 pt-2 pb-2 space-y-2',
      isRenewal && 'border-blue-200/60 bg-blue-50/20 dark:bg-blue-950/10',
    )}>
      {/* HEADER: tipo badge + trash button.
          Minimal header — name/phone fields live in the identidades block
          below so they sit next to aval fields for visual phone validation. */}
      <div className="flex items-center gap-1.5">
        <span
          title={isRenewal ? 'Renovacion' : 'Cliente nuevo'}
          aria-label={isRenewal ? 'Renovacion' : 'Cliente nuevo'}
          className={cn(
            'inline-flex h-6 items-center gap-1 rounded-full px-2 text-[11px] font-medium',
            isRenewal
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300'
              : 'bg-green-100 text-green-700 dark:bg-green-900/60 dark:text-green-300'
          )}
        >
          {isRenewal ? <RotateCw className="h-3 w-3" /> : <UserPlus className="h-3 w-3" />}
          {isRenewal ? 'Renovacion' : 'Nuevo'}
        </span>
        <span className="flex-1" />
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 shrink-0 text-muted-foreground opacity-60 hover:opacity-100 hover:text-destructive"
          onClick={() => removeCredit(jobId, localidad, index)}
          aria-label="Eliminar credito"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* IDENTIDADES: Cliente + Aval lado a lado, con telefonos alineados
          verticalmente (misma altura de fila) para validar visualmente que
          coinciden o difieren.
          - Cada bloque: nombre arriba, telefono abajo
          - En mobile: stack vertical; en md+: grid 2 columnas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {/* CLIENTE */}
        <div className={cn(
          'relative rounded-md border pl-2.5 pr-2 py-1.5 space-y-1 before:absolute before:left-0 before:top-1 before:bottom-1 before:w-[3px] before:rounded-full',
          unmatchedRenewal
            ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-400 dark:border-amber-700 ring-1 ring-amber-300 before:bg-amber-500'
            : 'bg-blue-50/20 dark:bg-blue-950/10 border-blue-200/60 dark:border-blue-800/40 before:bg-blue-500/60',
        )}>
          <div className="flex items-center gap-1.5">
            {unmatchedRenewal ? (
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" aria-label="Cliente sin match" />
            ) : (
              <UserPlus className="h-3.5 w-3.5 text-blue-600 shrink-0" aria-label="Cliente" />
            )}
            <span className={cn(
              'text-[10px] uppercase tracking-wide',
              unmatchedRenewal ? 'text-amber-700 dark:text-amber-400 font-semibold' : 'text-muted-foreground',
            )}>
              {unmatchedRenewal ? 'Renovación sin match' : 'Cliente'}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {matchedClient ? (
              <CapturaClientAutocomplete
                clientsList={clientsList}
                selectedClient={matchedClient}
                onSelect={handleClientSelect}
                initialSearch={credit.nombre}
                className="w-full h-7 text-xs"
              />
            ) : isRenewal ? (
              <CapturaClientAutocomplete
                clientsList={clientsList}
                selectedClient={null}
                onSelect={handleClientSelect}
                initialSearch={credit.nombre}
                className="w-full h-7 text-xs"
              />
            ) : (
              <>
                <TruncatingInput
                  value={(credit.nombre || '').toUpperCase()}
                  onChange={(e) => update({ nombre: e.target.value.toUpperCase() })}
                  className={cn(
                    'h-7 text-xs flex-1 min-w-0',
                    isNameEdited && 'border-l-2 border-l-neutral-400'
                  )}
                  placeholder="Nombre del cliente nuevo"
                />
                <CapturaClientAutocomplete
                  clientsList={clientsList}
                  selectedClient={null}
                  onSelect={handleClientSelect}
                  initialSearch={credit.nombre}
                  iconOnly
                />
              </>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Input
              value={credit.telefonoTitular || ''}
              onChange={(e) => update({ telefonoTitular: e.target.value })}
              placeholder="Tel. titular"
              aria-label="Telefono titular"
              className={cn('h-7 text-xs w-full tabular-nums')}
            />
            <DataSourceBadges
              currentValue={credit.telefonoTitular || ''}
              ocrValue={ocrPhone}
              dbValue={dbPhone}
              onUseOcr={() => update({ telefonoTitular: ocrPhone })}
              onUseDb={() => update({ telefonoTitular: dbPhone })}
            />
          </div>
          {unmatchedRenewal && (
            <p className="flex items-start gap-1 text-[10px] text-amber-700 dark:text-amber-400 leading-tight">
              <AlertTriangle className="h-3 w-3 shrink-0 mt-[1px]" />
              <span>
                Renovación sin cliente en BD de esta localidad. Selecciona manualmente o convierte a <strong>Nuevo</strong>.
              </span>
            </p>
          )}
        </div>

        {/* AVAL */}
        <div className="relative rounded-md border bg-amber-50/20 dark:bg-amber-950/10 border-amber-200/70 dark:border-amber-800/40 pl-2.5 pr-2 py-1.5 space-y-1 before:absolute before:left-0 before:top-1 before:bottom-1 before:w-[3px] before:rounded-full before:bg-amber-500/70">
          <div className="flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5 text-amber-600 shrink-0" aria-label="Aval" />
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Aval</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="flex items-center gap-1 flex-1 min-w-0">
              <TruncatingInput
                value={(credit.aval?.nombre || '').toUpperCase()}
                onChange={(e) => update({
                  aval: { nombre: e.target.value.toUpperCase(), telefono: credit.aval?.telefono || '' }
                })}
                className={cn(
                  'h-7 text-xs flex-1 min-w-0',
                  isAvalNameEdited && 'border-l-2 border-l-neutral-400',
                  avalNeedsValidation && 'border-amber-500 bg-amber-50/60 dark:bg-amber-950/30 ring-1 ring-amber-300 focus-visible:ring-amber-400'
                )}
                placeholder="Nombre del aval"
              />
              {avalNeedsValidation && avalDbFuzzyMatch && (
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => update({
                          aval: {
                            nombre: avalDbFuzzyMatch.name.toUpperCase(),
                            telefono: avalDbFuzzyMatch.phone || credit.aval?.telefono || '',
                          }
                        })}
                        className="inline-flex items-center gap-0.5 rounded border border-amber-400 bg-amber-100 px-1 text-[10px] font-semibold text-amber-900 hover:bg-amber-200 dark:bg-amber-900/40 dark:text-amber-100 dark:hover:bg-amber-900/60"
                        aria-label="Aplicar match sugerido de BD"
                      >
                        <AlertTriangle className="h-2.5 w-2.5" />
                        DB?
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs max-w-[320px] break-words">
                      Posible match ({avalDbFuzzyMatch.confidence}):{' '}
                      <strong>{avalDbFuzzyMatch.name.toUpperCase()}</strong>
                      {avalDbFuzzyMatch.phone && ` · ${avalDbFuzzyMatch.phone}`}
                      <br />
                      <span className="text-muted-foreground">Click para aplicar</span>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              <DataSourceBadges
                currentValue={credit.aval?.nombre || ''}
                ocrValue={ocrAvalNombre}
                dbValue={dbAvalNombre}
                onUseOcr={() => update({ aval: { ...credit.aval, nombre: ocrAvalNombre, telefono: credit.aval?.telefono || '' } })}
                onUseDb={() => update({ aval: { ...credit.aval, nombre: dbAvalNombre, telefono: credit.aval?.telefono || '' } })}
              />
            </div>
            <CapturaAvalAutocomplete
              avales={availableAvals}
              selectedAval={credit.aval || null}
              onSelect={handleAvalSelect}
              iconOnly
            />
          </div>
          <div className="flex items-center gap-1">
            <Input
              value={credit.aval?.telefono || ''}
              onChange={(e) => update({ aval: { ...credit.aval, nombre: credit.aval?.nombre || '', telefono: e.target.value } })}
              placeholder="Tel. aval"
              aria-label="Telefono aval"
              className={cn(
                'h-7 w-full text-xs tabular-nums',
                isAvalPhoneEdited && 'border-l-2 border-l-neutral-400'
              )}
            />
            <DataSourceBadges
              currentValue={credit.aval?.telefono || ''}
              ocrValue={ocrAvalPhone}
              dbValue={dbAvalPhone}
              onUseOcr={() => update({ aval: { ...credit.aval, nombre: credit.aval?.nombre || '', telefono: ocrAvalPhone } })}
              onUseDb={() => update({ aval: { ...credit.aval, nombre: credit.aval?.nombre || '', telefono: dbAvalPhone } })}
            />
          </div>
        </div>
      </div>

      {isNameEdited && ocrOrig?.nombre && (
        <p className="text-[10px] text-muted-foreground pl-1 -mt-1">
          OCR: <span className="line-through">{ocrOrig.nombre.toUpperCase()}</span>
        </p>
      )}

      {/* Renewal summary (solo si renewal matcheado) */}
      {isRenewal && matchedClient && (
        <CapturaRenewalSummary
          matchedClient={matchedClient}
          requestedAmount={credit.monto}
          matchConfidence={credit.matchConfidence || 'HIGH'}
          selectedLoanType={selectedLoanType}
          sameSessionPayment={getPaymentForClient(excepciones, clientsList, matchedClient.pos)}
        />
      )}

      {/* CREDITO */}
      <div className="space-y-1.5">
        {/* Row A: loan type + amount presets + custom */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <Select value={selectedLoanType?.id || ''} onValueChange={handleLoanTypeChange}>
            <SelectTrigger className="h-7 text-xs w-auto min-w-[140px]">
              <SelectValue placeholder="Tipo de credito..." />
            </SelectTrigger>
            <SelectContent>
              {loantypes.map((lt) => (
                <SelectItem key={lt.id} value={lt.id} className="text-xs">
                  {lt.name} ({lt.weekDuration}sem, {parseFloat(lt.rate) * 100}%)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {PRESET_AMOUNTS.map((amount) => (
            <Button
              key={amount}
              type="button"
              variant={credit.monto === amount && !isCustomMode ? 'default' : 'outline'}
              size="sm"
              onClick={() => handlePresetAmount(amount)}
              className={cn(
                'h-7 px-2 text-xs font-medium tabular-nums',
                credit.monto === amount && !isCustomMode && 'ring-2 ring-primary ring-offset-1'
              )}
            >
              ${(amount / 1000).toFixed(amount % 1000 ? 1 : 0)}k
            </Button>
          ))}
          <Button
            type="button"
            variant={isCustomMode ? 'default' : 'outline'}
            size="sm"
            onClick={handleCustomAmount}
            className={cn(
              'h-7 px-2 text-xs font-medium',
              isCustomMode && 'ring-2 ring-primary ring-offset-1'
            )}
          >
            Otro
          </Button>

          {isCustomMode && (
            <div className="flex items-center gap-0.5">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => handleMontoChange(Math.max(AMOUNT_STEP, credit.monto - AMOUNT_STEP))}
                disabled={credit.monto <= AMOUNT_STEP}
                className="h-7 w-6"
              >
                <Minus className="h-3 w-3" />
              </Button>
              <Input
                type="number"
                value={credit.monto}
                onChange={(e) => handleMontoChange(parseFloat(e.target.value) || 0)}
                onWheel={(e) => e.currentTarget.blur()}
                className={cn('h-7 w-[72px] text-center text-xs font-medium tabular-nums', noSpinnerClass)}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => handleMontoChange(credit.monto + AMOUNT_STEP)}
                className="h-7 w-6"
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          )}

          {isMontoEdited && ocrOrig?.monto != null && (
            <span className="text-[10px] text-muted-foreground line-through">
              ${ocrOrig.monto.toLocaleString()}
            </span>
          )}
        </div>

        {/* Row B: summary strip inline + primer pago toggle/expand */}
        {selectedLoanType && credit.monto > 0 && (
          <div className="flex items-center gap-x-3 gap-y-1 flex-wrap text-xs px-1.5 py-1 rounded bg-muted/40 border">
            <SummaryChip label="Semanal" value={formatCurrency(weeklyPayment)} emphasize />
            <SummaryChip label="Total" value={formatCurrency(totalDebt)} />
            {isRenewal && (
              <SummaryChip
                label="Entregar"
                value={formatCurrency(credit.entregado ?? credit.monto)}
              />
            )}

            <span className="flex-1" />

            {credit.primerPago ? (
              <div className="flex items-center gap-1">
                <Switch
                  checked
                  onCheckedChange={handleFirstPaymentToggle}
                  className="scale-75"
                />
                <span className="text-xs text-muted-foreground">1er pago</span>
                <Input
                  type="number"
                  value={credit.primerPagoMonto ?? ''}
                  onChange={(e) => update({ primerPagoMonto: parseFloat(e.target.value) || 0 })}
                  onWheel={(e) => e.currentTarget.blur()}
                  className={cn('h-6 w-[72px] text-xs text-right tabular-nums', noSpinnerClass)}
                  placeholder="Monto"
                />
              </div>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 px-1.5 text-[11px] text-muted-foreground hover:text-foreground"
                onClick={() => handleFirstPaymentToggle(true)}
              >
                <Plus className="h-3 w-3 mr-0.5" />
                Primer pago
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// --- Compact UI helpers ---

/**
 * Text badges for OCR vs BD origin. Replaces the older two-dot indicator.
 *
 * Rules:
 *   - Returns null when both OCR and DB are empty.
 *   - When OCR === DB (case-insensitive): shows a single green [OK] badge.
 *   - When they differ: shows [OCR] and [BD] badges side by side.
 *       The badge matching `currentValue` is emphasized; the other is pale
 *       and clickable to swap the input's value to that source.
 *   - Tooltip on each badge exposes the exact alternate value.
 */
function DataSourceBadges({ currentValue, ocrValue, dbValue, onUseOcr, onUseDb, className }: {
  currentValue: string
  ocrValue?: string
  dbValue?: string
  onUseOcr?: () => void
  onUseDb?: () => void
  className?: string
}) {
  const ocr = (ocrValue || '').trim()
  const db = (dbValue || '').trim()
  if (!ocr && !db) return null

  if (ocr && db && ocr.toLowerCase() === db.toLowerCase()) {
    return (
      <span
        title={`OCR y BD coinciden: ${ocr}`}
        className={cn(
          'inline-flex items-center rounded px-1 text-[10px] font-medium',
          'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
          className,
        )}
      >
        OK
      </span>
    )
  }

  const current = (currentValue || '').trim()
  const usingOcr = !!ocr && current === ocr
  const usingDb = !!db && current === db

  const baseBadge = 'inline-flex items-center rounded px-1 text-[10px] font-medium transition-colors cursor-pointer'
  const ocrActive = 'bg-amber-200 text-amber-900 dark:bg-amber-800/60 dark:text-amber-100 ring-1 ring-amber-500/60'
  const ocrIdle = 'bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300'
  const dbActive = 'bg-blue-200 text-blue-900 dark:bg-blue-800/60 dark:text-blue-100 ring-1 ring-blue-500/60'
  const dbIdle = 'bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300'

  return (
    <span className={cn('inline-flex items-center gap-0.5', className)}>
      {ocr && (
        <button
          type="button"
          onClick={onUseOcr}
          title={`OCR: ${ocr}${db ? `\nBD: ${db || '—'}` : ''}`}
          aria-label={`Usar valor OCR ${ocr}`}
          className={cn(baseBadge, usingOcr ? ocrActive : ocrIdle)}
        >
          OCR
        </button>
      )}
      {db && (
        <button
          type="button"
          onClick={onUseDb}
          title={`BD: ${db}${ocr ? `\nOCR: ${ocr || '—'}` : ''}`}
          aria-label={`Usar valor BD ${db}`}
          className={cn(baseBadge, usingDb ? dbActive : dbIdle)}
        >
          BD
        </button>
      )}
    </span>
  )
}

/**
 * Input que muestra un tooltip con el valor completo cuando el texto no
 * entra visualmente en el campo (scrollWidth > clientWidth). Mantiene
 * exactamente el mismo contrato visual que `Input` — si no hay truncado,
 * no se renderiza `TooltipContent` y el hover es invisible.
 *
 * Requiere un `TooltipProvider` ancestor (ya montado en CapturaPreviewDialog).
 */
function TruncatingInput(props: React.ComponentProps<typeof Input>) {
  const innerRef = useRef<HTMLInputElement>(null)
  const [truncated, setTruncated] = useState(false)
  const value = props.value

  useEffect(() => {
    const el = innerRef.current
    if (!el) return
    const check = () => setTruncated(el.scrollWidth > el.clientWidth + 1)
    check()
    const observer = new ResizeObserver(check)
    observer.observe(el)
    return () => observer.disconnect()
  }, [value])

  const content = String(value ?? '').trim()
  const showTooltip = truncated && content.length > 0

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Input ref={innerRef} {...props} />
        </TooltipTrigger>
        {showTooltip && (
          <TooltipContent side="top" className="text-xs max-w-[320px] break-words">
            {content}
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  )
}

/** Read-only label + value chip for the summary strip. */
function SummaryChip({ label, value, emphasize }: {
  label: string
  value: string
  emphasize?: boolean
}) {
  return (
    <span className="inline-flex items-baseline gap-1">
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className={cn(
        'tabular-nums',
        emphasize ? 'font-semibold text-foreground' : 'text-foreground/80'
      )}>{value}</span>
    </span>
  )
}

