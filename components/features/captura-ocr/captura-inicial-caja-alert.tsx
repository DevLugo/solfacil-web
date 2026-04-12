'use client'

import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils'

interface Props {
  pdfInicial: number | null
  systemBalance: number | null
  localityName: string
}

export function CapturaInicialCajaAlert({ pdfInicial, systemBalance }: Props) {
  // Not detected in PDF
  if (pdfInicial == null) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-lg border border-yellow-300 bg-yellow-50 dark:bg-yellow-950/30 dark:border-yellow-800">
        <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 shrink-0" />
        <div>
          <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
            Inicial de caja no detectado en el PDF
          </p>
          <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-0.5">
            Verifica manualmente el monto inicial con el listado fisico
          </p>
        </div>
      </div>
    )
  }

  // No system data to compare
  if (systemBalance == null) {
    return (
      <div className="flex items-center gap-4 p-3 rounded-lg border border-slate-200 bg-slate-50 dark:bg-slate-900/30 dark:border-slate-700">
        <div>
          <span className="text-xs text-muted-foreground">Inicial de Caja (PDF)</span>
          <p className="text-lg font-bold tabular-nums">{formatCurrency(pdfInicial)}</p>
        </div>
        <Badge variant="outline" className="text-xs text-muted-foreground">
          Sin datos de sistema para comparar
        </Badge>
      </div>
    )
  }

  const diff = pdfInicial - systemBalance
  const isMatch = Math.abs(diff) < 1

  // Match - subtle green
  if (isMatch) {
    return (
      <div className="flex items-center gap-4 p-3 rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/30 dark:border-green-800">
        <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400 shrink-0" />
        <div className="flex items-center gap-6">
          <div>
            <span className="text-xs text-muted-foreground">Inicial de Caja</span>
            <p className="text-lg font-bold tabular-nums text-green-700 dark:text-green-300">
              {formatCurrency(pdfInicial)}
            </p>
          </div>
          <Badge className="bg-green-600 text-white text-xs">Coincide con Sistema</Badge>
        </div>
      </div>
    )
  }

  // MISMATCH - large, impossible to miss
  return (
    <div className="relative flex flex-col gap-4 p-6 rounded-xl border-4 border-red-500 bg-gradient-to-r from-red-100 to-red-50 dark:from-red-950/70 dark:to-red-950/50 dark:border-red-600 shadow-lg shadow-red-200 dark:shadow-red-900/30">
      {/* Pulsing corner indicator */}
      <div className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-red-500 animate-ping" />
      <div className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-red-600 flex items-center justify-center">
        <span className="text-white text-xs font-bold">!</span>
      </div>

      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-full bg-red-500 text-white shadow-md">
          <AlertTriangle className="h-8 w-8" />
        </div>
        <div>
          <h3 className="text-2xl font-black text-red-800 dark:text-red-200 tracking-tight">
            INICIAL DE CAJA NO COINCIDE
          </h3>
          <p className="text-sm text-red-700 dark:text-red-300 mt-0.5">
            Verificar con el lider antes de continuar
          </p>
        </div>
      </div>

      {/* Comparison grid */}
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center p-4 rounded-xl bg-white/90 dark:bg-slate-900/70 border-2 border-red-300 dark:border-red-700">
          <p className="text-xs uppercase tracking-widest text-red-600 dark:text-red-400 font-semibold mb-2">
            PDF (Listado)
          </p>
          <p className="text-3xl font-black tabular-nums text-red-700 dark:text-red-300">
            {formatCurrency(pdfInicial)}
          </p>
        </div>

        <div className="text-center p-4 rounded-xl bg-white/90 dark:bg-slate-900/70 border-2 border-slate-300 dark:border-slate-600">
          <p className="text-xs uppercase tracking-widest text-slate-600 dark:text-slate-400 font-semibold mb-2">
            Sistema
          </p>
          <p className="text-3xl font-black tabular-nums text-slate-700 dark:text-slate-300">
            {formatCurrency(systemBalance)}
          </p>
        </div>

        <div className="text-center p-4 rounded-xl bg-red-600 dark:bg-red-700 text-white shadow-inner">
          <p className="text-xs uppercase tracking-widest opacity-80 font-semibold mb-2">
            Diferencia
          </p>
          <p className="text-3xl font-black tabular-nums">
            {diff >= 0 ? '+' : ''}{formatCurrency(Math.abs(diff))}
          </p>
        </div>
      </div>
    </div>
  )
}
