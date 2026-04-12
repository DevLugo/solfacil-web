'use client'

import { useState } from 'react'
import { ChevronRight } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { formatCurrency, cn } from '@/lib/utils'

import { useCapturaOcr } from './captura-ocr-context'
import type { CapturaLocalityResult } from './types'

interface Props {
  jobId: string
  locality: CapturaLocalityResult
}

export function CapturaResumenEditor({ jobId, locality }: Props) {
  const { updateResumen } = useCapturaOcr()
  const resumen = locality.resumenInferior
  const [isOpen, setIsOpen] = useState(false)
  if (!resumen) return null

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="py-3 cursor-pointer hover:bg-muted/50 transition-colors select-none">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ChevronRight className={cn("h-4 w-4 text-muted-foreground transition-transform", isOpen && "rotate-90")} />
                <CardTitle className="text-sm font-medium">Resumen Inferior</CardTitle>
              </div>
              <Badge variant="secondary" className="text-xs font-mono tabular-nums">
                Total: {formatCurrency(resumen.cobranzaTotal)}
              </Badge>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <Field
            label="Cobranza Base"
            value={resumen.cobranzaBase}
            onChange={(v) => updateResumen(jobId, locality.localidad, { cobranzaBase: v })}
          />
          <Field
            label="Cobranza Total"
            value={resumen.cobranzaTotal}
            onChange={(v) => updateResumen(jobId, locality.localidad, { cobranzaTotal: v })}
          />
          <Field
            label="Tarifa Comision"
            value={resumen.tarifaComision}
            onChange={(v) => updateResumen(jobId, locality.localidad, { tarifaComision: v })}
          />
          <Field
            label="Comision Regular"
            value={resumen.comisionRegular.total}
            onChange={(v) => updateResumen(jobId, locality.localidad, {
              comisionRegular: { ...resumen.comisionRegular, total: v },
            })}
          />
          <Field
            label="Comision Creditos"
            value={resumen.comisionCreditos.total}
            onChange={(v) => updateResumen(jobId, locality.localidad, {
              comisionCreditos: { ...resumen.comisionCreditos, total: v },
            })}
          />
          <Field
            label="Comision Total"
            value={resumen.comisionTotal}
            onChange={(v) => updateResumen(jobId, locality.localidad, { comisionTotal: v })}
          />
          <Field
            label="Cash to Bank"
            value={resumen.cashToBank || 0}
            onChange={(v) => updateResumen(jobId, locality.localidad, { cashToBank: v })}
          />
        </div>

        {resumen.adelantosCreditos.length > 0 && (
          <div className="mt-4">
            <h4 className="text-xs font-medium text-muted-foreground mb-2">Adelantos a Credito</h4>
            <div className="space-y-1">
              {resumen.adelantosCreditos.map((a, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">{a.nombre || `Adelanto ${i + 1}`}:</span>
                  <span className="font-medium tabular-nums">{formatCurrency(a.monto)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {resumen.recuperados.length > 0 && (
          <div className="mt-4">
            <h4 className="text-xs font-medium text-muted-foreground mb-2">Recuperados</h4>
            <div className="space-y-1">
              {resumen.recuperados.map((r, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">
                    {r.nombre || 'Recuperado'} {r.codigo ? `(${r.codigo})` : ''}:
                  </span>
                  <span className="font-medium tabular-nums">{formatCurrency(r.monto)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div>
      <label className="text-xs text-muted-foreground">{label}</label>
      <Input
        type="number"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="h-8 text-sm tabular-nums"
      />
    </div>
  )
}
