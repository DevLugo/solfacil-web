'use client'

import { useMemo } from 'react'
import { AlertTriangle, CheckCircle2, Wallet, ArrowDown, ArrowUp, Equal, Server, FileText } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency, cn } from '@/lib/utils'
import type { CapturaLocalityResult } from './types'

interface Props {
  locality: CapturaLocalityResult
  cashFundBalance?: number
}

export function CapturaResumenCaja({ locality, cashFundBalance }: Props) {
  const resumen = locality.resumenInferior

  const calc = useMemo(() => {
    const inicialPdf = resumen?.inicialCaja ?? null
    const inicialSistema = cashFundBalance != null ? Number(cashFundBalance) : null

    // Movimientos del dia (from PDF)
    const cobranzaTotal = resumen?.cobranzaTotal ?? 0
    const comisionTotal = resumen?.comisionTotal ?? 0
    const creditosEntregado = (locality.creditos || []).reduce(
      (sum, c) => sum + (c.entregado ?? c.monto ?? 0), 0
    )
    const cashToBank = resumen?.cashToBank ?? 0

    // Delta del dia (net cash flow)
    const deltaEfectivo = cobranzaTotal - comisionTotal - creditosEntregado - cashToBank

    // Finals
    const finalSistema = inicialSistema != null ? inicialSistema + deltaEfectivo : null
    const finalPdf = inicialPdf != null ? inicialPdf + deltaEfectivo : null

    // Comparisons
    const inicialMatch = inicialPdf != null && inicialSistema != null
      ? Math.abs(inicialPdf - inicialSistema) < 1
      : null
    const inicialDiff = inicialPdf != null && inicialSistema != null
      ? inicialPdf - inicialSistema
      : null
    const finalMatch = finalPdf != null && finalSistema != null
      ? Math.abs(finalPdf - finalSistema) < 1
      : null
    const finalDiff = finalPdf != null && finalSistema != null
      ? finalPdf - finalSistema
      : null

    return {
      inicialPdf,
      inicialSistema,
      cobranzaTotal,
      comisionTotal,
      creditosEntregado,
      cashToBank,
      deltaEfectivo,
      finalSistema,
      finalPdf,
      inicialMatch,
      inicialDiff,
      finalMatch,
      finalDiff,
    }
  }, [resumen, locality.creditos, cashFundBalance])

  const hasMismatch = calc.inicialMatch === false || calc.finalMatch === false

  return (
    <Card className={cn(hasMismatch && 'border-red-400 dark:border-red-600')}>
      <CardHeader className="py-3 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Wallet className="h-4 w-4" />
          Resumen de Caja (Efectivo)
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {/* === INICIAL ROW: 2 columns === */}
        <div className="grid grid-cols-2 gap-3">
          <BalanceBox
            icon={<Server className="h-3.5 w-3.5" />}
            label="Sistema"
            sublabel="Inicial (Caja actual)"
            value={calc.inicialSistema}
            emptyText="Sin datos"
          />
          <BalanceBox
            icon={<FileText className="h-3.5 w-3.5" />}
            label="PDF"
            sublabel="Inicial de Caja"
            value={calc.inicialPdf}
            emptyText="No detectado"
          />
        </div>

        {/* Match/mismatch badge for inicial */}
        {calc.inicialMatch != null && (
          <MatchBadge match={calc.inicialMatch} diff={calc.inicialDiff} label="Inicial" />
        )}

        {/* === MOVIMIENTOS DEL DIA (shared) === */}
        <div className="border rounded-lg px-4 py-2 space-y-0">
          <p className="text-xs font-medium text-muted-foreground mb-1">Movimientos del dia</p>
          <FlowRow
            icon={<ArrowDown className="h-3.5 w-3.5 text-green-600" />}
            label="Cobranza"
            value={calc.cobranzaTotal}
            positive
          />
          <FlowRow
            icon={<ArrowUp className="h-3.5 w-3.5 text-red-500" />}
            label="Comisiones"
            value={calc.comisionTotal}
          />
          {calc.creditosEntregado > 0 && (
            <FlowRow
              icon={<ArrowUp className="h-3.5 w-3.5 text-red-500" />}
              label="Creditos (entregado)"
              value={calc.creditosEntregado}
            />
          )}
          {calc.cashToBank > 0 && (
            <FlowRow
              icon={<ArrowUp className="h-3.5 w-3.5 text-blue-500" />}
              label="Cash a Banco"
              value={calc.cashToBank}
            />
          )}
          <div className="flex items-center justify-between py-1.5 border-t mt-1 pt-1.5">
            <span className="flex items-center gap-2 font-medium text-muted-foreground text-sm">
              <Equal className="h-3.5 w-3.5" />
              Delta del dia
            </span>
            <span className={cn(
              'font-bold tabular-nums text-sm',
              calc.deltaEfectivo >= 0 ? 'text-green-600' : 'text-red-600',
            )}>
              {calc.deltaEfectivo >= 0 ? '+' : ''}{formatCurrency(calc.deltaEfectivo)}
            </span>
          </div>
        </div>

        {/* === FINAL ROW: 2 columns === */}
        <div className="grid grid-cols-2 gap-3">
          <BalanceBox
            icon={<Server className="h-3.5 w-3.5" />}
            label="Sistema"
            sublabel="Final esperado"
            value={calc.finalSistema}
            emptyText="Sin datos"
            highlight
          />
          <BalanceBox
            icon={<FileText className="h-3.5 w-3.5" />}
            label="PDF"
            sublabel="Final esperado"
            value={calc.finalPdf}
            emptyText="Sin inicial"
          />
        </div>

        {/* Match/mismatch badge for final */}
        {calc.finalMatch != null && (
          <MatchBadge match={calc.finalMatch} diff={calc.finalDiff} label="Final" />
        )}

        {/* Warnings */}
        {calc.inicialSistema == null && (
          <div className="flex items-center gap-2 p-2.5 rounded-lg border border-dashed text-xs text-muted-foreground">
            <Server className="h-4 w-4 shrink-0" />
            Sin datos de caja del sistema (EMPLOYEE_CASH_FUND)
          </div>
        )}
        {calc.inicialPdf == null && (
          <div className="flex items-center gap-2 p-2.5 rounded-lg border border-yellow-300 bg-yellow-50 dark:bg-yellow-950/30 dark:border-yellow-800">
            <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 shrink-0" />
            <p className="text-xs text-yellow-700 dark:text-yellow-400">
              Inicial de caja no detectado en el PDF. Verifica manualmente.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function BalanceBox({
  icon,
  label,
  sublabel,
  value,
  emptyText,
  highlight,
}: {
  icon: React.ReactNode
  label: string
  sublabel: string
  value: number | null
  emptyText: string
  highlight?: boolean
}) {
  return (
    <div className={cn(
      'rounded-lg border p-3',
      highlight && 'bg-muted/40',
    )}>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
        {icon}
        <span className="font-medium">{label}</span>
      </div>
      <p className="text-[10px] text-muted-foreground mb-0.5">{sublabel}</p>
      {value != null ? (
        <p className={cn(
          'tabular-nums font-bold',
          highlight ? 'text-lg' : 'text-base',
        )}>
          {formatCurrency(value)}
        </p>
      ) : (
        <p className="text-sm text-muted-foreground italic">{emptyText}</p>
      )}
    </div>
  )
}

export function MatchBadge({
  match,
  diff,
  label,
}: {
  match: boolean
  diff: number | null
  label: string
}) {
  if (match) {
    return (
      <div className="flex items-center justify-center gap-1.5 text-green-600 dark:text-green-400">
        <CheckCircle2 className="h-4 w-4" />
        <span className="text-xs font-medium">{label}: coincide</span>
      </div>
    )
  }
  return (
    <div className="flex items-center justify-center gap-1.5 text-red-600 dark:text-red-400">
      <AlertTriangle className="h-4 w-4" />
      <span className="text-xs font-semibold">
        {label}: no coincide
        {diff != null && (
          <span className="ml-1 tabular-nums">
            ({diff >= 0 ? '+' : ''}{formatCurrency(diff)})
          </span>
        )}
      </span>
    </div>
  )
}

function FlowRow({
  icon,
  label,
  value,
  positive,
}: {
  icon: React.ReactNode
  label: string
  value: number
  positive?: boolean
}) {
  if (value === 0) return null
  return (
    <div className="flex items-center justify-between py-1">
      <span className="flex items-center gap-2 text-muted-foreground text-sm">
        {icon}
        {label}
      </span>
      <span className={cn(
        'tabular-nums font-medium text-sm',
        positive ? 'text-green-600' : 'text-red-500',
      )}>
        {positive ? '+' : '-'}{formatCurrency(value)}
      </span>
    </div>
  )
}
