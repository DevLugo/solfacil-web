'use client'

import { useState } from 'react'
import { ChevronRight, RotateCcw } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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

  // Unified commission: OCR default = abonos + creditos (from OCR).
  // Primer pago commission stays separate (different concept) and is shown
  // read-only so the operator sees the total projection.
  const ocrComisionAbonos = resumen.comisionRegular?.total ?? 0
  const ocrComisionCreditos = resumen.comisionCreditos?.total ?? 0
  const ocrComisionSum = ocrComisionAbonos + ocrComisionCreditos
  const hasOverride = resumen.comisionOverride != null
  const comisionValue = hasOverride ? (resumen.comisionOverride as number) : ocrComisionSum

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
          <div className="md:col-span-2">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-muted-foreground">
                Comision (abonos + creditos)
                {hasOverride && (
                  <Badge variant="outline" className="ml-2 text-[10px] border-amber-400 text-amber-600 dark:text-amber-400">
                    override
                  </Badge>
                )}
              </label>
              {hasOverride && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-5 px-1.5 text-[10px] gap-1"
                  onClick={() => updateResumen(jobId, locality.localidad, { comisionOverride: null })}
                  title={`Restaurar al valor OCR: ${formatCurrency(ocrComisionSum)}`}
                >
                  <RotateCcw className="h-3 w-3" />
                  OCR
                </Button>
              )}
            </div>
            <Input
              type="number"
              value={comisionValue}
              onChange={(e) => {
                const parsed = parseFloat(e.target.value)
                const v = isNaN(parsed) ? 0 : parsed
                updateResumen(jobId, locality.localidad, { comisionOverride: v })
              }}
              className={cn(
                'h-8 text-sm tabular-nums',
                hasOverride && 'border-amber-400 dark:border-amber-600',
              )}
            />
            <p className="text-[10px] text-muted-foreground mt-0.5 tabular-nums">
              OCR: abonos {formatCurrency(ocrComisionAbonos)} + creditos {formatCurrency(ocrComisionCreditos)} = {formatCurrency(ocrComisionSum)}
            </p>
          </div>
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
