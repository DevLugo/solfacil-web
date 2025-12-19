'use client'

import { Pencil, X, Check, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

interface EditClientFormProps {
  mode: 'borrower' | 'aval'
  name: string
  phone: string
  isSaving: boolean
  onNameChange: (name: string) => void
  onPhoneChange: (phone: string) => void
  onConfirm: () => void
  onCancel: () => void
  className?: string
}

export function EditClientForm({
  mode,
  name,
  phone,
  isSaving,
  onNameChange,
  onPhoneChange,
  onConfirm,
  onCancel,
  className,
}: EditClientFormProps) {
  return (
    <div className={cn('space-y-3 p-3 md:p-4 border rounded-lg bg-muted/50 touch-manipulation', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Pencil className="h-4 w-4" />
          <span className="text-sm font-medium">
            Editando {mode === 'borrower' ? 'cliente' : 'aval'}
          </span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={onCancel}
          disabled={isSaving}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <Label className="text-xs text-muted-foreground">Nombre completo</Label>
          <Input
            value={name}
            onChange={(e) => onNameChange(e.target.value.toUpperCase())}
            placeholder="Nombre"
            className="mt-1 h-10 text-sm"
            autoFocus
            disabled={isSaving}
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Teléfono</Label>
          <Input
            value={phone}
            onChange={(e) => onPhoneChange(e.target.value)}
            placeholder="Teléfono"
            inputMode="tel"
            className="mt-1 h-10 text-sm"
            disabled={isSaving}
          />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onCancel}
          disabled={isSaving}
        >
          Cancelar
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={onConfirm}
          disabled={!name.trim() || isSaving}
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Check className="h-4 w-4 mr-1.5" />
              Guardar
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
