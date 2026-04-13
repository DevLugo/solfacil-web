'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useQuery } from '@apollo/client'
import { DollarSign, Save, Loader2, CheckCircle2, FileText, X, GripVertical, Send, Undo2, Plus, Trash2 } from 'lucide-react'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

import { cn } from '@/lib/utils'
import { useCapturaOcr } from './captura-ocr-context'
import { CapturaLocalityPanel } from './captura-locality-panel'
import { CapturaResumenTotal, computeProjection } from './captura-resumen-total'
import { CapturaGastosTable } from './captura-gastos-table'
import { CapturaExtracobranzaTable } from './captura-extracobranza-table'
import { CapturaAddLocalityDialog } from './captura-add-locality-dialog'
import { LOAN_TYPES_QUERY } from '@/graphql/queries/transactions'
import { useToast } from '@/hooks/use-toast'
import type { UploadItem, CapturaResult, CapturaUsage, CapturaLoanType } from './types'

interface Props {
  jobId: string
  /** For uploads in-flight (from upload panel) */
  upload?: UploadItem
  /** For DB records (from month browser) */
  dbResult?: CapturaResult | null
  dbEditedResult?: CapturaResult | null
  /** Cloudinary URL for persisted PDF (DB records) */
  dbPdfUrl?: string | null
  routeId?: string
  routeName?: string
  /** ISO timestamp if job is already confirmed */
  confirmedAt?: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CapturaPreviewDialog({ jobId, upload, dbResult, dbEditedResult, dbPdfUrl, routeId, routeName, confirmedAt: initialConfirmedAt, open, onOpenChange }: Props) {
  const { getEditedResult, ensureEditedResult, cashFundBalances, fetchSystemSummary, saveEditsToDb, savingJobId, confirmCaptura, rollbackCaptura, confirmingJobId, rollingBackJobId, removeLocality } = useCapturaOcr()
  const { toast } = useToast()
  const [confirmedAt, setConfirmedAt] = useState(initialConfirmedAt)
  useEffect(() => { setConfirmedAt(initialConfirmedAt) }, [initialConfirmedAt])
  const isConfirmed = !!confirmedAt
  const editedResult = getEditedResult(jobId)
  const originalResult = upload?.result || dbResult || null

  // Loantypes: fetch from system (always fresh), fallback to OCR result
  const { data: loantypesData } = useQuery(LOAN_TYPES_QUERY)
  const systemLoantypes: CapturaLoanType[] = loantypesData?.loantypes || []

  const effectiveRouteId = upload?.routeId || routeId || ''
  const effectiveRouteName = upload?.routeName || routeName || ''

  // Ensure the edited results Map has this job's data. This is critical because
  // loadJobFromDb's setEditedResults may not have been processed yet when this
  // dialog first renders (race condition with React batching). Without this,
  // updateCredit silently no-ops when the Map entry doesn't exist.
  useEffect(() => {
    if (open && originalResult) {
      ensureEditedResult(jobId, originalResult)
    }
  }, [open, jobId, originalResult, ensureEditedResult])

  // Ensure system data is fetched when dialog opens
  useEffect(() => {
    if (open && effectiveRouteId) {
      fetchSystemSummary(effectiveRouteId)
    }
  }, [open, effectiveRouteId, fetchSystemSummary])

  const localities = editedResult?.localities || originalResult?.localities || []
  const originalLocalities = originalResult?.localities || []
  const loantypes: CapturaLoanType[] = systemLoantypes.length > 0
    ? systemLoantypes
    : (editedResult?.loantypes || originalResult?.loantypes || [])
  const gastos = editedResult?.gastos || originalResult?.gastos || []
  const originalGastos = originalResult?.gastos || []
  const extracobranzas = editedResult?.extracobranzas || []
  const [activeTab, setActiveTab] = useState('__resumen__')
  const [savedSuccess, setSavedSuccess] = useState(false)
  const [showPdf, setShowPdf] = useState(false)
  const [addLocalityOpen, setAddLocalityOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)

  // PDF panel width as percentage (20-80%)
  const [pdfWidthPct, setPdfWidthPct] = useState(50)
  const [isResizing, setIsResizing] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)

