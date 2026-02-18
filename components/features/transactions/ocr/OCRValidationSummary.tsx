'use client'

import { AlertTriangle, CheckCircle2, XCircle, Info } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { cn, formatCurrency } from '@/lib/utils'

const num = (v: unknown): number => Number(v) || 0

interface Warning {
  code: string
  message: string
  field?: string | null
  pageIndex?: number | null
}

interface GroupValidation {
  groupNumber: number
  localityName: string
  rdColocacion: number
  rdCuota: number
  rdCobranza: number
  lcCobranzaTotal: number | null
  lcComisionTotal: number | null
  acColocacionTotal: number | null
  cobranzaMatch: boolean
  cobranzaDifference: number | null
  colocacionMatch: boolean
  colocacionDifference: number | null
  cuotaMatch: boolean
  cuotaDifference: number | null
  warnings: Warning[]
}

interface CrossValidation {
  isValid: boolean
  registroDiarioTotal: number | null
  listadosTotal: number | null
  difference: number | null
  cashCountTotal: number | null
  expectedCashTotal: number | null
  cashDifference: number | null
  totalColocado: number | null
  totalCuota: number | null
  totalGastos: number | null
  extracobranza: number | null
  groupValidations: GroupValidation[]
}

interface OCRValidationSummaryProps {
  crossValidation: CrossValidation
  warnings: Warning[]
  errors: Warning[]
  overallConfidence: string
  pagesProcessed: number
}

