'use client'

import { useState, useRef } from 'react'
import { Wallet, ArrowDown, ArrowUp, Server, FileText, AlertTriangle, Pencil, X, Check } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, cn } from '@/lib/utils'
import { BalanceBox, MatchBadge } from './captura-resumen-caja'
import { useCapturaOcr } from './captura-ocr-context'
import type { CapturaLocalityResult, CapturaGasto, CapturaExtracobranzaEntry } from './types'

interface Props {
  jobId: string
  localities: CapturaLocalityResult[]
  originalLocalities: CapturaLocalityResult[]
  cashFundBalance?: number
  gastos?: CapturaGasto[]
  originalGastos?: CapturaGasto[]
  extracobranzas?: CapturaExtracobranzaEntry[]
}

interface LocalityCalc {
  localidad: string
  cobranza: number
  comisiones: number
  creditos: number
  cashToBank: number
  delta: number
  faltaCount: number
  clientCount: number
}

export function computeProjection(
  localities: CapturaLocalityResult[],
  originalLocalities: CapturaLocalityResult[],
  gastos: CapturaGasto[],
  originalGastos: CapturaGasto[],
  cashFundBalance?: number,
  extracobranzas: CapturaExtracobranzaEntry[] = [],
) {
  const inicial = cashFundBalance != null ? Number(cashFundBalance) : null

  const totalGastosCash = (gastos || []).reduce(
    (sum, g) => sum + ((!g.sourceAccountType || g.sourceAccountType === 'EMPLOYEE_CASH_FUND') ? (g.monto || 0) : 0),
    0,
  )

  // Extracobranzas are extra payments captured globally (across routes) and
  // materialized as real LoanPayments on confirm. Each entry can split the
  // amount between cash (→ employee cash fund) and transfer (→ bank).
  const extrasCash = (extracobranzas || [])
    .reduce((sum, e) => sum + (e.montoEfectivo || 0), 0)
  const extrasBank = (extracobranzas || [])
    .reduce((sum, e) => sum + (e.montoTransferencia || 0), 0)

  const rows: LocalityCalc[] = localities.map(loc => {
    const r = loc.resumenInferior
    const credits = loc.creditos || []
    const clients = (loc.clientsList || []).filter(c => c.loanStatus !== 'FINISHED')
    const excepciones = loc.excepciones || []
    const defaultComision = r?.tarifaComision || 0

    const excMap = new Map<number, typeof excepciones[0]>()
    excepciones.forEach(e => excMap.set(e.pos, e))

    // Cobranza & comisiones from payments (edited excepciones)
    let cobranzaFromClients = 0
    let comisionFromClients = 0
    let faltaCount = 0
    clients.forEach(client => {
      const exc = excMap.get(client.pos)
      const marca = exc?.marca || 'REGULAR'
      if (marca === 'FALTA') { faltaCount++; return }
      const montoPagado = exc ? exc.montoPagado : client.expectedWeeklyPayment
      const comision = exc?.comision ?? client.loanPaymentComission ?? defaultComision
      cobranzaFromClients += montoPagado
      comisionFromClients += comision
    })

    // Credits: primer pago (entrada), comision primer pago (salida),
    // comision credito (salida), entregado (salida)
    const primerPagoCobranza = credits.reduce(
      (sum, c) => sum + (c.primerPago ? (c.primerPagoMonto ?? 0) : 0), 0
    )
    const primerPagoComision = credits.reduce(
      (sum, c) => sum + (c.primerPago ? (c.primerPagoComision ?? 0) : 0), 0
    )
    const comisionCreditos = credits.reduce(
      (sum, c) => sum + (c.comisionCredito ?? 0), 0
    )
    const creditosEntregado = credits.reduce(
      (sum, c) => sum + (c.entregado ?? c.monto ?? 0), 0
    )

    const cobranza = cobranzaFromClients + primerPagoCobranza
    const comisiones = comisionFromClients + primerPagoComision + comisionCreditos
    const cashToBank = r?.cashToBank ?? 0
    const delta = cobranza - comisiones - creditosEntregado - cashToBank

    return { localidad: loc.localidad, cobranza, comisiones, creditos: creditosEntregado, cashToBank, delta, faltaCount, clientCount: clients.length }
  })

  const totals = rows.reduce(
    (acc, r) => ({
      cobranza: acc.cobranza + r.cobranza,
      comisiones: acc.comisiones + r.comisiones,
      creditos: acc.creditos + r.creditos,
      cashToBank: acc.cashToBank + r.cashToBank,
      delta: acc.delta + r.delta,
    }),
    { cobranza: 0, comisiones: 0, creditos: 0, cashToBank: 0, delta: 0 },
  )

  // Fold EFECTIVO extras into cobranza/delta — they enter the cash fund on confirm.
  // Bank extras don't affect the cash fund projection (they hit the bank directly).
  totals.cobranza += extrasCash
  totals.delta += extrasCash

  const deltaWithGastos = totals.delta - totalGastosCash
  const finalSistema = inicial != null ? inicial + deltaWithGastos : null

  const inicialPdf = localities[0]?.resumenInferior?.inicialCaja ?? null

  // PDF final uses original (non-edited) data so it stays fixed
  const originalGastosCash = (originalGastos || []).reduce(
    (sum, g) => sum + ((!g.sourceAccountType || g.sourceAccountType === 'EMPLOYEE_CASH_FUND') ? (g.monto || 0) : 0),
    0,
  )
  const deltaPdf = originalLocalities.reduce((sum, loc) => {
    const r = loc.resumenInferior
    if (!r) return sum
    const locCredits = loc.creditos || []
    const locCreditosEntregado = locCredits.reduce((s, c) => s + (c.entregado ?? c.monto ?? 0), 0)
    return sum + (r.cobranzaTotal ?? 0) - (r.comisionTotal ?? 0) - locCreditosEntregado - (r.cashToBank ?? 0)
  }, 0) - originalGastosCash + extrasCash
  const finalPdf = inicialPdf != null ? inicialPdf + deltaPdf : null

  const inicialMatch = inicialPdf != null && inicial != null
    ? Math.abs(inicialPdf - inicial) < 1 : null
  const inicialDiff = inicialPdf != null && inicial != null
    ? inicialPdf - inicial : null
  const finalMatch = finalPdf != null && finalSistema != null
    ? Math.abs(finalPdf - finalSistema) < 1 : null
  const finalDiff = finalPdf != null && finalSistema != null
    ? finalPdf - finalSistema : null

  // PDF rows from original (non-edited) data
  const pdfRows: LocalityCalc[] = originalLocalities.map(loc => {
    const r = loc.resumenInferior
    if (!r) return { localidad: loc.localidad, cobranza: 0, comisiones: 0, creditos: 0, cashToBank: 0, delta: 0, faltaCount: 0, clientCount: 0 }
    const creditosEntregado = (loc.creditos || []).reduce((s, c) => s + (c.entregado ?? c.monto ?? 0), 0)
    const cobranza = r.cobranzaTotal ?? 0
    const comisiones = r.comisionTotal ?? 0
    const cashToBank = r.cashToBank ?? 0
    return {
      localidad: loc.localidad,
      cobranza,
      comisiones,
      creditos: creditosEntregado,
      cashToBank,
      delta: cobranza - comisiones - creditosEntregado - cashToBank,
      faltaCount: 0,
      clientCount: 0,
    }
  })

  const pdfTotals = pdfRows.reduce(
    (acc, r) => ({
      cobranza: acc.cobranza + r.cobranza,
      comisiones: acc.comisiones + r.comisiones,
      creditos: acc.creditos + r.creditos,
      cashToBank: acc.cashToBank + r.cashToBank,
      delta: acc.delta + r.delta,
    }),
    { cobranza: 0, comisiones: 0, creditos: 0, cashToBank: 0, delta: 0 },
  )

  // Mirror extras into PDF totals so the sistema-vs-PDF delta stays cuadrable.
  // Extras don't exist in the OCR sheet, but since the operator explicitly
  // added them, they should participate in the reconciliation on both sides.
  pdfTotals.cobranza += extrasCash
  pdfTotals.delta += extrasCash

  return { inicial, inicialPdf, rows, totals, pdfRows, pdfTotals, totalGastosCash, originalGastosCash, deltaWithGastos, finalSistema, finalPdf, inicialMatch, inicialDiff, finalMatch, finalDiff, extrasCash, extrasBank }
}

