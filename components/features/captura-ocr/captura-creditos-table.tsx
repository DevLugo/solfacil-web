'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { Plus, RefreshCw, ChevronRight } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

import { useCapturaOcr } from './captura-ocr-context'
import { CapturaCreditoRow } from './captura-credito-row'
import { autoMatchCredits } from '@/lib/fuzzy-match'
import type { CapturaLocalityResult, CapturaLoanType } from './types'

interface Props {
  jobId: string
  locality: CapturaLocalityResult
  loantypes: CapturaLoanType[]
}

export function CapturaCreditosTable({ jobId, locality, loantypes }: Props) {
  const { updateCredit, addCredit, getEditedResult } = useCapturaOcr()

  // Read creditos directly from context (editedResults Map) to ensure we always
  // have the latest state. The locality prop may be stale if the parent didn't re-render.
  const editedResult = getEditedResult(jobId)
  const editedLocality = editedResult?.localities?.find(l => l.localidad === locality.localidad)
  const creditos = editedLocality?.creditos || locality.creditos || []
  const clientsList = editedLocality?.clientsList || locality.clientsList || []
  const excepciones = editedLocality?.excepciones || locality.excepciones || []
  const hasAutoMatched = useRef(false)

  // Auto-match credits on first render:
  //   - R credits: find matching client by loanId/name
  //   - N credits: promote to R when name matches a clientsList entry exactly
  //     (handles the case where OCR mislabels a renewal as new)
  useEffect(() => {
    if (hasAutoMatched.current) return
    if (creditos.length === 0 || clientsList.length === 0) return

    hasAutoMatched.current = true
    const matched = autoMatchCredits(creditos, clientsList)

    matched.forEach((credit, i) => {
      const original = creditos[i]
      const newMatch = credit.matchedClientPos && !original.matchedClientPos
      const promoted = credit.tipo === 'R' && original.tipo === 'N'
      if (!newMatch && !promoted) return

      const matchedClient = clientsList.find(c => c.pos === credit.matchedClientPos)
      if (!matchedClient) return

      const pendingBalance = matchedClient.pendingBalance || 0
      // Adjust for same-session payment (client paying in abonos table)
      const exc = excepciones.find(e => e.pos === matchedClient.pos)
      const sameSessionPayment = exc
        ? (exc.marca === 'FALTA' ? 0 : (exc.montoPagado || 0))
        : (matchedClient.expectedWeeklyPayment || 0)
      const entregado = credit.monto - (pendingBalance - sameSessionPayment)

      // Find loantype from matched client to auto-fill commission
      const clientLoanType = matchedClient.loantypeId
        ? loantypes.find(lt => lt.id === matchedClient.loantypeId)
        : null

      updateCredit(jobId, locality.localidad, i, {
        tipo: 'R',
        matchedClientPos: credit.matchedClientPos,
        matchConfidence: credit.matchConfidence,
        loanIdAnterior: matchedClient.loanId,
        clientCode: matchedClient.clientCode,
        entregado,
        // Prefer OCR monto (new loan amount). Previous loan's requestedAmount
        // is only a fallback when OCR failed to read the amount.
        monto: credit.monto || matchedClient.requestedAmount || 0,
        semanas: matchedClient.weekDuration || credit.semanas,
        porcentaje: matchedClient.rate != null ? matchedClient.rate * 100 : credit.porcentaje,
        loantypeId: matchedClient.loantypeId || credit.loantypeId,
        comisionCredito: clientLoanType
          ? parseFloat(clientLoanType.loanGrantedComission) || 0
          : undefined,
        aval: (matchedClient.collateralName || matchedClient.collateralPhone)
          ? { nombre: matchedClient.collateralName || '', telefono: matchedClient.collateralPhone || '' }
          : credit.aval,
      })
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [creditos, clientsList, jobId, locality.localidad, updateCredit, loantypes, excepciones])

  // Match stats
  const matchStats = useMemo(() => {
    const renewals = creditos.filter(c => c.tipo === 'R')
    const matched = renewals.filter(c => c.matchedClientPos && c.matchConfidence !== 'NONE')
    return { total: renewals.length, matched: matched.length }
  }, [creditos])

  const [isOpen, setIsOpen] = useState(creditos.length > 0)

  // Batch commission controls for creditos
  const [creditCommissionMode, setCreditCommissionMode] = useState<'tarifa' | 'hardcoded'>('tarifa')
  const [creditGlobalCommission, setCreditGlobalCommission] = useState('')

  const handleApplyCreditCommission = useCallback(() => {
    const value = parseFloat(creditGlobalCommission)
    if (isNaN(value)) return

    if (creditCommissionMode === 'tarifa') {
      // Tarifa fija: apply to all credits
      creditos.forEach((_, i) => {
        updateCredit(jobId, locality.localidad, i, { comisionCredito: value })
      })
    } else {
      // Hardcoded: apply to the first credit, all others get 0
      creditos.forEach((_, i) => {
        updateCredit(jobId, locality.localidad, i, { comisionCredito: i === 0 ? value : 0 })
      })
    }
  }, [jobId, locality.localidad, creditos, creditCommissionMode, creditGlobalCommission, updateCredit])

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="py-3 cursor-pointer hover:bg-muted/50 transition-colors select-none">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ChevronRight className={cn("h-4 w-4 text-muted-foreground transition-transform", isOpen && "rotate-90")} />
                <div>
                  <CardTitle className="text-sm font-medium">
                    Creditos ({creditos.length})
                  </CardTitle>
                  {creditos.length > 0 && (
                    <CardDescription className="text-xs">
                      {creditos.filter(c => c.tipo === 'N').length} nuevos, {matchStats.total} renovaciones
                    </CardDescription>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {matchStats.total > 0 && (
                  <Badge variant="outline" className="text-xs gap-1">
                    <RefreshCw className="h-3 w-3" />
                    {matchStats.matched}/{matchStats.total} matcheadas
                  </Badge>
                )}
                {isOpen && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); addCredit(jobId, locality.localidad) }}
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    Agregar
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          {creditos.length > 0 && (
            <CardContent className="space-y-3 pt-0">
              {/* Batch commission controls */}
              <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2">
                <span className="text-xs font-medium text-muted-foreground shrink-0">Comision credito:</span>
                <Select value={creditCommissionMode} onValueChange={(v) => setCreditCommissionMode(v as 'tarifa' | 'hardcoded')}>
                  <SelectTrigger className="h-7 w-[120px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tarifa" className="text-xs">Tarifa fija</SelectItem>
                    <SelectItem value="hardcoded" className="text-xs">Monto unico</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  value={creditGlobalCommission}
                  onChange={(e) => setCreditGlobalCommission(e.target.value)}
                  onWheel={(e) => e.currentTarget.blur()}
                  placeholder={creditCommissionMode === 'tarifa' ? 'Tarifa c/u' : 'Total unico'}
                  className="h-7 w-[90px] text-xs text-right"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={handleApplyCreditCommission}
                  disabled={!creditGlobalCommission}
                >
                  Aplicar
                </Button>
                <span className="text-[10px] text-muted-foreground ml-1">
                  {creditCommissionMode === 'tarifa'
                    ? 'Aplica a todos (omite com=0)'
                    : 'Solo al 1ro, resto en 0'}
                </span>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                {creditos.map((credit, index) => (
                  <CapturaCreditoRow
                    key={index}
                    jobId={jobId}
                    localidad={locality.localidad}
                    credit={credit}
                    index={index}
                    clientsList={clientsList}
                    excepciones={excepciones}
                    loantypes={loantypes}
                  />
                ))}
              </div>
            </CardContent>
          )}
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}
