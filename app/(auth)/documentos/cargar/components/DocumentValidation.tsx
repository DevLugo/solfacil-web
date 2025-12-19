import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { CheckCircle, XCircle, AlertTriangle, Loader2 } from 'lucide-react'
import { useDocumentUpload } from '../hooks/useDocumentUpload'

interface DocumentValidationProps {
  documentId: string
  loanId: string
  currentStatus?: {
    isError: boolean
    isMissing: boolean
    errorDescription?: string
  }
  onSuccess?: () => void
  onCancel?: () => void
}

/**
 * Component for validating documents
 * Allows marking documents as correct, error, or missing
 */
export function DocumentValidation({
  documentId,
  loanId,
  currentStatus,
  onSuccess,
  onCancel,
}: DocumentValidationProps) {
  const [errorDescription, setErrorDescription] = useState(
    currentStatus?.errorDescription || ''
  )
  const { handleValidation, isUpdating } = useDocumentUpload(loanId)

  const handleMarkAs = async (status: 'correct' | 'error' | 'missing') => {
    try {
      await handleValidation(documentId, {
        isError: status === 'error',
        isMissing: status === 'missing',
        errorDescription: status === 'error' ? errorDescription : undefined,
      })

      onSuccess?.()
    } catch (error) {
      // Error is handled by the hook
      console.error('Validation failed:', error)
    }
  }

  return (
    <div className="space-y-6">
      {/* Validation buttons */}
      <div className="space-y-3">
        <Label>Estado del documento</Label>

        <div className="grid gap-3">
          <Button
            type="button"
            onClick={() => handleMarkAs('correct')}
            disabled={isUpdating}
            variant={currentStatus?.isError === false && !currentStatus?.isMissing ? 'default' : 'outline'}
            className="justify-start"
          >
            <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
            Marcar como correcto
          </Button>

          <Button
            type="button"
            onClick={() => handleMarkAs('error')}
            disabled={isUpdating || !errorDescription.trim()}
            variant={currentStatus?.isError ? 'destructive' : 'outline'}
            className="justify-start"
          >
            <XCircle className="h-4 w-4 mr-2" />
            Marcar con error
          </Button>

          <Button
            type="button"
            onClick={() => handleMarkAs('missing')}
            disabled={isUpdating}
            variant={currentStatus?.isMissing ? 'destructive' : 'outline'}
            className="justify-start"
          >
            <AlertTriangle className="h-4 w-4 mr-2" />
            Marcar como faltante
          </Button>
        </div>
      </div>

      {/* Error description */}
      <div className="space-y-2">
        <Label htmlFor="error-description">
          Descripción del error (opcional)
        </Label>
        <Textarea
          id="error-description"
          value={errorDescription}
          onChange={(e) => setErrorDescription(e.target.value)}
          placeholder="Describe el problema con el documento..."
          rows={3}
          disabled={isUpdating}
        />
        <p className="text-xs text-muted-foreground">
          Requerido si marcas el documento con error
        </p>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isUpdating}
            className="flex-1"
          >
            Cancelar
          </Button>
        )}

        {isUpdating && (
          <div className="flex items-center justify-center gap-2 flex-1 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Guardando...</span>
          </div>
        )}
      </div>
    </div>
  )
}
