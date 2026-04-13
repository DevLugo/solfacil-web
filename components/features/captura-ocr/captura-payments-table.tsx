'use client'

import { useState, useMemo, useCallback, useRef } from 'react'
import { Wallet, Building2, ArrowRight, Pencil, Plus } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
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
import type { CommissionMode } from './captura-action-bar'
import { CapturaDistributionModal } from './captura-distribution-modal'
import type { CapturaLocalityResult, CapturaClient, CapturaException } from './types'

interface Props {
  jobId: string
  locality: CapturaLocalityResult
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

export function CapturaPaymentsTable({ jobId, locality }: Props) {
  const { updateException, setAllRegular, setAllFalta, resetToOriginal } = useCapturaOcr()

  // Filter out FINISHED loans (only present for renewal matching, not for payments)
  const clients = useMemo(() =>
    (locality.clientsList || []).filter(c => c.loanStatus !== 'FINISHED'),
    [locality.clientsList]
  )
  const excepciones = locality.excepciones || []
  const defaultComision = locality.resumenInferior?.tarifaComision || 0

  // Build payment states from current OCR data (re-derives when excepciones change)
  const paymentStates = useMemo(
    () => buildPaymentStates(clients, excepciones, defaultComision),
    [clients, excepciones, defaultComision]
  )

  // UI state
  const [searchTerm, setSearchTerm] = useState('')
  // Default a "Monto fijo": solo el primer cliente elegible recibe la comision
  // completa, el resto queda en 0 (patron mas comun para lideres de localidad).
  const [commissionMode, setCommissionMode] = useState<CommissionMode>('hardcoded')
  const [globalCommission, setGlobalCommission] = useState('')
  const [showDistributionModal, setShowDistributionModal] = useState(false)
  // Pre-load cashToBank from OCR data
  const [cashToBank, setCashToBank] = useState(
    () => locality.resumenInferior?.cashToBank?.toString() || '0'
  )
  const lastSelectedIndex = useRef<number | null>(null)

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
  }, [jobId, locality.localidad, clients, filteredClients, paymentStates, updateException])

  const handleApplyGlobalCommission = useCallback(() => {
    const value = parseFloat(globalCommission)
    if (isNaN(value)) return

    if (commissionMode === 'tarifa') {
      // Tarifa fija: apply to all non-FALTA clients whose base commission > 0
      clients.forEach(client => {
        const state = paymentStates.get(client.pos)
        if (!state || state.marca === 'FALTA') return
        const baseComision = client.loanPaymentComission ?? defaultComision
        if (baseComision <= 0) return // Skip clients with no base commission
        updateException(jobId, locality.localidad, client.pos, {
          marca: state.marca,
          montoPagado: state.montoPagado,
          comision: value,
          paymentMethod: state.paymentMethod,
          notas: state.notas,
        })
      })
    } else {
      // Hardcoded: apply the full amount to the first eligible client, all others get 0
      let applied = false
      clients.forEach(client => {
        const state = paymentStates.get(client.pos)
        if (!state || state.marca === 'FALTA') return
        const baseComision = client.loanPaymentComission ?? defaultComision
        // First client with base commission > 0 gets the value, everyone else gets 0
        const comision = (!applied && baseComision > 0) ? value : 0
        updateException(jobId, locality.localidad, client.pos, {
          marca: state.marca,
          montoPagado: state.montoPagado,
          comision,
          paymentMethod: state.paymentMethod,
          notas: state.notas,
        })
        if (!applied && baseComision > 0) applied = true
      })
    }
  }, [jobId, locality.localidad, clients, paymentStates, globalCommission, commissionMode, defaultComision, updateException])

  return (
    <Card>
      <CardHeader className="pb-3 border-b">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-shrink-0">
            <CardTitle className="text-sm font-medium">
              Pagos ({clients.length} clientes)
            </CardTitle>
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
                  onCommissionChange={(commission) => syncToContext(client.pos, { comision: commission })}
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
            <Select
              value={commissionMode}
              onValueChange={(v) => setCommissionMode(v as CommissionMode)}
            >
              <SelectTrigger className="h-7 w-[110px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hardcoded" className="text-xs">Monto fijo</SelectItem>
                <SelectItem value="tarifa" className="text-xs">Tarifa c/u</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="number"
              value={globalCommission}
              onChange={(e) => setGlobalCommission(e.target.value)}
              onWheel={(e) => e.currentTarget.blur()}
              placeholder={commissionMode === 'tarifa' ? 'c/u' : 'Total'}
              className="h-7 w-[80px] text-xs text-right"
            />
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={handleApplyGlobalCommission}
              disabled={!globalCommission}
            >
              Aplicar
            </Button>
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
        onCashToBankChange={setCashToBank}
        onConfirm={() => setShowDistributionModal(false)}
        isSubmitting={false}
      />
    </Card>
  )
}
