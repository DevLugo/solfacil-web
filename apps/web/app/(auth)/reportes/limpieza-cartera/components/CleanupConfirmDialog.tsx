'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { CalendarIcon, Loader2, AlertTriangle } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface CleanupConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  totalLoans: number
  totalAmount: string
  maxSignDate: Date
  onConfirm: (name: string, description: string, cleanupDate: Date) => void
  isLoading?: boolean
}

function formatCurrency(value: string | number): string {
  const num = typeof value === 'string' ? parseFloat(value) : value
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(num)
}

export function CleanupConfirmDialog({
  open,
  onOpenChange,
  totalLoans,
  totalAmount,
  maxSignDate,
  onConfirm,
  isLoading = false,
}: CleanupConfirmDialogProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [cleanupDate, setCleanupDate] = useState<Date>(new Date())
  const [confirmText, setConfirmText] = useState('')

  const isValid = name.trim().length > 0 && confirmText === 'CONFIRMAR'

  const handleConfirm = () => {
    if (!isValid) return
    onConfirm(name.trim(), description.trim(), cleanupDate)
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset form when closing
      setName('')
      setDescription('')
      setCleanupDate(new Date())
      setConfirmText('')
    }
    onOpenChange(newOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Confirmar Limpieza de Cartera
          </DialogTitle>
          <DialogDescription>
            Esta accion marcara {totalLoans.toLocaleString()} prestamos como excluidos de los reportes de cartera.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Resumen:</strong> Se excluiran {totalLoans.toLocaleString()} prestamos
              con un monto total de {formatCurrency(totalAmount)}.
              <br />
              <span className="text-xs">
                (Fecha firma ≤ {format(maxSignDate, 'dd/MM/yyyy', { locale: es })})
              </span>
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="name">Nombre de la Limpieza *</Label>
            <Input
              id="name"
              placeholder="Ej: Limpieza cartera 2023"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripcion (opcional)</Label>
            <Textarea
              id="description"
              placeholder="Notas adicionales sobre esta limpieza..."
              value={description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Fecha Efectiva</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn('w-full justify-start text-left font-normal')}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(cleanupDate, 'PPP', { locale: es })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={cleanupDate}
                  onSelect={(date) => date && setCleanupDate(date)}
                  initialFocus
                  locale={es}
                  captionLayout="dropdown"
                  fromYear={2015}
                  toYear={new Date().getFullYear() + 1}
                />
              </PopoverContent>
            </Popover>
            <p className="text-xs text-muted-foreground">
              Fecha desde la cual aplica la limpieza (puede ser en el pasado)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm">
              Escribe <span className="font-bold text-destructive">CONFIRMAR</span> para continuar
            </Label>
            <Input
              id="confirm"
              placeholder="CONFIRMAR"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isLoading}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!isValid || isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Procesando...
              </>
            ) : (
              'Ejecutar Limpieza'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
