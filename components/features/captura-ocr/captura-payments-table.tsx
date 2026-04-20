'use client'

import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { useQuery } from '@apollo/client'
import { Wallet, Building2, ArrowRight, Pencil, Plus, RefreshCw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table, TableBody, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Ban } from 'lucide-react'
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip'
import { formatCurrency } from '@/lib/utils'

import { useCapturaOcr } from './captura-ocr-context'
import { CapturaPaymentRow } from './captura-payment-row'
import type { CapturaPaymentRowState } from './captura-payment-row'
import { CapturaKPIBadges } from './captura-kpi-badges'
import { CapturaActionBar } from './captura-action-bar'
import { CapturaDistributionModal } from './captura-distribution-modal'
import { ACTIVE_LOANS_BY_LEAD_QUERY } from '@/graphql/queries/transactions'
import type { CapturaLocalityResult, CapturaClient, CapturaException } from './types'

interface Props {
  jobId: string
  locality: CapturaLocalityResult
}

/**
 * Fetch live ACTIVE loans from DB and merge with OCR clientsList.
 * - OCR clients keep their original pos (critical for exception matching)
 * - New DB loans not in OCR get appended with pos = maxPos + 1, +2, ...
 * - FINISHED loans from OCR are excluded
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapLoanToClient(loan: any, pos: number): CapturaClient {
  const pd = loan.borrower?.personalData || {}
  const lt = loan.loantype || {}
  const collateral = loan.collaterals?.[0] || {}
  return {
    pos,
    loanId: loan.id,
    borrowerId: loan.borrower?.id || '',
    clientCode: pd.clientCode || '',
    borrowerName: pd.fullName || '',
    expectedWeeklyPayment: Number(loan.expectedWeeklyPayment) || 0,
    loanPaymentComission: Number(lt.loanPaymentComission) || 0,
    requestedAmount: Number(loan.requestedAmount) || 0,
    totalPaid: Number(loan.totalPaid) || 0,
    pendingBalance: Number(loan.pendingAmountStored) || 0,
    totalDebtAcquired: (Number(loan.pendingAmountStored) || 0) + (Number(loan.totalPaid) || 0),
    loantypeId: lt.id || '',
    loantypeName: lt.name || '',
    weekDuration: Number(lt.weekDuration) || 0,
    rate: Number(lt.rate) || 0,
    loanGrantedComission: Number(lt.loanGrantedComission) || 0,
    collateralId: collateral.id || undefined,
    collateralName: collateral.fullName || '',
    collateralPhone: collateral.phones?.[0]?.number || '',
    borrowerPhone: pd.phones?.[0]?.number || '',
    loanStatus: 'ACTIVE',
  }
}

function useLiveClients(leadId: string | undefined, ocrClients: CapturaClient[]) {
  const { data, loading, refetch } = useQuery(ACTIVE_LOANS_BY_LEAD_QUERY, {
    variables: { leadId: leadId || '' },
    skip: !leadId,
    fetchPolicy: 'cache-and-network',
    notifyOnNetworkStatusChange: true,
  })

  // Fix #5: timestamp del último fetch completado. Se actualiza cada vez que
  // `data` cambia (cache-and-network entrega tanto el cache hit como la
  // respuesta fresca de red). Usado para el indicador "datos actualizados
  // hace Xs" en la UI.
  const [lastFetchedAt, setLastFetchedAt] = useState<number | null>(null)
  useEffect(() => {
    if (data?.loans?.edges) setLastFetchedAt(Date.now())
  }, [data])

  // Fix #5: refetch automático al volver foco a la ventana (típico: usuario
  // capturó un abono en /transacciones en otra pestaña y vuelve aquí).
  useEffect(() => {
    if (!leadId) return
    const onFocus = () => { refetch().catch(() => {}) }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [leadId, refetch])

  const computed = useMemo(() => {
    if (!data?.loans?.edges) return { clients: ocrClients }

    // DB is the source of truth. Defensive filter on status=ACTIVE (API already
    // filters, this guards against schema drift). badDebt loans SÍ deben
    // aparecer en el listado de abonos — paridad con /transacciones → abonos.
    const dbLoans: any[] = data.loans.edges
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((e: any) => e.node)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((l: any) => l.status === 'ACTIVE')

    // OCR data is only used to preserve original pos (for exception matching).
    const ocrByLoanId = new Map(ocrClients.map(c => [c.loanId, c]))
    let maxPos = ocrClients.length > 0 ? Math.max(...ocrClients.map(c => c.pos)) : 0

    const clients: CapturaClient[] = dbLoans.map(loan => {
      const ocr = ocrByLoanId.get(loan.id)
      if (ocr) {
        // Loan exists in OCR — keep original pos (exceptions reference it).
        // Enrich with collateralId from DB so the aval-reuse UX has the PersonalData id
        // available even when the OCR result predates the field being wired through.
        const dbCollateralId = loan.collaterals?.[0]?.id || undefined
        if (dbCollateralId && !ocr.collateralId) {
          return { ...ocr, collateralId: dbCollateralId }
        }
        return ocr
      }
      // New loan not in OCR — assign fresh pos
      maxPos++
      return mapLoanToClient(loan, maxPos)
    })

    return { clients }
  }, [data, ocrClients])

  return { ...computed, loading, refetch, lastFetchedAt }
}

/**
 * Build initial payment states from OCR data:
 * - Clients with exceptions use the exception data
 * - Regular clients use expectedWeeklyPayment and default commission
 */
