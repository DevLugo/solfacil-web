import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { AlertTriangle } from 'lucide-react'
import type { ExistingLeader } from '../types'

interface ExistingLeaderWarningProps {
  existingLeader: ExistingLeader
  replaceExisting: boolean
  onToggleReplace: (checked: boolean) => void
}

export function ExistingLeaderWarning({
  existingLeader,
  replaceExisting,
  onToggleReplace,
}: ExistingLeaderWarningProps) {
  return (
    <Alert variant="destructive">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Líder Existente Detectado</AlertTitle>
      <AlertDescription className="space-y-3">
        <p>
          Ya existe un líder activo en la localidad <strong>{existingLeader.locationName}</strong>:
        </p>
        <p className="font-semibold">{existingLeader.fullName}</p>
        <div className="flex items-start space-x-2 pt-2">
          <Checkbox
            id="replaceExisting"
            checked={replaceExisting}
            onCheckedChange={onToggleReplace}
          />
          <div className="grid gap-1.5 leading-none">
            <Label
              htmlFor="replaceExisting"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              Reemplazar líder existente
            </Label>
            <p className="text-sm text-muted-foreground">
              Los préstamos activos del líder anterior serán transferidos al nuevo líder.
              El líder anterior será removido del sistema.
            </p>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  )
}