    const onMove = (ev: MouseEvent) => {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const pct = ((rect.right - ev.clientX) / rect.width) * 100
      setPdfWidthPct(Math.min(80, Math.max(20, pct)))
    }
    const onUp = () => {
      setIsResizing(false)
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [])

  // Create blob URL for PDF viewer (in-flight uploads) or proxy URL (DB records)
  const blobUrl = useMemo(
    () => upload?.file ? URL.createObjectURL(upload.file) : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [upload?.file],
  )
  // DB PDFs go through API proxy — Cloudinary raw URLs aren't browser-accessible
  const proxyUrl = dbPdfUrl ? `${process.env.NEXT_PUBLIC_GRAPHQL_URL?.replace('/graphql', '')}/api/captura-pdf/${jobId}` : null
  const pdfUrl = blobUrl || proxyUrl || null

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl)
    }
  }, [blobUrl])

  const isSaving = savingJobId === jobId
  const isConfirming = confirmingJobId === jobId
  const isRollingBack = rollingBackJobId === jobId
  const isBusy = isSaving || isConfirming || isRollingBack
  const [confirmResult, setConfirmResult] = useState<{ lprCount: number; gastoCount: number; loanCount: number } | null>(null)

  // Refs para handlers que se definen despues del early-return
  const handleSaveRef = useRef<(() => Promise<void>) | null>(null)
  const handleConfirmRef = useRef<(() => Promise<void>) | null>(null)

  // Keyboard shortcuts: Cmd+S guardar, Cmd+Enter confirmar
  useEffect(() => {
    if (!open || isConfirmed) return
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key === 's') {
        e.preventDefault()
        if (!isBusy) handleSaveRef.current?.()
      }
      if (mod && e.key === 'Enter') {
        e.preventDefault()
        if (!isBusy) handleConfirmRef.current?.()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, isConfirmed, isBusy])

  if (!originalResult) return null

  const usage = originalResult.usage

  const handleSaveAll = async () => {
    await saveEditsToDb(jobId)
    setSavedSuccess(true)
    setTimeout(() => setSavedSuccess(false), 3000)
  }
  handleSaveRef.current = handleSaveAll

  const handleConfirm = async () => {
    try {
      // CRITICO: guardar edits antes de confirmar. De lo contrario el backend
      // lee el editedResult desde DB que puede estar desfasado respecto al
      // estado in-memory (ej: entregado/matchedClientPos calculados por el
      // auto-match que nunca llegaron a DB).
      await saveEditsToDb(jobId)

      // Calcular el "Sistema Final" que el usuario ve en la pestaña Resumen y
      // enviarlo al backend para validación post-save. El backend comparará
      // el saldo real de la caja (EMPLOYEE_CASH_FUND) contra este valor y
      // marcará el job como CONFIRMED_WITH_ERRORS si no coinciden.
      const cashFundBalance = cashFundBalances.get(effectiveRouteId)
      const projection = computeProjection(
        localities,
        originalLocalities,
        gastos,
        originalGastos,
        cashFundBalance,
        extracobranzas,
      )
      const expectedFinalBalance = projection.finalSistema

      const result = await confirmCaptura(jobId, expectedFinalBalance)
      if (result?.success) {
        setConfirmedAt(new Date().toISOString())
        setConfirmResult({ lprCount: result.lprCount, gastoCount: result.gastoCount, loanCount: result.loanCount })

        // R3: Si el backend marcó CONFIRMED_WITH_ERRORS por extracobranzas
        // skipped/failed, mostramos toast warning con el detalle. La caja sí
        // se afectó por los abonos/gastos/creditos regulares — solo las extras
        // problemáticas no se materializaron.
        if (result.status === 'CONFIRMED_WITH_ERRORS') {
          const extraErrors = result.extracobranzaErrors || []
          const detail = extraErrors.length > 0
            ? extraErrors.slice(0, 5).join('\n') + (extraErrors.length > 5 ? `\n…y ${extraErrors.length - 5} más` : '')
            : (result.error || 'Algunas extracobranzas no se procesaron')
          toast({
            variant: 'destructive',
            title: 'Captura confirmada con advertencias',
            description:
              `Los abonos/gastos/créditos regulares se aplicaron, pero hubo ` +
              `${extraErrors.length} extracobranza(s) con problema:\n${detail}`,
            duration: 30000,
          })
        }
      }
    } catch (err: any) {
      // Check for POST_SAVE_VALIDATION_FAILED (critical validation error)
      const extensions = err?.graphQLErrors?.[0]?.extensions
      if (extensions?.code === 'POST_SAVE_VALIDATION_FAILED') {
        const validationError = extensions.validationError as {
          balanceAfter?: string
          expectedFinalBalance?: string
          diff?: string
        } | undefined
        // Mark as confirmed with errors (the job was saved but with validation failure)
        setConfirmedAt(new Date().toISOString())
        toast({
          variant: 'destructive',
          title: 'VALIDACION CRITICA FALLO',
          description:
            `El saldo final de la caja no coincide con el "Sistema Final" del preview. ` +
            (validationError
              ? `Saldo real: $${validationError.balanceAfter}, esperado: $${validationError.expectedFinalBalance}, diferencia: $${validationError.diff}. `
              : '') +
            `Los cambios ya fueron aplicados. El job quedo marcado como CONFIRMED_WITH_ERRORS. Revisa con soporte.`,
          duration: 30000,
        })
      } else {
        const message = err?.message || 'Error desconocido al confirmar captura'
        toast({
          variant: 'destructive',
          title: 'Error al confirmar captura',
          description: message,
        })
      }
    }
  }
  handleConfirmRef.current = handleConfirm

  const handleRollback = async () => {
    const result = await rollbackCaptura(jobId)
    if (result?.success) {
      setConfirmedAt(null)
      setConfirmResult(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !isBusy && onOpenChange(o)}>
      <DialogContent
        className={showPdf
          ? 'max-w-none w-[calc(100vw-1rem)] h-[calc(100vh-1rem)] left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] flex flex-col p-0 gap-0 overflow-hidden'
          : 'max-w-[95vw] h-[95vh] flex flex-col p-0 gap-0 overflow-hidden'
        }
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <div className="flex items-center justify-between pr-8">
            <DialogTitle className="text-lg">
              Preview OCR — {effectiveRouteName || originalResult.routeCode} — {originalResult.fecha}
              {' — '}{localities.length} localidades — {originalResult.processingTimeSeconds.toFixed(0)}s
            </DialogTitle>
            <div className="flex items-center gap-2">
              {pdfUrl && (
                <Button
                  variant={showPdf ? 'default' : 'outline'}
                  size="sm"
                  className="gap-1.5 text-xs"
                  onClick={() => setShowPdf(v => !v)}
                >
                  <FileText className="h-3.5 w-3.5" />
                  {showPdf ? 'Ocultar PDF' : 'Ver PDF'}
                </Button>
              )}
              {usage && <CostBadge usage={usage} />}
            </div>
          </div>
          {originalResult.fechaWarning && (
            <div className="text-sm text-yellow-600 mt-1">{originalResult.fechaWarning}</div>
          )}
        </DialogHeader>

        <div ref={containerRef} className="flex-1 flex min-h-0 overflow-hidden">
          {/* Left panel: Tabs content */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="px-6 border-b shrink-0">
              <TabsList className="h-auto flex-wrap">
                <TabsTrigger value="__resumen__" className="gap-1 font-semibold">
                  Resumen
                </TabsTrigger>
                {localities.map((loc) => {
                  const conf = loc.confidence
                  const hasErrors = (loc.errores?.length || 0) > 0
                  return (
                    <TabsTrigger key={loc.localidad} value={loc.localidad} className="gap-1 group relative pr-6">
                      {loc.localidad}
                      {conf === 'HIGH' && <Badge variant="outline" className="h-4 px-1 text-[10px] bg-green-50 text-green-700 border-green-200">H</Badge>}
                      {conf === 'MEDIUM' && <Badge variant="outline" className="h-4 px-1 text-[10px] bg-yellow-50 text-yellow-700 border-yellow-200">M</Badge>}
                      {conf === 'LOW' && <Badge variant="outline" className="h-4 px-1 text-[10px] bg-red-50 text-red-700 border-red-200">L</Badge>}
                      {hasErrors && <Badge variant="destructive" className="h-4 px-1 text-[10px]">!</Badge>}
                      {!isConfirmed && (
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            setPendingDelete(loc.localidad)
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              e.stopPropagation()
                              setPendingDelete(loc.localidad)
                            }
                          }}
                          className="absolute right-1 top-1/2 -translate-y-1/2 p-0.5 rounded opacity-0 group-hover:opacity-100 focus:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-opacity"
                          title="Eliminar localidad"
                          aria-label={`Eliminar localidad ${loc.localidad}`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </span>
                      )}
                    </TabsTrigger>
                  )
                })}
                {!isConfirmed && effectiveRouteId && (
                  <button
                    type="button"
                    onClick={() => setAddLocalityOpen(true)}
                    className="inline-flex items-center gap-1 px-2 h-8 text-xs rounded-md border border-dashed border-muted-foreground/40 text-muted-foreground hover:text-foreground hover:border-foreground transition-colors ml-1"
                    title="Agregar localidad manual"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Agregar
                  </button>
                )}
              </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0">
              <TabsContent value="__resumen__" forceMount className={cn("m-0 p-6 mt-0 space-y-4", activeTab !== "__resumen__" && "hidden")}>
                <CapturaResumenTotal
                  jobId={jobId}
                  localities={localities}
                  originalLocalities={originalLocalities}
                  cashFundBalance={cashFundBalances.get(effectiveRouteId)}
                  gastos={gastos}
                  originalGastos={originalGastos}
                />
                <CapturaGastosTable jobId={jobId} gastos={gastos} />
                <CapturaExtracobranzaTable jobId={jobId} />
              </TabsContent>
              {localities.map((loc) => {
                return (
                  <TabsContent key={loc.localidad} value={loc.localidad} forceMount className={cn("m-0 p-6 mt-0", activeTab !== loc.localidad && "hidden")}>
                    <CapturaLocalityPanel
                      jobId={jobId}
                      locality={loc}
                      loantypes={loantypes}
                    />
                  </TabsContent>
                )
              })}
            </div>
          </Tabs>

          {/* Resize handle + Right panel: PDF viewer */}
          {showPdf && pdfUrl && (
            <>
              <div
                className="w-2 shrink-0 cursor-col-resize bg-border/50 hover:bg-primary/20 active:bg-primary/30 transition-colors flex items-center justify-center"
                onMouseDown={handleResizeStart}
              >
                <GripVertical className="h-4 w-4 text-muted-foreground/50" />
              </div>
              <div className="flex flex-col min-h-0 shrink-0" style={{ width: `${pdfWidthPct}%` }}>
                <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30 shrink-0">
                  <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5" />
                    PDF Original
                  </span>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setShowPdf(false)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <iframe src={`${pdfUrl}#zoom=84&pagemode=none`} className={`flex-1 w-full border-0 ${isResizing ? 'pointer-events-none' : ''}`} title="PDF Preview" />
              </div>
            </>
          )}
        </div>

        {/* Global save/confirm footer */}
        <div className="shrink-0 border-t bg-card px-6 py-3 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {isConfirmed ? (
              <span className="flex items-center gap-1.5 text-green-600 font-medium">
                <CheckCircle2 className="h-4 w-4" />
                Confirmado
                {confirmResult && (
                  <span className="text-muted-foreground font-normal ml-1">
                    — {confirmResult.lprCount} abonos, {confirmResult.gastoCount} gastos, {confirmResult.loanCount} creditos
                  </span>
                )}
              </span>
            ) : (
              <span>{localities.length} localidades listas para guardar</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {savedSuccess && (
              <span className="flex items-center gap-1 text-sm text-green-600">
                <CheckCircle2 className="h-4 w-4" />
                Guardado en DB
              </span>
            )}

            {/* Rollback button — only when confirmed */}
            {isConfirmed && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    size="lg"
                    className="gap-2"
                    disabled={isBusy}
                  >
                    {isRollingBack ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Deshaciendo...
                      </>
                    ) : (
                      <>
                        <Undo2 className="h-4 w-4" />
                        Deshacer Captura
                      </>
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Deshacer captura confirmada</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esto eliminara todos los abonos, gastos y creditos creados por esta captura.
                      Los prestamos cancelados seran reactivados. Esta accion no se puede deshacer.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleRollback} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Si, deshacer todo
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}

            {/* Save button */}
            {!isConfirmed && (
              <Button
                onClick={handleSaveAll}
                disabled={isBusy}
                variant="outline"
                className="gap-2"
                size="lg"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Guardar Preview
                  </>
                )}
              </Button>
            )}

            {/* Confirm button — only when NOT confirmed */}
            {!isConfirmed && (
              <Button
                onClick={handleConfirm}
                disabled={isBusy}
                className="gap-2"
                size="lg"
              >
                {isConfirming ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Confirmando...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Confirmar Transacciones
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {addLocalityOpen && effectiveRouteId && originalResult && (
          <CapturaAddLocalityDialog
            jobId={jobId}
            routeId={effectiveRouteId}
            fecha={originalResult.fecha}
            existingLeadIds={localities.map(l => l.leadId).filter(Boolean)}
            open={addLocalityOpen}
            onOpenChange={setAddLocalityOpen}
          />
        )}

        <AlertDialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Eliminar localidad {pendingDelete}?
              </AlertDialogTitle>
              <AlertDialogDescription>
                {(() => {
                  const target = localities.find(l => l.localidad === pendingDelete)
                  const excCount = target?.excepciones?.length || 0
                  const credCount = target?.creditos?.length || 0
                  const hasData = excCount > 0 || credCount > 0
                  if (hasData) {
                    return `Esta localidad tiene ${excCount} pagos editados y ${credCount} creditos. Se perderan al eliminar. Solo afecta esta preview — no toca la base de datos hasta que confirmes.`
                  }
                  return 'Solo afecta esta preview — no toca la base de datos hasta que confirmes.'
                })()}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (pendingDelete) {
                    removeLocality(jobId, pendingDelete)
                    if (activeTab === pendingDelete) setActiveTab('__resumen__')
                    setPendingDelete(null)
                  }
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  )
}

function CostBadge({ usage }: { usage: CapturaUsage }) {
  const totalTokens = usage.claudeInputTokens + usage.claudeOutputTokens
  const fmtTokens = totalTokens >= 1000 ? `${(totalTokens / 1000).toFixed(0)}k` : String(totalTokens)

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className="shrink-0 gap-1 cursor-default font-mono text-xs">
            <DollarSign className="h-3 w-3" />
            {usage.totalCostUsd.toFixed(2)} USD
            <span className="text-muted-foreground ml-1">{fmtTokens} tokens</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="end" className="text-xs">
          <div className="space-y-1.5 py-1">
            <p className="font-semibold border-b pb-1 mb-1">Desglose de costo</p>
            <div className="flex justify-between gap-6">
              <span className="text-muted-foreground">Claude ({usage.claudeCalls} calls)</span>
              <span className="font-mono">${usage.claudeCostUsd.toFixed(4)}</span>
            </div>
            <div className="flex justify-between gap-6 text-[10px] text-muted-foreground pl-2">
              <span>Input: {usage.claudeInputTokens.toLocaleString()} tokens</span>
            </div>
            <div className="flex justify-between gap-6 text-[10px] text-muted-foreground pl-2">
              <span>Output: {usage.claudeOutputTokens.toLocaleString()} tokens</span>
            </div>
            <div className="flex justify-between gap-6">
              <span className="text-muted-foreground">Google OCR ({usage.googleOcrCalls} calls)</span>
              <span className="font-mono">${usage.googleCostUsd.toFixed(4)}</span>
            </div>
            <div className="flex justify-between gap-6 border-t pt-1 font-semibold">
              <span>Total</span>
              <span className="font-mono">${usage.totalCostUsd.toFixed(4)}</span>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
