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
  savedCount: number
}

export function SuccessDialog({ open, onOpenChange, savedCount }: SuccessDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Check className="h-5 w-5 text-green-600" />
            Abonos Guardados
          </DialogTitle>
          <DialogDescription>
            Se guardaron {savedCount} abono(s) correctamente.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Aceptar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
