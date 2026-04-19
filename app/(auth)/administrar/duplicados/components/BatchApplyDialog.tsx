'use client'

import { useMutation } from '@apollo/client'
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
import { useToast } from '@/hooks/use-toast'
import { MERGE_ALL_HIGH_CONFIDENCE, MergeBatchResult } from '../queries'

interface BatchApplyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  count: number
  onSuccess: () => void
}

export function BatchApplyDialog({
  open,
  onOpenChange,
  count,
  onSuccess,
}: BatchApplyDialogProps) {
  const { toast } = useToast()
  const [mergeAll, { loading }] = useMutation<{
    mergeAllHighConfidencePersonalData: MergeBatchResult
  }>(MERGE_ALL_HIGH_CONFIDENCE, {
    onCompleted: (data) => {
      const result = data.mergeAllHighConfidencePersonalData
      if (result.errorCount > 0) {
        toast({
          title: `Fusionados: ${result.successCount}. Errores: ${result.errorCount}`,
          description: result.errors.slice(0, 3).join(' · '),
          variant: 'destructive',
        })
      } else {
        toast({ title: `${result.successCount} grupos fusionados correctamente` })
      }
      onSuccess()
    },
    onError: (error) => {
      toast({
        title: 'Error aplicando batch',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Aplicar fusiones automáticas</AlertDialogTitle>
          <AlertDialogDescription>
            Se fusionarán <strong>{count}</strong> grupo(s) de alta confianza usando el
            survivor recomendado automáticamente (Employee &gt; Borrower &gt; más préstamos).
            <br />
            <br />
            Esta operación es <strong>irreversible</strong> y queda registrada en el audit log.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              mergeAll()
            }}
            disabled={loading}
          >
            {loading ? 'Aplicando...' : 'Aplicar todos'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
