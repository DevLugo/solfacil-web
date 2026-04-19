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
import { FIX_ALL_DUPLICATE_ACTIVE_LOANS, MergeBatchResult } from '../queries'

interface FixAllDuplicateLoansDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  count: number
  onSuccess: () => void
}

export function FixAllDuplicateLoansDialog({
  open,
  onOpenChange,
  count,
  onSuccess,
}: FixAllDuplicateLoansDialogProps) {
  const { toast } = useToast()
  const [fixAll, { loading }] = useMutation<{
    fixAllDuplicateActiveLoans: MergeBatchResult
  }>(FIX_ALL_DUPLICATE_ACTIVE_LOANS, {
    onCompleted: (data) => {
      const result = data.fixAllDuplicateActiveLoans
      if (result.errorCount > 0) {
        toast({
          title: `Corregidos: ${result.successCount}. Errores: ${result.errorCount}`,
          description: result.errors.slice(0, 3).join(' · '),
          variant: 'destructive',
        })
      } else {
        toast({ title: `${result.successCount} borrowers corregidos` })
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
          <AlertDialogTitle>Corregir todos los préstamos duplicados</AlertDialogTitle>
          <AlertDialogDescription>
            Se procesarán <strong>{count}</strong> borrower(s). Para cada uno, el préstamo más
            antiguo se marcará FINISHED y el más reciente lo enlazará como{' '}
            <code>previousLoan</code>.
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
              fixAll()
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
