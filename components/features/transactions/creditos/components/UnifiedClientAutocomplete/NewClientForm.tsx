'use client'

import { UserPlus, X, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { clientFormStateStyles } from '../../../shared/theme'

// Extract styles for new client form - uses info color scheme
const newClientStyles = clientFormStateStyles.newClient

interface NewClientFormProps {
  mode: 'borrower' | 'aval'
  name: string
  phone: string
  onNameChange: (name: string) => void
  onPhoneChange: (phone: string) => void
  onConfirm: () => void
  onCancel: () => void
  className?: string
}

export function NewClientForm({
  mode,
  name,
  phone,
  onNameChange,
  onPhoneChange,
  onConfirm,
  onCancel,
  className,
}: NewClientFormProps) {
  return (
    <div className={cn('space-y-3 p-3 md:p-4 border rounded-lg touch-manipulation', newClientStyles.container, className)}>
      <div className="flex items-center justify-between">
        <div className={cn('flex items-center gap-2', newClientStyles.icon)}>
          <UserPlus className="h-4 w-4" />
          <span className="text-sm font-medium">
            Nuevo {mode === 'borrower' ? 'cliente' : 'aval'}
          </span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={onCancel}
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
            className="mt-1 h-8 text-sm uppercase"
            autoFocus
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Teléfono (opcional)</Label>
          <Input
            value={phone}
            onChange={(e) => onPhoneChange(e.target.value)}
            placeholder="Teléfono"
            inputMode="tel"
            className="mt-1 h-8 text-sm"
          />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onCancel}
        >
          Cancelar
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={onConfirm}
          disabled={!name.trim()}
          className="bg-info hover:bg-info/90"
        >
          <Check className="h-4 w-4 mr-1.5" />
          Confirmar
        </Button>
      </div>
    </div>
  )
}
