'use client'

import { useMemo } from 'react'
import { ArrowDown, ArrowUp, Banknote, TrendingUp } from 'lucide-react'
import { formatCurrency, cn } from '@/lib/utils'
import type { CapturaLocalityResult } from './types'

interface Props {
  locality: CapturaLocalityResult
}

export function CapturaLocalitySummary({ locality }: Props) {
  const calc = useMemo(() => {
    const r = locality.resumenInferior
    const credits = locality.creditos || []

    // Abonos = cobranzaTotal + primer pago cobranza
    const primerPagoCobranza = credits.reduce(
      (s, c) => s + (c.primerPago ? (c.primerPagoMonto ?? 0) : 0), 0
    )
    const abonos = (r?.cobranzaTotal ?? 0) + primerPagoCobranza

    // Colocado = sum of entregado (or monto)
    const colocado = credits.reduce(
      (s, c) => s + (c.entregado ?? c.monto ?? 0), 0
    )

    // Comisiones = comision abonos + comision credito otorgado + primer pago comision
    const primerPagoComision = credits.reduce(
      (s, c) => s + (c.primerPago ? (c.primerPagoComision ?? 0) : 0), 0
    )
    const comisionCreditos = credits.reduce(
      (s, c) => s + (c.comisionCredito ?? 0), 0
    )
    const comisiones = (r?.comisionTotal ?? 0) + primerPagoComision + comisionCreditos

    const cashToBank = r?.cashToBank ?? 0
    const delta = abonos - comisiones - colocado - cashToBank

    return { abonos, colocado, comisiones, cashToBank, delta }
  }, [locality.resumenInferior, locality.creditos])

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <MetricCard
        icon={<ArrowDown className="h-4 w-4 text-green-600" />}
        label="Abonos"
        value={calc.abonos}
        color="text-green-600"
        prefix="+"
      />
      <MetricCard
        icon={<Banknote className="h-4 w-4 text-orange-600" />}
        label="Colocado"
        value={calc.colocado}
        color="text-orange-600"
        prefix="-"
      />
      <MetricCard
        icon={<ArrowUp className="h-4 w-4 text-red-500" />}
        label="Comisiones"
        value={calc.comisiones}
        color="text-red-500"
        prefix="-"
      />
      <MetricCard
        icon={<TrendingUp className="h-4 w-4" />}
        label="Delta"
        value={calc.delta}
        color={calc.delta >= 0 ? 'text-green-600' : 'text-red-600'}
        prefix={calc.delta >= 0 ? '+' : ''}
        bold
      />
    </div>
  )
}

function MetricCard({
  icon,
  label,
  value,
  color,
  prefix,
  bold,
}: {
  icon: React.ReactNode
  label: string
  value: number
  color: string
  prefix?: string
  bold?: boolean
}) {
  return (
    <div className="rounded-lg border p-3 bg-card">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
        {icon}
        <span className="font-medium">{label}</span>
      </div>
      <p className={cn('tabular-nums text-lg', color, bold && 'font-bold')}>
        {prefix}{formatCurrency(value)}
      </p>
    </div>
  )
}
