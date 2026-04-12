'use client'

import { useCallback, useMemo, useEffect, useRef, useState } from 'react'
import { Trash2, Minus, Plus, Shield, UserPlus, RotateCw } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
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
        comisionCredito: parseFloat(match.loanGrantedComission) || 0,
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

    const pendingBalance = client.pendingBalance || 0
    const sameSessionPayment = getPaymentForClient(excepciones, clientsList, client.pos)
    const entregado = credit.monto - (pendingBalance - sameSessionPayment)

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
      comisionCredito: clientLoanType
        ? parseFloat(clientLoanType.loanGrantedComission) || 0
        : credit.comisionCredito,
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
  }, [credit.monto, credit.semanas, credit.porcentaje, credit.loantypeId, credit.comisionCredito, credit.aval, credit.telefonoTitular, credit._ocrPhone, credit._ocrAvalPhone, credit._ocrAvalNombre, loantypes, excepciones, clientsList, update])

  const handleLoanTypeChange = useCallback((ltId: string) => {
    const lt = loantypes.find(l => l.id === ltId)
    if (!lt) return
    const changes: Partial<CapturaCredit> = {
      loantypeId: lt.id,
      semanas: lt.weekDuration,
      porcentaje: parseFloat(lt.rate) * 100,
      comisionCredito: parseFloat(lt.loanGrantedComission) || 0,
    }
    // Recalc first payment amount if active (commission stays as user set it)
    if (credit.primerPago) {
      const rate = parseFloat(lt.rate) || 0
      const totalDebt = credit.monto * (1 + rate)
      const wp = totalDebt / lt.weekDuration
      changes.primerPagoMonto = Math.round(wp)
    }
    update(changes)
  }, [loantypes, credit.monto, credit.primerPago, update])

  const handlePresetAmount = useCallback((amount: number) => {
    setIsCustomMode(false)
    const changes: Partial<CapturaCredit> = { monto: amount }
    if (isRenewal && matchedClient) {
      const sameSessionPayment = getPaymentForClient(excepciones, clientsList, matchedClient.pos)
      changes.entregado = amount - ((matchedClient.pendingBalance || 0) - sameSessionPayment)
    } else {
      changes.entregado = amount
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
    const changes: Partial<CapturaCredit> = { monto }
    if (isRenewal && matchedClient) {
      const sameSessionPayment = getPaymentForClient(excepciones, clientsList, matchedClient.pos)
      changes.entregado = monto - ((matchedClient.pendingBalance || 0) - sameSessionPayment)
    } else {
      changes.entregado = monto
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
      {/* HEADER: badge + cliente + titular phone + trash
          Responsive: por defecto inline (nombre | tel) para pantallas grandes,
          a xl (laptop con 2 cards lado a lado) apila tel debajo del nombre,
          a 2xl vuelve a inline porque hay espacio suficiente. */}
      <div className="flex items-start gap-1.5">
        <span className="shrink-0 inline-flex h-8 items-center">
          <span
            title={isRenewal ? 'Renovacion' : 'Cliente nuevo'}
            aria-label={isRenewal ? 'Renovacion' : 'Cliente nuevo'}
            className={cn(
              'inline-flex h-6 w-6 items-center justify-center rounded-full',
              isRenewal
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300'
                : 'bg-green-100 text-green-700 dark:bg-green-900/60 dark:text-green-300'
            )}
          >
            {isRenewal ? <RotateCw className="h-3.5 w-3.5" /> : <UserPlus className="h-3.5 w-3.5" />}
          </span>
        </span>

        <div className="flex-1 min-w-0 flex items-center gap-1.5 xl:flex-col xl:items-stretch xl:gap-1 2xl:flex-row 2xl:items-center 2xl:gap-1.5">
          {/* Name */}
          <div className="flex items-center gap-1 flex-1 min-w-0 w-full 2xl:w-auto">
            {matchedClient ? (
              <CapturaClientAutocomplete
                clientsList={clientsList}
                selectedClient={matchedClient}
                onSelect={handleClientSelect}
                initialSearch={credit.nombre}
                className="w-full h-8 text-sm"
              />
            ) : isRenewal ? (
              // Renovacion sin match: mostrar autocomplete completo para que el
              // usuario seleccione del dropdown y se dispare el flujo de renovacion
              // (recuadro verde + calculo de "A entregar").
              <CapturaClientAutocomplete
                clientsList={clientsList}
                selectedClient={null}
                onSelect={handleClientSelect}
                initialSearch={credit.nombre}
                className="w-full h-8 text-sm"
              />
            ) : (
              // Cliente nuevo: permitir edicion libre del nombre + boton iconOnly
              // por si el usuario quiere convertirlo en renovacion seleccionando
              // un cliente existente.
              <>
                <Input
                  value={credit.nombre || ''}
                  onChange={(e) => update({ nombre: e.target.value })}
                  className={cn(
                    'h-8 text-sm flex-1 min-w-0',
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

          {/* Titular phone */}
          <div className="relative flex items-center w-[140px] shrink-0 xl:w-full xl:shrink 2xl:w-[140px] 2xl:shrink-0">
            <Input
              value={credit.telefonoTitular || ''}
              onChange={(e) => update({ telefonoTitular: e.target.value })}
              placeholder="Tel. titular"
              aria-label="Telefono titular"
              className={cn('h-8 text-xs w-full pr-6 tabular-nums')}
            />
            <DataSourceDots
              className="absolute right-1.5 top-1/2 -translate-y-1/2"
              currentValue={credit.telefonoTitular || ''}
              ocrValue={ocrPhone}
              dbValue={dbPhone}
              onUseOcr={() => update({ telefonoTitular: ocrPhone })}
              onUseDb={() => update({ telefonoTitular: dbPhone })}
            />
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-7 p-0 shrink-0 text-muted-foreground opacity-60 hover:opacity-100 hover:text-destructive"
          onClick={() => removeCredit(jobId, localidad, index)}
          aria-label="Eliminar credito"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {isNameEdited && ocrOrig?.nombre && (
        <p className="text-[10px] text-muted-foreground pl-1 -mt-1">
          OCR: <span className="line-through">{ocrOrig.nombre}</span>
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

      {/* BODY */}
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

        {/* Row B: AVAL — bloque distintivo con acento ambar + shield icon
            Responsive igual que el header: default inline, xl stack, 2xl inline. */}
        <div className={cn(
          'relative rounded-md border bg-amber-50/20 dark:bg-amber-950/10',
          'border-amber-200/70 dark:border-amber-800/40 pl-2.5 pr-2 py-1.5',
          'before:absolute before:left-0 before:top-1 before:bottom-1',
          'before:w-[3px] before:rounded-full before:bg-amber-500/70',
        )}>
          <div className="flex items-start gap-1.5">
            <span className="inline-flex h-7 items-center shrink-0">
              <Shield className="h-3.5 w-3.5 text-amber-600" aria-label="Aval" />
            </span>

            <div className="flex-1 min-w-0 flex items-center gap-1.5 xl:flex-col xl:items-stretch xl:gap-1 2xl:flex-row 2xl:items-center 2xl:gap-1.5">
              {/* Aval name + iconOnly autocomplete */}
              <div className="flex items-center gap-1 flex-1 min-w-0 w-full 2xl:w-auto">
                <div className="relative flex-1 min-w-0">
                  <Input
                    value={credit.aval?.nombre || ''}
                    onChange={(e) => update({
                      aval: { nombre: e.target.value, telefono: credit.aval?.telefono || '' }
                    })}
                    className={cn(
                      'h-7 text-xs pr-6',
                      isAvalNameEdited && 'border-l-2 border-l-neutral-400'
                    )}
                    placeholder="Nombre del aval"
                  />
                  <DataSourceDots
                    className="absolute right-1.5 top-1/2 -translate-y-1/2"
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

              {/* Aval phone */}
              <div className="relative flex items-center w-[140px] shrink-0 xl:w-full xl:shrink 2xl:w-[140px] 2xl:shrink-0">
                <Input
                  value={credit.aval?.telefono || ''}
                  onChange={(e) => update({ aval: { ...credit.aval, nombre: credit.aval?.nombre || '', telefono: e.target.value } })}
                  placeholder="Tel. aval"
                  aria-label="Telefono aval"
                  className={cn(
                    'h-7 w-full text-xs pr-6 tabular-nums',
                    isAvalPhoneEdited && 'border-l-2 border-l-neutral-400'
                  )}
                />
                <DataSourceDots
                  className="absolute right-1.5 top-1/2 -translate-y-1/2"
                  currentValue={credit.aval?.telefono || ''}
                  ocrValue={ocrAvalPhone}
                  dbValue={dbAvalPhone}
                  onUseOcr={() => update({ aval: { ...credit.aval, nombre: credit.aval?.nombre || '', telefono: ocrAvalPhone } })}
                  onUseDb={() => update({ aval: { ...credit.aval, nombre: credit.aval?.nombre || '', telefono: dbAvalPhone } })}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Row C: summary strip inline + primer pago toggle/expand */}
        {selectedLoanType && credit.monto > 0 && (
          <div className="flex items-center gap-x-3 gap-y-1 flex-wrap text-xs px-1.5 py-1 rounded bg-muted/40 border">
            <SummaryChip label="Semanal" value={formatCurrency(weeklyPayment)} emphasize />
            <SummaryChip label="Total" value={formatCurrency(totalDebt)} />
            {isRenewal && (
              <InlineNumberChip
                label="Entregar"
                value={credit.entregado ?? credit.monto}
                onChange={(v) => update({ entregado: v })}
              />
            )}
            <InlineNumberChip
              label="Com"
              value={credit.comisionCredito ?? 0}
              onChange={(v) => update({ comisionCredito: v })}
            />

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
 * Two-dot indicator (amber=OCR, blue=DB) shown inside an input's right padding.
 * Renders nothing when OCR and DB agree or both are empty.
 * Filled dot = currently used; pale dot = alternative, click to switch.
 */
function DataSourceDots({ currentValue, ocrValue, dbValue, onUseOcr, onUseDb, className }: {
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
  if (ocr && db && ocr.toLowerCase() === db.toLowerCase()) return null

  const usingOcr = currentValue === ocr
  const usingDb = currentValue === db

  return (
    <span className={cn('flex items-center gap-1', className)}>
      {ocr && (
        <button
          type="button"
          onClick={onUseOcr}
          title={`OCR: ${ocr}`}
          aria-label={`Usar valor OCR ${ocr}`}
          className={cn(
            'h-2 w-2 rounded-full transition-all',
            usingOcr
              ? 'bg-amber-500 ring-1 ring-amber-700/50'
              : 'bg-amber-300 hover:bg-amber-500',
          )}
        />
      )}
      {db && (
        <button
          type="button"
          onClick={onUseDb}
          title={`BD: ${db}`}
          aria-label={`Usar valor BD ${db}`}
          className={cn(
            'h-2 w-2 rounded-full transition-all',
            usingDb
              ? 'bg-blue-500 ring-1 ring-blue-700/50'
              : 'bg-blue-300 hover:bg-blue-500',
          )}
        />
      )}
    </span>
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

/** Editable number chip that looks like text with a dashed underline; becomes a normal input on focus. */
function InlineNumberChip({ label, value, onChange }: {
  label: string
  value: number
  onChange: (v: number) => void
}) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</span>
      <Input
        type="number"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        onWheel={(e) => e.currentTarget.blur()}
        className={cn(
          'h-6 w-[76px] text-right text-xs tabular-nums px-1 py-0',
          '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
          'bg-transparent border-0 border-b border-dashed border-muted-foreground/30 rounded-none',
          'focus-visible:ring-0 focus-visible:border-primary focus-visible:border-solid',
        )}
      />
    </span>
  )
}
