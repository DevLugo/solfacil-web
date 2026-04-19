'use client'

import { useRef, useState } from 'react'
import { useApolloClient } from '@apollo/client'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/hooks/use-toast'
import { MERGE_PERSONAL_DATA_GROUP, PersonalDataDuplicateGroup } from '../queries'

interface BatchApplyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  highGroups: PersonalDataDuplicateGroup[]
  onSuccess: () => void
}

const CHUNK_SIZE = 5

export function BatchApplyDialog({
  open,
  onOpenChange,
  highGroups,
  onSuccess,
}: BatchApplyDialogProps) {
  const { toast } = useToast()
  const client = useApolloClient()

  const [running, setRunning] = useState(false)
  const [processed, setProcessed] = useState(0)
  const [successCount, setSuccessCount] = useState(0)
  const [errorCount, setErrorCount] = useState(0)
  const [errors, setErrors] = useState<string[]>([])
  const cancelRef = useRef(false)

  const total = highGroups.length
  const progressPct = total > 0 ? Math.round((processed / total) * 100) : 0

  const handleStart = async () => {
    setRunning(true)
    setProcessed(0)
    setSuccessCount(0)
    setErrorCount(0)
    setErrors([])
    cancelRef.current = false

    let localSuccess = 0
    let localErrors = 0
    const localErrorMessages: string[] = []

    for (let i = 0; i < highGroups.length; i += CHUNK_SIZE) {
      if (cancelRef.current) break

      const chunk = highGroups.slice(i, i + CHUNK_SIZE)

      const results = await Promise.allSettled(
        chunk.map((group) =>
          client.mutate({
            mutation: MERGE_PERSONAL_DATA_GROUP,
            variables: {
              groupKey: group.groupKey,
              survivorId: group.autoSurvivorId,
            },
          })
        )
      )

      results.forEach((r, idx) => {
        if (r.status === 'fulfilled') {
          localSuccess++
        } else {
          localErrors++
          const groupName = chunk[idx]?.records[0]?.fullName ?? 'grupo'
          const msg = r.reason instanceof Error ? r.reason.message : String(r.reason)
          localErrorMessages.push(`${groupName}: ${msg}`)
        }
      })

      setProcessed((p) => p + chunk.length)
      setSuccessCount(localSuccess)
      setErrorCount(localErrors)
      setErrors(localErrorMessages)
    }

    setRunning(false)

    if (cancelRef.current) {
      toast({
        title: `Cancelado. Fusionados: ${localSuccess}. Errores: ${localErrors}`,
      })
    } else if (localErrors > 0) {
      toast({
        title: `Fusionados: ${localSuccess}. Errores: ${localErrors}`,
        description: localErrorMessages.slice(0, 3).join(' · '),
        variant: 'destructive',
      })
    } else {
      toast({ title: `${localSuccess} grupos fusionados correctamente` })
    }

    onSuccess()
  }

  const handleCancel = () => {
    if (running) {
      cancelRef.current = true
    } else {
      onOpenChange(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={(v) => !running && onOpenChange(v)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Aplicar fusiones automáticas</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2">
              <p>
                Se fusionarán <strong>{total}</strong> grupo(s) de alta confianza usando el
                survivor recomendado automáticamente (Employee &gt; Borrower &gt; más préstamos).
              </p>
              <p>
                Esta operación es <strong>irreversible</strong> y queda registrada en el audit
                log.
              </p>
              <p className="text-xs text-muted-foreground">
                Los grupos se procesan en lotes de {CHUNK_SIZE} para evitar timeouts.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        {(running || processed > 0) && (
          <div className="space-y-2 py-2">
            <Progress value={progressPct} />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>
                {processed} / {total} ({progressPct}%)
              </span>
              <span>
                <span className="text-green-600">✓ {successCount}</span>
                {errorCount > 0 && (
                  <span className="ml-3 text-red-600">✗ {errorCount}</span>
                )}
              </span>
            </div>
            {errors.length > 0 && (
              <details className="text-xs">
                <summary className="cursor-pointer text-muted-foreground">
                  Ver errores ({errors.length})
                </summary>
                <ul className="mt-1 max-h-32 overflow-y-auto space-y-0.5">
                  {errors.slice(0, 20).map((e, i) => (
                    <li key={i} className="text-red-600">
                      {e}
                    </li>
                  ))}
                  {errors.length > 20 && (
                    <li className="text-muted-foreground">
                      … y {errors.length - 20} más
                    </li>
                  )}
                </ul>
              </details>
            )}
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel}>
            {running ? 'Cancelar procesamiento' : 'Cerrar'}
          </AlertDialogCancel>
          {!running && processed === 0 && (
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleStart()
              }}
            >
              Aplicar todos
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
