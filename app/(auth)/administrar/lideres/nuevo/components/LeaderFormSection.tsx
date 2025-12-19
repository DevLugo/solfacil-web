import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import type { LeaderFormData } from '../types'

interface LeaderFormSectionProps {
  formData: LeaderFormData
  onChange: (field: keyof LeaderFormData, value: string | boolean) => void
}

export function LeaderFormSection({ formData, onChange }: LeaderFormSectionProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="fullName">
          Nombre Completo <span className="text-destructive">*</span>
        </Label>
        <Input
          id="fullName"
          type="text"
          placeholder="Ej: Juan Pérez García"
          value={formData.fullName}
          onChange={(e) => onChange('fullName', e.target.value)}
          required
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="birthDate">
            Fecha de Nacimiento
          </Label>
          <Input
            id="birthDate"
            type="date"
            value={formData.birthDate}
            onChange={(e) => onChange('birthDate', e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">
            Teléfono
          </Label>
          <Input
            id="phone"
            type="tel"
            placeholder="Ej: 5551234567"
            value={formData.phone}
            onChange={(e) => onChange('phone', e.target.value)}
          />
        </div>
      </div>
    </div>
  )
}
