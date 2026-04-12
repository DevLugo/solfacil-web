'use client'

import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { formatCurrency, cn } from '@/lib/utils'
import type { CapturaLocalityResult } from './types'

interface Props {
  locality: CapturaLocalityResult
  systemLocality?: { [key: string]: unknown }
}

export function CapturaComparisonPanel({ locality, systemLocality }: Props) {
  const resumen = locality.resumenInferior
  if (!resumen) return null

  const sys = systemLocality as {
    totalPayments?: number
    cashPayments?: number
    bankPayments?: number
    totalCommissions?: number
    totalPaymentCommissions?: number
    totalLoansGrantedCommissions?: number
    totalExpenses?: number
    totalLoansGranted?: number
    loansGrantedCount?: number
    paymentCount?: number
    balanceEfectivo?: number
    balanceBanco?: number
    balance?: number
    leaderCashToBank?: number
    bankPaymentsFromClients?: number
  } | undefined

  const ocrCobranza = resumen.cobranzaTotal
  const ocrComision = resumen.comisionTotal
  const ocrCreditos = locality.creditos?.reduce((sum, c) => sum + (c.monto || 0), 0) || 0
  const ocrCreditosCount = locality.creditos?.length || 0
  const ocrCashToBank = resumen.cashToBank || 0

  const rows: ComparisonRow[] = [
    {
      label: 'Cobranza Total',
      pdfValue: ocrCobranza,
      sysValue: sys?.totalPayments,
      format: 'currency',
      critical: true,
    },
    {
      label: 'Comision Total',
      pdfValue: ocrComision,
      sysValue: sys?.totalCommissions,
      format: 'currency',
    },
    {
      label: 'Creditos Otorgados',
      pdfValue: ocrCreditos,
      sysValue: sys?.totalLoansGranted,
      format: 'currency',
    },
    {
      label: 'Num. Creditos',
      pdfValue: ocrCreditosCount,
      sysValue: sys?.loansGrantedCount,
      format: 'number',
    },
    {
      label: 'Cash to Bank',
      pdfValue: ocrCashToBank,
      sysValue: sys?.leaderCashToBank,
      format: 'currency',
    },
  ]

  const mismatches = rows.filter(r => r.sysValue != null && !isMatch(r.pdfValue, r.sysValue))
  const hasCriticalMismatch = mismatches.some(r => r.critical)
  const allMatch = mismatches.length === 0 && sys != null

  return (
    <div className="space-y-3">
      {/* Warning banner */}
      {hasCriticalMismatch && (
        <div className="flex items-start gap-3 rounded-lg border border-red-300 bg-red-50 dark:bg-red-950/30 dark:border-red-800 p-4">
          <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-800 dark:text-red-300">Discrepancia en montos criticos</p>
            <p className="text-sm text-red-700 dark:text-red-400 mt-1">
              Los montos del PDF no coinciden con el sistema. Verifica antes de continuar.
              {mismatches.map(m => (
                <span key={m.label} className="block mt-1">
                  <strong>{m.label}</strong>: PDF {fmtVal(m.pdfValue, m.format)} vs Sistema {fmtVal(m.sysValue!, m.format)}
                  {' '}(dif: {fmtVal(Math.abs(m.pdfValue - (m.sysValue as number)), m.format)})
                </span>
              ))}
            </p>
          </div>
        </div>
      )}

      {!hasCriticalMismatch && mismatches.length > 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-yellow-300 bg-yellow-50 dark:bg-yellow-950/30 dark:border-yellow-800 p-4">
          <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-yellow-800 dark:text-yellow-300">Diferencias detectadas</p>
            <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
              {mismatches.map(m => (
                <span key={m.label} className="block mt-1">
                  <strong>{m.label}</strong>: PDF {fmtVal(m.pdfValue, m.format)} vs Sistema {fmtVal(m.sysValue!, m.format)}
                </span>
              ))}
            </p>
          </div>
        </div>
      )}

      {allMatch && (
        <div className="flex items-center gap-3 rounded-lg border border-green-300 bg-green-50 dark:bg-green-950/30 dark:border-green-800 p-3">
          <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0" />
          <p className="text-sm font-medium text-green-800 dark:text-green-300">Todos los montos coinciden con el sistema</p>
        </div>
      )}

      {/* Comparison table */}
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left py-2.5 px-4 font-medium text-muted-foreground">Concepto</th>
                <th className="text-right py-2.5 px-4 font-medium text-muted-foreground">PDF (OCR)</th>
                <th className="text-right py-2.5 px-4 font-medium text-muted-foreground">Sistema</th>
                <th className="text-right py-2.5 px-4 font-medium text-muted-foreground">Diferencia</th>
                <th className="text-center py-2.5 px-4 font-medium text-muted-foreground w-[60px]"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const match = row.sysValue == null || isMatch(row.pdfValue, row.sysValue)
                const diff = row.sysValue != null ? row.pdfValue - (row.sysValue as number) : null
                return (
                  <tr
                    key={row.label}
                    className={cn(
                      'border-b last:border-0',
                      !match && row.critical && 'bg-red-50/50 dark:bg-red-950/20',
                      !match && !row.critical && 'bg-yellow-50/50 dark:bg-yellow-950/20',
                    )}
                  >
                    <td className="py-2.5 px-4 font-medium">{row.label}</td>
                    <td className="py-2.5 px-4 text-right tabular-nums font-semibold">
                      {fmtVal(row.pdfValue, row.format)}
                    </td>
                    <td className="py-2.5 px-4 text-right tabular-nums text-muted-foreground">
                      {row.sysValue != null ? fmtVal(row.sysValue as number, row.format) : '—'}
                    </td>
                    <td className={cn(
                      'py-2.5 px-4 text-right tabular-nums',
                      diff != null && !match && diff > 0 && 'text-red-600 dark:text-red-400 font-semibold',
                      diff != null && !match && diff < 0 && 'text-red-600 dark:text-red-400 font-semibold',
                      diff != null && match && 'text-green-600 dark:text-green-400',
                    )}>
                      {diff != null ? (
                        `${diff >= 0 ? '+' : ''}${fmtVal(diff, row.format)}`
                      ) : '—'}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      {row.sysValue != null && (
                        match
                          ? <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 inline" />
                          : <AlertTriangle className="h-4 w-4 text-red-500 inline" />
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* System balances if available */}
      {sys && (
        <div className="grid grid-cols-3 gap-3">
          <MiniCard label="Balance Efectivo" value={formatCurrency(sys.balanceEfectivo || 0)} />
          <MiniCard label="Balance Banco" value={formatCurrency(sys.balanceBanco || 0)} />
          <MiniCard label="Balance Total" value={formatCurrency(sys.balance || 0)} />
        </div>
      )}

      {!sys && (
        <div className="rounded-lg border border-dashed p-3 text-center text-sm text-muted-foreground">
          Sin datos del sistema para esta localidad — no se puede comparar
        </div>
      )}
    </div>
  )
}

interface ComparisonRow {
  label: string
  pdfValue: number
  sysValue?: number | null
  format: 'currency' | 'number'
  critical?: boolean
}

function isMatch(a: number, b: number | null | undefined): boolean {
  if (b == null) return true
  return Math.abs(a - b) < 1
}

function fmtVal(value: number, format: 'currency' | 'number'): string {
  if (format === 'currency') return formatCurrency(value)
  return String(value)
}

function MiniCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/30 p-3 text-center">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold tabular-nums mt-1">{value}</p>
    </div>
  )
}