export function CapturaResumenTotal({ jobId, localities: propLocalities, originalLocalities, cashFundBalance, gastos: propGastos, originalGastos }: Props) {
  const { editedResults } = useCapturaOcr()
  const editedResult = editedResults.get(jobId)
  const localities = editedResult?.localities || propLocalities
  const gastos = editedResult?.gastos || propGastos || []
  const extracobranzas = editedResult?.extracobranzas || []

  // Override: allows user to simulate a different inicial de caja
  const [inicialOverride, setInicialOverride] = useState<number | null>(null)
  const [isEditingInicial, setIsEditingInicial] = useState(false)
  const [editValue, setEditValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const hasOverride = inicialOverride != null
  const effectiveCashFundBalance = inicialOverride ?? cashFundBalance

  const calc = computeProjection(localities, originalLocalities, gastos, originalGastos || [], effectiveCashFundBalance, extracobranzas)

  const showBank = calc.totals.cashToBank > 0 || calc.pdfTotals.cashToBank > 0
  const colsPerSide = showBank ? 5 : 4 // Cobr, Com, Cred, [Banco], Delta

  const differs = (a: number, b: number) => Math.abs(a - b) >= 1
  const diffCellBg = 'bg-amber-100 dark:bg-amber-900/40'

  function Cell({ value, other, color, prefix, extra }: { value: number; other: number; color: string; prefix: string; extra?: string }) {
    const d = differs(value, other)
    return (
      <td className={cn('py-1.5 px-2 text-right tabular-nums text-xs', color, d && diffCellBg, extra)}>
        {value > 0 ? `${prefix}${formatCurrency(value)}` : '—'}
      </td>
    )
  }

  function DeltaCell({ value, other, extra }: { value: number; other: number; extra?: string }) {
    const d = differs(value, other)
    return (
      <td className={cn(
        'py-1.5 px-2 text-right tabular-nums text-xs font-semibold',
        value >= 0 ? 'text-green-600' : 'text-red-600',
        d && diffCellBg,
        extra,
      )}>
        {value >= 0 ? '+' : ''}{formatCurrency(value)}
      </td>
    )
  }

  function RowCells({ row, otherRow, isLast }: { row: LocalityCalc; otherRow: LocalityCalc; isLast?: boolean }) {
    return (
      <>
        <Cell value={row.cobranza} other={otherRow.cobranza} color="text-green-600" prefix="+" />
        <Cell value={row.comisiones} other={otherRow.comisiones} color="text-red-500" prefix="-" />
        <Cell value={row.creditos} other={otherRow.creditos} color="text-red-500" prefix="-" />
        {showBank && <Cell value={row.cashToBank} other={otherRow.cashToBank} color="text-blue-500" prefix="-" />}
        <DeltaCell value={row.delta} other={otherRow.delta} extra={isLast ? undefined : 'border-r'} />
      </>
    )
  }

  return (
    <div className="space-y-4 max-w-5xl">
      <Card>
        <CardHeader className="py-3 pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            Proyeccion de Caja
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-4">
          {/* Inicial: Sistema vs PDF */}
          <div className="grid grid-cols-2 gap-3">
            {/* Sistema Inicial — editable with override */}
            <div className={cn(
              'rounded-lg border p-3',
              hasOverride && 'border-amber-400 dark:border-amber-600 bg-amber-50/50 dark:bg-amber-950/20',
            )}>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                <Server className="h-3.5 w-3.5" />
                <span className="font-medium">Sistema</span>
              </div>
              <p className="text-[10px] text-muted-foreground mb-0.5">
                {hasOverride ? 'Inicial (simulado)' : 'Inicial (Caja actual)'}
              </p>

              {isEditingInicial ? (
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-sm font-bold">$</span>
                  <Input
                    ref={inputRef}
                    type="number"
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        const v = parseFloat(editValue)
                        if (!isNaN(v)) { setInicialOverride(v); setIsEditingInicial(false) }
                      } else if (e.key === 'Escape') {
                        setIsEditingInicial(false)
                      }
                    }}
                    className="h-7 text-sm tabular-nums w-28"
                    autoFocus
                  />
                  <button
                    onClick={() => {
                      const v = parseFloat(editValue)
                      if (!isNaN(v)) { setInicialOverride(v); setIsEditingInicial(false) }
                    }}
                    className="p-1 rounded hover:bg-muted"
                  >
                    <Check className="h-3.5 w-3.5 text-green-600" />
                  </button>
                  <button
                    onClick={() => setIsEditingInicial(false)}
                    className="p-1 rounded hover:bg-muted"
                  >
                    <X className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-1.5">
                    {calc.inicial != null ? (
                      <p className="tabular-nums font-bold text-base">{formatCurrency(calc.inicial)}</p>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">Sin datos</p>
                    )}
                    <button
                      onClick={() => {
                        setEditValue(hasOverride ? String(inicialOverride) : cashFundBalance != null ? String(cashFundBalance) : '')
                        setIsEditingInicial(true)
                      }}
                      className="p-1 rounded hover:bg-muted"
                      title="Editar inicial de caja"
                    >
                      <Pencil className="h-3 w-3 text-muted-foreground" />
                    </button>
                    {hasOverride && (
                      <button
                        onClick={() => { setInicialOverride(null); setIsEditingInicial(false) }}
                        className="p-1 rounded hover:bg-muted"
                        title="Restaurar valor real"
                      >
                        <X className="h-3 w-3 text-red-500" />
                      </button>
                    )}
                  </div>
                  {hasOverride && (
                    <>
                      <p className="text-[10px] text-muted-foreground line-through tabular-nums mt-0.5">
                        Real: {cashFundBalance != null ? formatCurrency(cashFundBalance) : 'Sin datos'}
                      </p>
                      <Badge variant="outline" className="mt-1 text-[10px] border-amber-400 text-amber-600 dark:text-amber-400">
                        <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />
                        Simulacion temporal
                      </Badge>
                    </>
                  )}
                </div>
              )}
            </div>
            <BalanceBox
              icon={<FileText className="h-3.5 w-3.5" />}
              label="PDF"
              sublabel="Inicial de Caja"
              value={calc.inicialPdf}
              emptyText="No detectado"
            />
          </div>
          {calc.inicialMatch != null && (
            <MatchBadge match={calc.inicialMatch} diff={calc.inicialDiff} label="Inicial" />
          )}

          {/* Tabla desglose por localidad: Sistema vs PDF */}
          <div className="border rounded-lg overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                {/* Level 1: group headers */}
                <tr className="border-b bg-muted/50">
                  <th rowSpan={2} className="text-left py-1.5 px-2 font-medium text-muted-foreground text-xs border-r">
                    Localidad
                  </th>
                  <th colSpan={colsPerSide} className="py-1.5 px-2 text-center text-xs font-semibold border-r bg-muted/30">
                    <span className="flex items-center justify-center gap-1">
                      <Server className="h-3 w-3" />
                      Sistema
                    </span>
                  </th>
                  <th colSpan={colsPerSide} className="py-1.5 px-2 text-center text-xs font-semibold bg-muted/30">
                    <span className="flex items-center justify-center gap-1">
                      <FileText className="h-3 w-3" />
                      PDF
                    </span>
                  </th>
                </tr>
                {/* Level 2: sub-columns */}
                <tr className="border-b bg-muted/40 text-[11px]">
                  <th className="text-right py-1 px-2 font-medium text-muted-foreground">Cobr</th>
                  <th className="text-right py-1 px-2 font-medium text-muted-foreground">Com</th>
                  <th className="text-right py-1 px-2 font-medium text-muted-foreground">Cred</th>
                  {showBank && <th className="text-right py-1 px-2 font-medium text-muted-foreground">Banco</th>}
                  <th className="text-right py-1 px-2 font-medium text-muted-foreground border-r">Delta</th>
                  <th className="text-right py-1 px-2 font-medium text-muted-foreground">Cobr</th>
                  <th className="text-right py-1 px-2 font-medium text-muted-foreground">Com</th>
                  <th className="text-right py-1 px-2 font-medium text-muted-foreground">Cred</th>
                  {showBank && <th className="text-right py-1 px-2 font-medium text-muted-foreground">Banco</th>}
                  <th className="text-right py-1 px-2 font-medium text-muted-foreground">Delta</th>
                </tr>
              </thead>
              <tbody>
                {calc.rows.map((row, i) => {
                  const pdfRow = calc.pdfRows[i] || { localidad: row.localidad, cobranza: 0, comisiones: 0, creditos: 0, cashToBank: 0, delta: 0, faltaCount: 0, clientCount: 0 }
                  const rowHasDiff = differs(row.cobranza, pdfRow.cobranza) || differs(row.comisiones, pdfRow.comisiones) || differs(row.creditos, pdfRow.creditos) || differs(row.delta, pdfRow.delta)
                  const deltaDiff = row.delta - pdfRow.delta
                  return (
                    <tr key={row.localidad} className={cn(
                      'border-b last:border-b-0',
                      rowHasDiff && 'border-l-4 border-l-amber-500 bg-amber-50/50 dark:bg-amber-950/20',
                    )}>
                      <td className="py-1.5 px-2 font-medium text-xs border-r">
                        <div className="flex items-center gap-1">
                          {rowHasDiff && <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0" />}
                          <span>{row.localidad}</span>
                        </div>
                        {rowHasDiff && (
                          <span className={cn(
                            'text-[10px] font-semibold tabular-nums',
                            deltaDiff > 0 ? 'text-green-600' : deltaDiff < 0 ? 'text-red-600' : 'text-amber-600',
                          )}>
                            {deltaDiff > 0 ? '+' : ''}{formatCurrency(deltaDiff)} vs PDF
                          </span>
                        )}
                      </td>
                      <RowCells row={row} otherRow={pdfRow} isLast={false} />
                      <RowCells row={pdfRow} otherRow={row} isLast />
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                {(() => {
                  const totalHasDiff = differs(calc.totals.delta, calc.pdfTotals.delta)
                  const totalDeltaDiff = calc.totals.delta - calc.pdfTotals.delta
                  return (
                    <tr className={cn(
                      'border-t-2 font-semibold text-xs',
                      totalHasDiff ? 'bg-amber-100/60 dark:bg-amber-950/30' : 'bg-muted/30',
                    )}>
                      <td className="py-1.5 px-2 border-r">
                        <div className="flex items-center gap-1">
                          {totalHasDiff && <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0" />}
                          TOTAL
                        </div>
                        {totalHasDiff && (
                          <span className={cn(
                            'text-[10px] font-semibold tabular-nums',
                            totalDeltaDiff > 0 ? 'text-green-600' : 'text-red-600',
                          )}>
                            {totalDeltaDiff > 0 ? '+' : ''}{formatCurrency(totalDeltaDiff)} vs PDF
                          </span>
                        )}
                      </td>
                      <RowCells row={calc.totals as LocalityCalc} otherRow={calc.pdfTotals as LocalityCalc} isLast={false} />
                      <RowCells row={calc.pdfTotals as LocalityCalc} otherRow={calc.totals as LocalityCalc} isLast />
                    </tr>
                  )
                })()}
                {(calc.totalGastosCash > 0 || calc.originalGastosCash > 0) && (
                  <tr className="bg-muted/20 text-xs">
                    <td className="py-1.5 px-2 font-medium text-muted-foreground border-r">Gastos (efectivo)</td>
                    {/* Sistema: empty cols + delta */}
                    <td colSpan={colsPerSide - 1} />
                    <td className={cn(
                      'py-1.5 px-2 text-right tabular-nums text-red-500 font-semibold border-r',
                      differs(calc.totalGastosCash, calc.originalGastosCash) && diffCellBg,
                    )}>
                      {calc.totalGastosCash > 0 ? `-${formatCurrency(calc.totalGastosCash)}` : '—'}
                    </td>
                    {/* PDF: empty cols + delta */}
                    <td colSpan={colsPerSide - 1} />
                    <td className={cn(
                      'py-1.5 px-2 text-right tabular-nums text-red-500 font-semibold',
                      differs(calc.totalGastosCash, calc.originalGastosCash) && diffCellBg,
                    )}>
                      {calc.originalGastosCash > 0 ? `-${formatCurrency(calc.originalGastosCash)}` : '—'}
                    </td>
                  </tr>
                )}
              </tfoot>
            </table>
          </div>

          {/* Final: Sistema vs PDF */}
          <div className="grid grid-cols-2 gap-3">
            {hasOverride ? (
              <div className={cn(
                'rounded-lg border p-3 bg-muted/40',
                'border-amber-400 dark:border-amber-600',
              )}>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                  <Server className="h-3.5 w-3.5" />
                  <span className="font-medium">Sistema</span>
                </div>
                <p className="text-[10px] text-muted-foreground mb-0.5">Final esperado (simulado)</p>
                {calc.finalSistema != null ? (
                  <p className="tabular-nums font-bold text-lg">{formatCurrency(calc.finalSistema)}</p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">Sin datos</p>
                )}
                <Badge variant="outline" className="mt-1 text-[10px] border-amber-400 text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />
                  Simulacion
                </Badge>
              </div>
            ) : (
              <BalanceBox
                icon={<Server className="h-3.5 w-3.5" />}
                label="Sistema"
                sublabel="Final esperado"
                value={calc.finalSistema}
                emptyText="Sin datos"
                highlight
              />
            )}
            <BalanceBox
              icon={<FileText className="h-3.5 w-3.5" />}
              label="PDF"
              sublabel="Final esperado"
              value={calc.finalPdf}
              emptyText="Sin inicial"
            />
          </div>
          {calc.finalMatch != null && (
            <MatchBadge match={calc.finalMatch} diff={calc.finalDiff} label="Final" />
          )}
          {calc.inicial != null && calc.finalSistema != null && (
            <p className="text-xs text-muted-foreground text-right tabular-nums">
              Sistema: {formatCurrency(calc.inicial)} {calc.deltaWithGastos >= 0 ? '+' : ''} ({formatCurrency(calc.deltaWithGastos)}) = {formatCurrency(calc.finalSistema)}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
