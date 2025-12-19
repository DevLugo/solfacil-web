import { Button } from '@/components/ui/button'
import { Loader2, Save, X } from 'lucide-react'

interface ActionButtonsProps {
  onSubmit: () => void
  onClear: () => void
  isSubmitting: boolean
  canSubmit: boolean
}

export function ActionButtons({
  onSubmit,
  onClear,
  isSubmitting,
  canSubmit,
}: ActionButtonsProps) {
  return (
    <div className="flex gap-3 justify-end">
      <Button
        type="button"
        variant="outline"
        onClick={onClear}
        disabled={isSubmitting}
      >
        <X className="h-4 w-4 mr-2" />
        Limpiar
      </Button>
      <Button
        type="button"
        onClick={onSubmit}
        disabled={!canSubmit || isSubmitting}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Creando Líder...
          </>
        ) : (
          <>
            <Save className="h-4 w-4 mr-2" />
            Crear Líder
          </>
        )}
      </Button>
    </div>
  )
}
