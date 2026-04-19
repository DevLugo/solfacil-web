'use client'

import { useMutation } from '@apollo/client'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { FIX_DUPLICATE_ACTIVE_LOAN_GROUP, DuplicateActiveLoanGroup } from '../queries'

interface FixDuplicateLoanDialogProps {
  group: DuplicateActiveLoanGroup
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function FixDuplicateLoanDialog({
  group,
  open,
  onOpenChange,
  onSuccess,
}: FixDuplicateLoanDialogProps) {
  const { toast } = useToast()
  const [fixMutation, { loading }] = useMutation(FIX_DUPLICATE_ACTIVE_LOAN_GROUP, {
    onCompleted: () => {
      toast({ title: 'Préstamos corregidos correctamente' })
      onSuccess()
    },
    onError: (error) => {
      toast({
        title: 'Error al corregir',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const handleFix = () => {
    fixMutation({ variables: { borrowerId: group.borrowerId } })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Corregir préstamos duplicados</DialogTitle>
          <DialogDescription>
            Cliente: <span className="font-medium">{group.clientName}</span>
            {group.clientCode && ` (${group.clientCode})`}. El préstamo más antiguo se marcará
            como <strong>FINISHED</strong> y el más reciente tendrá <code>previousLoan</code>{' '}
            apuntando a él.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Préstamo</TableHead>
                <TableHead>Firmado</TableHead>
                <TableHead>Solicitado</TableHead>
                <TableHead>Pagado</TableHead>
                <TableHead>Pendiente</TableHead>
                <TableHead>Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {group.loans.map((loan) => {
                const isOld = loan.id === group.oldLoanId
                const isNew = loan.id === group.newLoanId
                return (
                  <TableRow key={loan.id}>
                    <TableCell className="font-mono text-xs">
                      {loan.id.slice(0, 8)}…
                    </TableCell>
                    <TableCell className="text-xs">
                      {new Date(loan.signDate).toLocaleDateString('es-MX')}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      ${Number(loan.requestedAmount).toFixed(2)}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      ${Number(loan.totalPaid).toFixed(2)}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      ${Number(loan.pendingAmount).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      {isOld && (
                        <Badge variant="outline" className="text-amber-600 border-amber-600">
                          → FINISHED
                        </Badge>
                      )}
                      {isNew && (
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          Mantener ACTIVE
                        </Badge>
                      )}
                      {!isOld && !isNew && (
                        <span className="text-xs text-muted-foreground">Sin cambio</span>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleFix} disabled={loading}>
            {loading ? 'Aplicando...' : 'Corregir'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
