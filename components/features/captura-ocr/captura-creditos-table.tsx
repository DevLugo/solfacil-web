'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { Plus, RefreshCw, ChevronRight } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
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

// Ancho mínimo (en px) que debe tener el grid de créditos para que quepan 2
// columnas sin truncar nombres/teléfonos. Valor derivado empíricamente:
// ~420 px por CapturaCreditoRow (Cliente+Aval apilados + badges OCR/BD)
// × 2 + gap-3 (12 px) = 852 px; redondeado a 900 px para dejar holgura.
const TWO_COL_MIN_WIDTH = 900

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

  // Container-aware responsive grid: decidimos 1 vs 2 columnas según el ancho
  // REAL del wrapper (no del viewport), para reaccionar al resize del PDF
  // viewer en el preview dialog.
  const gridRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(0)
  useEffect(() => {
    const node = gridRef.current
    if (!node) return
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? 0
      setContainerWidth(width)
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])
  const twoCols = containerWidth >= TWO_COL_MIN_WIDTH

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
              <div
                ref={gridRef}
                className={cn('grid gap-3', twoCols ? 'grid-cols-2' : 'grid-cols-1')}
              >
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
