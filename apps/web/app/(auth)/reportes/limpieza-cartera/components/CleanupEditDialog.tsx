'use client'

import { useState, useEffect } from 'react'
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
import { CalendarIcon, Loader2, Pencil } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import type { PortfolioCleanup } from '../hooks'

interface CleanupEditDialogProps {
  cleanup: PortfolioCleanup | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (id: string, data: { name: string; description: string; cleanupDate: Date }) => void
  isLoading?: boolean
}

export function CleanupEditDialog({
  cleanup,
  open,
  onOpenChange,
  onSave,
  isLoading = false,
}: CleanupEditDialogProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [cleanupDate, setCleanupDate] = useState<Date>(new Date())

  // Reset form when cleanup changes
  useEffect(() => {
    if (cleanup) {
      setName(cleanup.name)
      setDescription(cleanup.description || '')
      setCleanupDate(new Date(cleanup.cleanupDate))
    }
  }, [cleanup])

  const handleSave = () => {
    if (!cleanup || !name.trim()) return
    onSave(cleanup.id, {
      name: name.trim(),
      description: description.trim(),
      cleanupDate,
    })
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && cleanup) {
      // Reset form when closing
      setName(cleanup.name)
      setDescription(cleanup.description || '')
      setCleanupDate(new Date(cleanup.cleanupDate))
    }
    onOpenChange(newOpen)
  }

  if (!cleanup) return null

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5" />
            Editar Limpieza
          </DialogTitle>
          <DialogDescription>
            Modifica los datos de la limpieza de cartera.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Nombre *</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-description">Descripcion</Label>
            <Textarea
              id="edit-description"
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
          </div>

          <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
            <p><strong>Prestamos excluidos:</strong> {cleanup.excludedLoansCount.toLocaleString()}</p>
            <p><strong>Fecha limite:</strong> {cleanup.toDate ? format(new Date(cleanup.toDate), 'dd/MM/yyyy', { locale: es }) : '-'}</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!name.trim() || isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              'Guardar Cambios'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
