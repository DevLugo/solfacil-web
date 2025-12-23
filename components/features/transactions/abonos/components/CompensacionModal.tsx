'use client'

import { useState } from 'react'
import { useMutation } from '@apollo/client'
import { Loader2, DollarSign } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency } from '@/lib/utils'
import { CREATE_FALCO_COMPENSATORY_PAYMENT } from '@/graphql/mutations/transactions'

interface FalcoPendiente {
  id: string
  falcoAmount: string
  createdAt: string
  lead: {
    id: string
    personalData: {
      id: string
      fullName: string
    }
  }
  falcoCompensatoryPayments: {
    id: string
    amount: string
    createdAt: string
  }[]
}

interface CompensacionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  falco: FalcoPendiente
  onSuccess: () => void
}

export function CompensacionModal({
  open,
  onOpenChange,
  falco,
  onSuccess,
}: CompensacionModalProps) {
  const { toast } = useToast()
  const [amount, setAmount] = useState('')

  const [createFalcoCompensatoryPayment, { loading }] = useMutation(
    CREATE_FALCO_COMPENSATORY_PAYMENT,
    {
      onCompleted: () => {
        toast({
          title: 'Compensación registrada',
          description: `Se registró una compensación de ${formatCurrency(parseFloat(amount))}`,
        })
        setAmount('')
        onSuccess()
      },
      onError: (error) => {
        console.error('Error al registrar compensación:', error)
        toast({
          title: 'Error',
          description: error.message || 'No se pudo registrar la compensación',
          variant: 'destructive',
        })
      },
    }
  )

  const originalAmount = parseFloat(falco.falcoAmount)
  const compensatedAmount = falco.falcoCompensatoryPayments.reduce(
    (sum, payment) => sum + parseFloat(payment.amount),
    0
  )
  const remainingFalco = originalAmount - compensatedAmount
  const inputAmount = parseFloat(amount || '0')
  const exceedsRemaining = inputAmount > remainingFalco

  const handleConfirm = () => {
    if (!amount || inputAmount <= 0) {
      toast({
        title: 'Error',
        description: 'Ingresa un monto válido',
        variant: 'destructive',
      })
      return
    }

    if (exceedsRemaining) {
      toast({
        title: 'Error',
        description: `El monto no puede exceder el pendiente (${formatCurrency(remainingFalco)})`,
        variant: 'destructive',
      })
      return
    }

    createFalcoCompensatoryPayment({
      variables: {
        input: {
          leadPaymentReceivedId: falco.id,
          amount: amount,
        },
      },
    })
  }

  const handleSetFullAmount = () => {
    setAmount(remainingFalco.toString())
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !loading && onOpenChange(o)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Registrar Compensación
          </DialogTitle>
          <DialogDescription>
            Registrar pago de compensación para el falco de {falco.lead.personalData.fullName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Falco Info */}
          <div className="p-4 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-lg">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Monto Original:</span>
                <span className="font-medium">{formatCurrency(originalAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ya Compensado:</span>
                <span className="font-medium text-green-600">{formatCurrency(compensatedAmount)}</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="text-muted-foreground font-medium">Pendiente:</span>
                <span className="font-bold text-orange-600">{formatCurrency(remainingFalco)}</span>
              </div>
            </div>
          </div>

          {/* Amount Input */}
          <div className="space-y-2">
            <Label htmlFor="compensation-amount">Monto a compensar:</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  id="compensation-amount"
                  type="number"
                  min="0"
                  max={remainingFalco}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className={`pl-7 ${exceedsRemaining ? 'border-red-500 border-2' : ''}`}
                  placeholder="0.00"
                  onWheel={(e) => e.currentTarget.blur()}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSetFullAmount}
                className="whitespace-nowrap"
              >
                Pago Total
              </Button>
            </div>
            {exceedsRemaining && (
              <p className="text-xs text-red-600">
                El monto excede el pendiente ({formatCurrency(remainingFalco)})
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={loading || !amount || inputAmount <= 0 || exceedsRemaining}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Registrando...
              </>
            ) : (
              'Confirmar'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