function buildPaymentStates(
  clients: CapturaClient[],
  excepciones: CapturaException[],
  defaultComision: number,
): Map<number, CapturaPaymentRowState> {
  const excMap = new Map<number, CapturaException>()
  excepciones.forEach(e => excMap.set(e.pos, e))

  const states = new Map<number, CapturaPaymentRowState>()
  clients.forEach(client => {
    const exc = excMap.get(client.pos)
    if (exc) {
      states.set(client.pos, {
        marca: exc.marca || 'REGULAR',
        montoPagado: exc.montoPagado,
        comision: exc.marca === 'FALTA' ? 0 : (exc.comision ?? client.loanPaymentComission ?? defaultComision),
        paymentMethod: (exc.paymentMethod === 'MONEY_TRANSFER' ? 'MONEY_TRANSFER' : 'CASH') as 'CASH' | 'MONEY_TRANSFER',
        notas: exc.notas || '',
      })
    } else {
      states.set(client.pos, {
        marca: 'REGULAR',
        montoPagado: client.expectedWeeklyPayment,
        comision: client.loanPaymentComission || defaultComision,
        paymentMethod: 'CASH',
        notas: '',
      })
    }
  })
  return states
}

/**
 * Fix #5: indicador compacto "hace Xs/Xm" + botón de refresh manual.
 * Vive junto al título de la tabla de abonos para dar feedback inmediato
 * sobre la frescura de los datos vivos (pendingBalance, pagos recientes en
 * /transacciones).
 */
function LiveDataIndicator({
  lastFetchedAt,
  onRefresh,
  loading,
}: {
  lastFetchedAt: number | null
  onRefresh: () => void
  loading?: boolean
}) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const label = useMemo(() => {
    if (!lastFetchedAt) return 'cargando…'
    const deltaSec = Math.max(0, Math.floor((now - lastFetchedAt) / 1000))
    if (deltaSec < 5) return 'actualizado ahora'
    if (deltaSec < 60) return `hace ${deltaSec}s`
    const deltaMin = Math.floor(deltaSec / 60)
    if (deltaMin < 60) return `hace ${deltaMin}m`
    const deltaHr = Math.floor(deltaMin / 60)
    return `hace ${deltaHr}h`
  }, [lastFetchedAt, now])

  return (
    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
      <span className="tabular-nums">{label}</span>
      <Button
        variant="ghost"
        size="icon"
        className="h-5 w-5"
        onClick={onRefresh}
        disabled={loading}
        title="Refrescar datos de clientes"
        aria-label="Refrescar datos de clientes"
      >
        <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
      </Button>
    </div>
  )
}

