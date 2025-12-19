'use client'

import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface SuccessDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  isCapitalInvestment: boolean
}

export function SuccessDialog({ open, onOpenChange, isCapitalInvestment }: SuccessDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Check className="h-5 w-5 text-green-600" />
            {isCapitalInvestment ? 'Inversion Completada' : 'Transferencia Completada'}
          </DialogTitle>
          <DialogDescription>
            {isCapitalInvestment
              ? 'La inversion de capital se ha registrado correctamente.'
              : 'La transferencia se ha realizado correctamente.'}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Aceptar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
