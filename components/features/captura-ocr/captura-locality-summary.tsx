'use client'

import { useMemo } from 'react'
import { AlertTriangle, ArrowDown, ArrowUp, Banknote, TrendingUp } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
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

    // Comisiones = comision abonos (live from excepciones) + primer pago comision
    // Single source of truth: excepciones[i].comision (what backend persists).
    const primerPagoComision = credits.reduce(
      (s, c) => s + (c.primerPago ? (c.primerPagoComision ?? 0) : 0), 0
    )
    // Paridad con captura-payments-table: ignora excepciones huerfanas de
    // loans filtrados (FINISHED/RENOVATED). Sin este guard, comisiones se
    // inflaban sumando excepciones persistidas de clientes que ya no se
    // muestran en la tabla de abonos.
    const validPos = new Set(
      (locality.clientsList || [])
        .filter(c => c.loanStatus !== 'FINISHED' && c.loanStatus !== 'RENOVATED')
        .map(c => c.pos)
    )
    const comisionFromClients = (locality.excepciones || [])
      .filter(e => e.marca !== 'FALTA' && validPos.has(e.pos))
      .reduce((s, e) => s + (e.comision || 0), 0)
    const comisiones = comisionFromClients + primerPagoComision

    const cashToBank = r?.cashToBank ?? 0
    const delta = abonos - comisiones - colocado - cashToBank

    // Si el OCR no logro leer el total manuscrito de comision, marcamos el
    // card para que el usuario sepa que el numero viene del calculo (no del
    // lapiz). Usamos === false para no alertar en jobs legacy donde el campo
    // no existe.
    const comisionGlobalMissing = r?.comisionGlobalDetectado === false

    return { abonos, colocado, comisiones, cashToBank, delta, comisionGlobalMissing }
  }, [locality.resumenInferior, locality.creditos, locality.excepciones, locality.clientsList])

  return (
    <TooltipProvider>
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
          badge={
            calc.comisionGlobalMissing ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                </TooltipTrigger>
                <TooltipContent>
                  Total manuscrito no detectado. Se usa cálculo automático.
                </TooltipContent>
              </Tooltip>
            ) : null
          }
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
    </TooltipProvider>
  )
}

function MetricCard({
  icon,
  label,
  value,
  color,
  prefix,
  bold,
  badge,
}: {
  icon: React.ReactNode
  label: string
  value: number
  color: string
  prefix?: string
  bold?: boolean
  badge?: React.ReactNode
}) {
  return (
    <div className="rounded-lg border p-3 bg-card">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
        {icon}
        <span className="font-medium">{label}</span>
        {badge ? <span className="ml-auto">{badge}</span> : null}
      </div>
      <p className={cn('tabular-nums text-lg', color, bold && 'font-bold')}>
        {prefix}{formatCurrency(value)}
      </p>
    </div>
  )
}