export function OCRValidationSummary({
  crossValidation,
  warnings,
  errors,
  overallConfidence,
  pagesProcessed,
}: OCRValidationSummaryProps) {
  const hasErrors = errors.length > 0
  const hasWarnings = warnings.length > 0

  return (
    <div className="space-y-4">
      {/* Overall Status */}
      <div className="flex items-center gap-3 flex-wrap">
        <Badge variant={crossValidation.isValid ? 'default' : 'destructive'} className="text-sm py-1 px-3">
          {crossValidation.isValid ? (
            <><CheckCircle2 className="h-4 w-4 mr-1" /> Validación OK</>
          ) : (
            <><XCircle className="h-4 w-4 mr-1" /> Hay diferencias</>
          )}
        </Badge>
        <Badge variant="outline" className="text-sm py-1 px-3">
          {pagesProcessed} páginas procesadas
        </Badge>
        <Badge
          variant="outline"
          className={`text-sm py-1 px-3 ${
            overallConfidence === 'alta'
              ? 'bg-green-50 text-green-700 border-green-200'
              : overallConfidence === 'media'
              ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
              : 'bg-red-50 text-red-700 border-red-200'
          }`}
        >
          Confianza: {overallConfidence}
        </Badge>
      </div>

      {/* Errors */}
      {hasErrors && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>
            <p className="font-semibold mb-2">{errors.length} error(es) encontrado(s):</p>
            <ul className="list-disc pl-4 space-y-1 text-sm">
              {errors.map((err, i) => (
                <li key={i}>{err.message}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Warnings */}
      {hasWarnings && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <p className="font-semibold mb-2">{warnings.length} advertencia(s):</p>
            <ul className="list-disc pl-4 space-y-1 text-sm">
              {warnings.map((w, i) => (
                <li key={i}>{w.message}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Cross Validation Totals */}
      {crossValidation.registroDiarioTotal !== null && (
        <div className="bg-muted/50 rounded-lg border p-4">
          <h4 className="font-semibold text-sm mb-3">Totales Generales</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">Registro Diario:</span>{' '}
              <span className="font-medium">{formatCurrency(crossValidation.registroDiarioTotal)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Listados:</span>{' '}
              <span className="font-medium">{formatCurrency(crossValidation.listadosTotal ?? 0)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Diferencia:</span>{' '}
              <span className={`font-medium ${Math.abs(crossValidation.difference ?? 0) > 0.5 ? 'text-red-600' : 'text-green-600'}`}>
                {formatCurrency(crossValidation.difference ?? 0)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Cash Expected Breakdown */}
      {crossValidation.expectedCashTotal !== null && crossValidation.registroDiarioTotal !== null && (
        <div className="bg-muted/50 rounded-lg border p-4">
          <h4 className="font-semibold text-sm mb-3">Caja Esperada</h4>
          <div className="space-y-1 text-sm max-w-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">+ Cobranza total</span>
              <span className="text-green-600 font-mono">{formatCurrency(num(crossValidation.registroDiarioTotal))}</span>
            </div>
            {num(crossValidation.totalCuota) > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">- Cuota (comisiones)</span>
                <span className="text-red-600 font-mono">-{formatCurrency(num(crossValidation.totalCuota))}</span>
              </div>
            )}
            {num(crossValidation.totalColocado) > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">- Colocaciones</span>
                <span className="text-red-600 font-mono">-{formatCurrency(num(crossValidation.totalColocado))}</span>
              </div>
            )}
            {num(crossValidation.totalGastos) > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">- Gastos</span>
                <span className="text-red-600 font-mono">-{formatCurrency(num(crossValidation.totalGastos))}</span>
              </div>
            )}
            {num(crossValidation.extracobranza) > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">+ Extracobranza</span>
                <span className="text-green-600 font-mono">{formatCurrency(num(crossValidation.extracobranza))}</span>
              </div>
            )}
            <div className="flex justify-between border-t pt-1 mt-1">
              <span className="font-semibold">= Efectivo esperado</span>
              <span className="font-bold font-mono">{formatCurrency(num(crossValidation.expectedCashTotal))}</span>
            </div>
            {crossValidation.cashCountTotal !== null && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Conteo físico</span>
                <span className="font-mono">{formatCurrency(num(crossValidation.cashCountTotal))}</span>
              </div>
            )}
            {crossValidation.cashDifference !== null && Math.abs(num(crossValidation.cashDifference)) > 0.5 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Diferencia</span>
                <span className={cn('font-mono font-medium', num(crossValidation.cashDifference) > 0 ? 'text-green-600' : 'text-red-600')}>
                  {formatCurrency(num(crossValidation.cashDifference))}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Group Validations */}
      {crossValidation.groupValidations.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-semibold text-sm">Validación por Grupo</h4>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-3 py-2">Grupo</th>
                  <th className="text-right px-3 py-2">Cobranza RD</th>
                  <th className="text-right px-3 py-2">Cobranza LC</th>
                  <th className="text-center px-3 py-2">Match</th>
                  <th className="text-right px-3 py-2">Diferencia</th>
                </tr>
              </thead>
              <tbody>
                {crossValidation.groupValidations.map((g) => (
                  <tr key={g.groupNumber} className="border-t">
                    <td className="px-3 py-2">
                      <span className="font-medium">G{g.groupNumber}</span>{' '}
                      <span className="text-muted-foreground">{g.localityName}</span>
                    </td>
                    <td className="text-right px-3 py-2">{formatCurrency(g.rdCobranza)}</td>
                    <td className="text-right px-3 py-2">
                      {g.lcCobranzaTotal !== null ? formatCurrency(g.lcCobranzaTotal) : '—'}
                    </td>
                    <td className="text-center px-3 py-2">
                      {g.cobranzaMatch ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600 inline" />
                      ) : g.lcCobranzaTotal !== null ? (
                        <XCircle className="h-4 w-4 text-red-600 inline" />
                      ) : (
                        <Info className="h-4 w-4 text-muted-foreground inline" />
                      )}
                    </td>
                    <td className={`text-right px-3 py-2 ${g.cobranzaDifference && Math.abs(g.cobranzaDifference) > 0.5 ? 'text-red-600 font-medium' : ''}`}>
                      {g.cobranzaDifference !== null ? formatCurrency(g.cobranzaDifference) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
