'use client'

import * as React from 'react'
import { useMutation, useQuery } from '@apollo/client'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { CheckCircle2, AlertCircle, Loader2, Info } from 'lucide-react'
import {
  START_PROFIT_AUDIT_FIX,
  PROFIT_AUDIT_FIX_STATUS,
  ProfitAuditFixJob,
  ProfitAuditFixPhase,
} from '../queries'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  fromDate: Date
  toDate: Date
  routeId: string | undefined
  totalLoans: number
  totalDifference: number
  totalAffectedEntries: number
  onCompleted: () => void
}

const POLL_INTERVAL_MS = 500

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 2,
  }).format(value)
}

function phaseLabel(phase: ProfitAuditFixPhase): string {
  switch (phase) {
    case 'DETECTING':
      return 'Detectando créditos afectados…'
    case 'FIXING_HEADERS':
      return 'Corrigiendo header de créditos…'
    case 'FIXING_ENTRIES':
      return 'Corrigiendo distribución de pagos…'
    case 'DONE':
      return 'Completado'
  }
}

export function ApplyFixDialog({
  open,
  onOpenChange,
  fromDate,
  toDate,
  routeId,
  totalLoans,
  totalDifference,
  totalAffectedEntries,
  onCompleted,
}: Props) {
  const { toast } = useToast()
  const [dryRun, setDryRun] = React.useState(true)
  const [jobId, setJobId] = React.useState<string | null>(null)
  const notifiedRef = React.useRef<string | null>(null)

  const [startFix, { loading: starting }] = useMutation(START_PROFIT_AUDIT_FIX)

  const statusQuery = useQuery<{ profitAuditFixStatus: ProfitAuditFixJob }>(
    PROFIT_AUDIT_FIX_STATUS,
    {
      variables: { jobId: jobId ?? '' },
      skip: !jobId,
      pollInterval: jobId ? POLL_INTERVAL_MS : 0,
      fetchPolicy: 'network-only',
    },
  )

  const job = statusQuery.data?.profitAuditFixStatus

  // Stop polling + side-effects when job ends
  React.useEffect(() => {
    if (!job) return
    if (job.status === 'PROCESSING') return

    // Stop polling
    statusQuery.stopPolling()

    // Avoid duplicate notifications
    if (notifiedRef.current === job.jobId) return
    notifiedRef.current = job.jobId

    if (job.status === 'COMPLETED') {
      toast({
        title: job.dryRun ? 'Simulación completada' : 'Corrección aplicada',
        description: job.dryRun
          ? `Se detectaron ${job.loansUpdated} créditos con diferencia total de ${formatCurrency(job.totalDifferenceApplied)}. Ejecuta sin dry-run para aplicar.`
          : `${job.loansUpdated} créditos y ${job.entriesUpdated} pagos corregidos. Total recuperado: ${formatCurrency(job.totalDifferenceApplied)}.`,
      })
      if (!job.dryRun) {
        onCompleted()
      }
    } else if (job.status === 'FAILED') {
      toast({
        title: 'Error al aplicar corrección',
        description: job.error ?? 'Error desconocido',
        variant: 'destructive',
      })
    }
  }, [job, toast, onCompleted, statusQuery])

  const handleStart = async () => {
    try {
      notifiedRef.current = null
      const result = await startFix({
        variables: {
          fromDate: fromDate.toISOString(),
          toDate: toDate.toISOString(),
          routeId: routeId ?? null,
          dryRun,
        },
      })
      const newJobId = result.data?.startProfitAuditFix?.jobId
      if (newJobId) {
        setJobId(newJobId)
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error desconocido'
      toast({
        title: 'Error al iniciar el job',
        description: message,
        variant: 'destructive',
      })
    }
  }

  const handleClose = () => {
    if (job && job.status === 'PROCESSING') {
      // Don't allow closing while processing - but show confirm-like warning
      toast({
        title: 'Proceso en curso',
        description: 'Espera a que termine para cerrar el diálogo.',
        variant: 'destructive',
      })
      return
    }
    setJobId(null)
    notifiedRef.current = null
    onOpenChange(false)
  }

  const isProcessing = job?.status === 'PROCESSING'
  const isDone = job?.status === 'COMPLETED'
  const isFailed = job?.status === 'FAILED'

  const progressPct = React.useMemo(() => {
    if (!job) return 0
    if (job.status !== 'PROCESSING') return 100
    if (job.phase === 'DETECTING') return 5
    if (job.totalLoans === 0) return 10
    const baseByPhase = job.phase === 'FIXING_HEADERS' ? 10 : 55
    const span = job.phase === 'FIXING_HEADERS' ? 45 : 45
    const ratio = job.processedLoans / job.totalLoans
    return Math.min(95, Math.round(baseByPhase + span * ratio))
  }, [job])

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? onOpenChange(v) : handleClose())}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Aplicar corrección de profit</DialogTitle>
          <DialogDescription>
            Esta operación corregirá el campo <code>profitAmount</code> en los créditos afectados
            y recalculará la distribución de ganancia en sus pagos asociados.
          </DialogDescription>
        </DialogHeader>

        {/* Pre-run summary */}
        {!job && (
          <div className="space-y-4">
            <div className="rounded-md border p-4 space-y-2 bg-muted/40">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Créditos a corregir</span>
                <span className="font-semibold">{totalLoans.toLocaleString('es-MX')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Pagos afectados</span>
                <span className="font-semibold">
                  {totalAffectedEntries.toLocaleString('es-MX')}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Profit a recuperar</span>
                <span className="font-semibold text-green-600">
                  {formatCurrency(totalDifference)}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-md border p-3">
              <div className="space-y-0.5">
                <Label htmlFor="dry-run" className="cursor-pointer">
                  Modo simulación (dry-run)
                </Label>
                <p className="text-xs text-muted-foreground">
                  Calcula los cambios sin modificar la base de datos.
                </p>
              </div>
              <Switch id="dry-run" checked={dryRun} onCheckedChange={setDryRun} />
            </div>

            {!dryRun && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Modo real</AlertTitle>
                <AlertDescription>
                  Esta operación es idempotente pero modifica registros en producción.
                  Re-ejecutarla no causa daño.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Progress */}
        {job && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm">
              {isProcessing && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
              {isDone && <CheckCircle2 className="h-4 w-4 text-green-600" />}
              {isFailed && <AlertCircle className="h-4 w-4 text-destructive" />}
              <span className="font-medium">{phaseLabel(job.phase)}</span>
              {job.dryRun && <Badge variant="outline">Dry-run</Badge>}
            </div>

            <Progress value={progressPct} />

            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-md border p-3">
                <div className="text-xs text-muted-foreground">Procesados</div>
                <div className="font-semibold">
                  {job.processedLoans.toLocaleString('es-MX')} /{' '}
                  {job.totalLoans.toLocaleString('es-MX')}
                </div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-xs text-muted-foreground">Créditos actualizados</div>
                <div className="font-semibold">
                  {job.loansUpdated.toLocaleString('es-MX')}
                </div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-xs text-muted-foreground">Pagos actualizados</div>
                <div className="font-semibold">
                  {job.entriesUpdated.toLocaleString('es-MX')}
                </div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-xs text-muted-foreground">Total aplicado</div>
                <div className="font-semibold text-green-600">
                  {formatCurrency(job.totalDifferenceApplied)}
                </div>
              </div>
            </div>

            {isDone && job.dryRun && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Simulación completada</AlertTitle>
                <AlertDescription>
                  Desactiva el dry-run y vuelve a aplicar para guardar los cambios.
                </AlertDescription>
              </Alert>
            )}

            {isFailed && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{job.error ?? 'Error desconocido'}</AlertDescription>
              </Alert>
            )}

            {job.errors && job.errors.length > 0 && (
              <div className="rounded-md border border-destructive/40 p-3 text-xs space-y-1 max-h-32 overflow-y-auto">
                <div className="font-semibold text-destructive">
                  Errores ({job.errors.length}):
                </div>
                {job.errors.map((e, i) => (
                  <div key={i} className="text-muted-foreground">
                    • {e}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {!job ? (
            <>
              <Button variant="outline" onClick={handleClose} disabled={starting}>
                Cancelar
              </Button>
              <Button onClick={handleStart} disabled={starting || totalLoans === 0}>
                {starting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Iniciando…
                  </>
                ) : dryRun ? (
                  'Simular'
                ) : (
                  'Aplicar corrección'
                )}
              </Button>
            </>
          ) : (
            <Button onClick={handleClose} disabled={isProcessing} variant={isDone ? 'default' : 'outline'}>
              {isProcessing ? 'Procesando…' : 'Cerrar'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
