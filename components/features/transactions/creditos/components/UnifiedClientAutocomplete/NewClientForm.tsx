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
    <div className={cn('space-y-4 p-4 md:p-5 border-2 rounded-lg touch-manipulation', newClientStyles.container, className)}>
      <div className="flex items-center justify-between">
        <div className={cn('flex items-center gap-2', newClientStyles.icon)}>
          <div className={cn('flex h-10 w-10 items-center justify-center rounded-full', newClientStyles.avatar)}>
            <UserPlus className="h-5 w-5" />
          </div>
          <span className="font-semibold text-base md:text-lg">
            Nuevo {mode === 'borrower' ? 'cliente' : 'aval'}
          </span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-10 w-10 md:h-11 md:w-11 text-muted-foreground hover:text-foreground"
          onClick={onCancel}
        >
          <X className="h-5 w-5" />
        </Button>
      </div>
      <div className="space-y-4">
        <div>
          <Label className="text-sm md:text-base font-medium">Nombre completo</Label>
          <Input
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="Ej: Juan Pérez García"
            className="mt-1.5 h-11 md:h-12 text-base"
            autoFocus
          />
        </div>
        <div>
          <Label className="text-sm md:text-base font-medium">Teléfono (opcional)</Label>
          <Input
            value={phone}
            onChange={(e) => onPhoneChange(e.target.value)}
            placeholder="Ej: 5512345678"
            inputMode="tel"
            className="mt-1.5 h-11 md:h-12 text-base"
          />
        </div>
      </div>
      <div className="flex gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="flex-1 h-11 md:h-12 text-base"
        >
          Cancelar
        </Button>
        <Button
          type="button"
          onClick={onConfirm}
          disabled={!name.trim()}
          className="flex-1 h-11 md:h-12 text-base bg-info hover:bg-info/90"
        >
          <Check className="h-5 w-5 mr-2" />
          Confirmar
        </Button>
      </div>
    </div>
  )
}