export function CapturaPaymentsTable({ jobId, locality }: Props) {
  const { updateException, setAllRegular, setAllFalta, resetToOriginal, setLocalityClientsList, applyAbonosCommission, updateResumen } = useCapturaOcr()

  // Fetch live loans from DB, merged with OCR clientsList.
  // Filter out FINISHED/RENOVATED loans: the Python pipeline includes the last
  // FINISHED loan per borrower (for renewal detection in the dropdown), but this
  // listing — like /transacciones → abonos — must show ACTIVE loans only and
  // exclude those already renovated.
  const ocrClients = useMemo(
    () => (locality.clientsList || []).filter(
      c => c.loanStatus !== 'FINISHED' && c.loanStatus !== 'RENOVATED'
    ),
    [locality.clientsList]
  )
  const { clients, refetch: refetchLiveClients, lastFetchedAt } = useLiveClients(locality.leadId, ocrClients)

  // Sync DB-fetched clients back to editedResults. Covers two cases:
  //   1. OCR failed (clientsList empty): seed from DB.
  //   2. OCR captured loans that the DB filters out (baddebt / portfolio
  //      cleanup): prune clientsList so Resumen totals match the payments tab
  //      (only visible clients contribute to cobranza).
  // setLocalityClientsList is content-equality guarded, so this effect does not
  // cause render loops once the lists converge.
  useEffect(() => {
    if (clients.length === 0) return
    const sameContent =
      clients.length === ocrClients.length &&
      clients.every((c, i) => c.loanId === ocrClients[i].loanId)
    if (sameContent) return
    setLocalityClientsList(jobId, locality.localidad, clients)
  }, [jobId, locality.localidad, ocrClients, clients, setLocalityClientsList])
  const excepciones = locality.excepciones || []
  const defaultComision = locality.resumenInferior?.tarifaComision || 0

  // Build payment states from current OCR data (re-derives when excepciones change)
  const paymentStates = useMemo(
    () => buildPaymentStates(clients, excepciones, defaultComision),
    [clients, excepciones, defaultComision]
  )

  // UI state
  const [searchTerm, setSearchTerm] = useState('')
  // Initialize global commission from persisted state. Orden de búsqueda:
  //   1. resumenInferior.comisionGlobal (canónico cuando el OCR detecta la
  //      comisión global en el resumen inferior del PDF — Fix #1). Se prioriza
  //      porque es el valor que el PDF indica explícitamente; las derivaciones
  //      por suma de excepciones/creditos pueden divergir por redondeo en la
  //      distribución y producir "pérdidas" del valor manual.
  //   2. Suma de excepciones[].comision (path normal cuando hay abonos)
  //   3. Suma de creditos[].comisionCredito (fallback cuando la localidad
  //      sólo tiene adelantos/creditos nuevos — applyAbonosCommission lo
  //      persiste ahí por no haber cliente elegible).
  const [globalCommission, setGlobalCommission] = useState(() => {
    const resumen = locality.resumenInferior
    if (resumen?.comisionGlobalDetectado && typeof resumen.comisionGlobal === 'number' && resumen.comisionGlobal > 0) {
      return resumen.comisionGlobal.toString()
    }
    const fromExceptions = (locality.excepciones || [])
      .filter(e => e.marca !== 'FALTA')
      .reduce((s, e) => s + (e.comision || 0), 0)
    if (fromExceptions > 0) return fromExceptions.toString()
    const fromCredits = (locality.creditos || [])
      .reduce((s, c) => s + (c.comisionCredito || 0), 0)
    return fromCredits > 0 ? fromCredits.toString() : ''
  })
  const [showDistributionModal, setShowDistributionModal] = useState(false)
  // Pre-load cashToBank from OCR data
  const [cashToBank, setCashToBank] = useState(
    () => locality.resumenInferior?.cashToBank?.toString() || '0'
  )
  const lastSelectedIndex = useRef<number | null>(null)
  const hasSyncedOcrCommission = useRef(false)

  // Fix #1: sembrar la distribución de la comisión global detectada por OCR
  // cuando las excepciones aún no la reflejan (caso típico: primer abrir del
  // job después del procesamiento Python). Se ejecuta UNA sola vez por
  // montaje. No se reactivate si el usuario luego pone 0 / borra — eso es un
  // cambio manual legítimo.
  useEffect(() => {
    if (hasSyncedOcrCommission.current) return
    const resumen = locality.resumenInferior
    if (!resumen?.comisionGlobalDetectado) return
    const detected = typeof resumen.comisionGlobal === 'number' ? resumen.comisionGlobal : 0
    if (detected <= 0) return
    const sumInExceptions = (locality.excepciones || [])
      .filter(e => e.marca !== 'FALTA')
      .reduce((s, e) => s + (e.comision || 0), 0)
    // Si las excepciones ya suman el valor detectado (±0.01 tolerancia por
    // redondeo), no hay nada que hacer.
    if (Math.abs(sumInExceptions - detected) < 0.01) {
      hasSyncedOcrCommission.current = true
      return
    }
    applyAbonosCommission(jobId, locality.localidad, detected)
    hasSyncedOcrCommission.current = true
  }, [jobId, locality.localidad, locality.resumenInferior, locality.excepciones, applyAbonosCommission])

  // Filtered clients
  const filteredClients = useMemo(() => {
    if (!searchTerm) return clients
    const term = searchTerm.toLowerCase()
    return clients.filter(c =>
      c.borrowerName?.toLowerCase().includes(term) ||
      c.clientCode?.toLowerCase().includes(term)
    )
  }, [clients, searchTerm])

  // Build exception confidence map
  const confidenceMap = useMemo(() => {
    const map = new Map<number, string>()
    excepciones.forEach(e => {
      if (e.matchConfidence) map.set(e.pos, e.matchConfidence)
    })
    return map
  }, [excepciones])

  // Distribution totals
  const distributionTotals = useMemo(() => {
    let cash = 0
    let bank = 0
    let count = 0
    let commission = 0
    let faltasCount = 0

    paymentStates.forEach(state => {
      if (state.marca === 'FALTA') {
        faltasCount++
        return
      }
      count++
      commission += state.comision
      if (state.paymentMethod === 'CASH') cash += state.montoPagado
      else bank += state.montoPagado
    })

    return { cash, bank, total: cash + bank, count, commission, faltasCount }
  }, [paymentStates])

  // Adelantos (primer pago de creditos nuevos) — no estan en la tabla de abonos
  const adelantos = useMemo(() => {
    const credits = locality.creditos || []
    const items = credits
      .filter(c => c.primerPago && (c.primerPagoMonto ?? 0) > 0)
      .map(c => ({ nombre: c.nombre || '---', monto: c.primerPagoMonto ?? 0 }))
    const total = items.reduce((s, i) => s + i.monto, 0)
    return { items, total }
  }, [locality.creditos])

  // Derived distribution values
  const cashToBankValue = parseFloat(cashToBank || '0')
  const adjustedCash = distributionTotals.cash - cashToBankValue
  const adjustedBank = distributionTotals.bank + cashToBankValue

  // Handlers that sync back to context (excepciones)
  const syncToContext = useCallback((pos: number, changes: Partial<CapturaPaymentRowState>) => {
    const current = paymentStates.get(pos)
    if (!current) return

    const merged = { ...current, ...changes }
    updateException(jobId, locality.localidad, pos, {
      marca: merged.marca,
      montoPagado: merged.montoPagado,
      comision: merged.comision,
      paymentMethod: merged.paymentMethod,
      notas: merged.notas,
    })
  }, [jobId, locality.localidad, paymentStates, updateException])

  const handleToggleFalta = useCallback((pos: number, shiftKey: boolean) => {
    const current = paymentStates.get(pos)
    if (!current) return

    const clientIndex = filteredClients.findIndex(c => c.pos === pos)

    if (shiftKey && lastSelectedIndex.current !== null) {
      // Range selection
      const start = Math.min(lastSelectedIndex.current, clientIndex)
      const end = Math.max(lastSelectedIndex.current, clientIndex)
      const targetMarca = current.marca === 'FALTA' ? 'REGULAR' : 'FALTA'

      for (let i = start; i <= end; i++) {
        const client = filteredClients[i]
        if (!client) continue
        const clientState = paymentStates.get(client.pos)
        if (!clientState) continue

        if (targetMarca === 'FALTA') {
          updateException(jobId, locality.localidad, client.pos, {
            marca: 'FALTA',
            montoPagado: 0,
            paymentMethod: 'CASH',
          })
        } else {
          updateException(jobId, locality.localidad, client.pos, {
            marca: 'REGULAR',
            montoPagado: client.expectedWeeklyPayment,
            paymentMethod: 'CASH',
          })
        }
      }
    } else {
      // Single toggle
      if (current.marca === 'FALTA') {
        const client = clients.find(c => c.pos === pos)
        updateException(jobId, locality.localidad, pos, {
          marca: 'REGULAR',
          montoPagado: client?.expectedWeeklyPayment || 0,
          paymentMethod: 'CASH',
        })
      } else {
        updateException(jobId, locality.localidad, pos, {
          marca: 'FALTA',
          montoPagado: 0,
          paymentMethod: 'CASH',
        })
      }
    }

    lastSelectedIndex.current = clientIndex

    // Fix #2: NO re-aplicar comisión global aquí.
    // Antes: si el cliente que tenía la comisión quedaba FALTA, migrábamos via
    // applyAbonosCommission. Pero ese código reactivo pisaba la intención
    // manual del usuario (p.ej. al cambiar un abono luego de setear comisión).
    // La comisión sólo cambia por: (a) OCR al cargar el job, (b) el usuario
    // editando el input explícitamente. Los clientes FALTA ya son ignorados en
    // buildPaymentStates (comision forzada a 0), así que no hay doble conteo.
  }, [jobId, locality.localidad, clients, filteredClients, paymentStates, updateException])

  return (
    <Card>
      <CardHeader className="pb-3 border-b">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-shrink-0">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm font-medium">
                Pagos ({clients.length} clientes)
              </CardTitle>
              <LiveDataIndicator
                lastFetchedAt={lastFetchedAt}
                onRefresh={() => { refetchLiveClients().catch(() => {}) }}
              />
            </div>
            <CardDescription className="text-xs">
              {locality.localidad} — {distributionTotals.count} con pago, {distributionTotals.faltasCount} faltas
            </CardDescription>
          </div>
          <CapturaKPIBadges clients={clients} paymentStates={paymentStates} />
        </div>

        <CapturaActionBar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onSetAllRegular={() => setAllRegular(jobId, locality.localidad)}
          onSetAllFalta={() => setAllFalta(jobId, locality.localidad)}
          onResetToOriginal={() => resetToOriginal(jobId, locality.localidad)}
        />
      </CardHeader>

      <div className="max-h-[55vh] overflow-y-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-card z-10">
            <TableRow>
              <TableHead className="w-[32px] py-1 px-2">
                <Ban className="h-3.5 w-3.5 text-muted-foreground" />
              </TableHead>
              <TableHead className="py-1 px-2">Cliente</TableHead>
              <TableHead className="w-[100px] py-1 px-1 text-right">Pagado</TableHead>
              <TableHead className="w-[36px] py-1 px-1">Pago</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredClients.map((client, index) => {
              const state = paymentStates.get(client.pos)
              if (!state) return null

              return (
                <CapturaPaymentRow
                  key={client.pos}
                  client={client}
                  paymentState={state}
                  index={index}
                  matchConfidence={confidenceMap.get(client.pos)}
                  onToggleFalta={(shiftKey) => handleToggleFalta(client.pos, shiftKey)}
                  onAmountChange={(amount) => syncToContext(client.pos, { montoPagado: amount })}
                  onPaymentMethodChange={(method) => syncToContext(client.pos, { paymentMethod: method })}
                  onNotesChange={(notes) => syncToContext(client.pos, { notas: notes })}
                />
              )
            })}
          </TableBody>
        </Table>
      </div>

      {/* Inline distribution summary strip — always visible, pre-loaded from OCR */}
      <div className="border-t bg-muted/30 px-4 py-3">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Cash */}
          <div className="flex items-center gap-1.5">
            <Wallet className="h-4 w-4 text-green-600" />
            <span className="text-xs text-muted-foreground">Efectivo:</span>
            <span className="text-sm font-semibold text-green-700 dark:text-green-400 tabular-nums">
              {formatCurrency(adjustedCash)}
            </span>
          </div>

          {/* Cash to bank arrow */}
          {cashToBankValue > 0 && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <ArrowRight className="h-3.5 w-3.5" />
              <span className="tabular-nums">{formatCurrency(cashToBankValue)}</span>
              <span>al banco</span>
            </div>
          )}

          {/* Bank */}
          <div className="flex items-center gap-1.5">
            <Building2 className="h-4 w-4 text-blue-600" />
            <span className="text-xs text-muted-foreground">Banco:</span>
            <span className="text-sm font-semibold text-blue-700 dark:text-blue-400 tabular-nums">
              {formatCurrency(adjustedBank)}
            </span>
          </div>

          {/* Separator */}
          <div className="h-5 w-px bg-border" />

          {/* Total + Adelantos */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Total:</span>
            <span className="text-sm font-bold tabular-nums">
              {formatCurrency(distributionTotals.total)}
            </span>
            {adelantos.total > 0 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex items-center gap-0.5 text-xs text-emerald-600 dark:text-emerald-400 cursor-default">
                      <Plus className="h-3 w-3" />
                      <span className="tabular-nums">{formatCurrency(adelantos.total)}</span>
                      <span className="text-muted-foreground ml-0.5">=</span>
                      <span className="font-bold tabular-nums ml-0.5">
                        {formatCurrency(distributionTotals.total + adelantos.total)}
                      </span>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <p className="font-medium text-xs mb-1">Adelantos ({adelantos.items.length})</p>
                    {adelantos.items.map((a, i) => (
                      <div key={i} className="flex justify-between gap-4 text-xs">
                        <span className="truncate">{a.nombre}</span>
                        <span className="tabular-nums font-medium">{formatCurrency(a.monto)}</span>
                      </div>
                    ))}
                    <div className="border-t mt-1 pt-1 flex justify-between gap-4 text-xs font-medium">
                      <span>Total adelantos</span>
                      <span className="tabular-nums">{formatCurrency(adelantos.total)}</span>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>

          {/* Separator */}
          <div className="h-5 w-px bg-border" />

          {/* Commission controls — inline con el Total para edicion rapida */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Comision:</span>
            <Input
              type="number"
              value={globalCommission}
              onChange={(e) => {
                const v = e.target.value
                setGlobalCommission(v)
                const num = parseFloat(v)
                applyAbonosCommission(jobId, locality.localidad, isNaN(num) ? 0 : num)
              }}
              onWheel={(e) => e.currentTarget.blur()}
              placeholder="Total"
              className="h-7 w-[80px] text-xs text-right"
            />
          </div>

          {/* Edit distribution button */}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground ml-auto"
            onClick={() => setShowDistributionModal(true)}
          >
            <Pencil className="h-3 w-3" />
            Editar distribucion
          </Button>
        </div>
      </div>

      <CapturaDistributionModal
        open={showDistributionModal}
        onOpenChange={setShowDistributionModal}
        totals={distributionTotals}
        cashToBank={cashToBank}
        onCashToBankChange={(v) => {
          setCashToBank(v)
          const num = parseFloat(v || '0')
          updateResumen(jobId, locality.localidad, { cashToBank: isNaN(num) ? 0 : num })
        }}
        onConfirm={() => setShowDistributionModal(false)}
        isSubmitting={false}
      />
    </Card>
  )
}
