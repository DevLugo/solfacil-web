'use client'

import { useState } from 'react'
import { useLazyQuery, useMutation } from '@apollo/client'
import { Loader2, ArrowRight, AlertTriangle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  PREVIEW_BULK_DATE_MIGRATION,
  EXECUTE_BULK_DATE_MIGRATION,
} from '@/graphql/mutations/bulkDateMigration'
import { useTransactionContext } from '../transaction-context'

interface BulkDateMigrationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function BulkDateMigrationModal({
  open,
  onOpenChange,
  onSuccess,
}: BulkDateMigrationModalProps) {
  const { toast } = useToast()
  const { selectedRouteId } = useTransactionContext()

  // Form state - simplified to just two dates
  const [sourceDate, setSourceDate] = useState('')
  const [targetDate, setTargetDate] = useState('')

  // Preview state
  const [previewData, setPreviewData] = useState<any>(null)
  const [showConfirm, setShowConfirm] = useState(false)

  // GraphQL hooks
  const [previewMigration, { loading: previewing }] = useLazyQuery(
    PREVIEW_BULK_DATE_MIGRATION,
    {
      fetchPolicy: 'network-only',
      onCompleted: (data) => {
        setPreviewData(data.previewBulkDateMigration)
        if (data.previewBulkDateMigration.totalRecords > 0) {
          setShowConfirm(true)
        } else {
          toast({
            title: 'Sin registros',
            description: 'No hay registros en esa fecha',
          })
        }
      },
      onError: (error) => {
        toast({
          title: 'Error al previsualizar',
          description: error.message,
          variant: 'destructive',
        })
      },
    }
  )

  const [executeMigration, { loading: executing }] = useMutation(
    EXECUTE_BULK_DATE_MIGRATION,
    {
      onCompleted: (data) => {
        toast({
          title: 'Migración completada',
          description: data.executeBulkDateMigration.message,
        })
        handleClose()
        onSuccess?.()
      },
      onError: (error) => {
        toast({
          title: 'Error en la migración',
          description: error.message,
          variant: 'destructive',
        })
      },
    }
  )

  /**
   * Build migration input - source date covers the full day
   */
  const buildMigrationInput = () => {
    // Source: full day (00:00 to 23:59:59 Mexico time)
    const startBusinessDate = new Date(`${sourceDate}T00:00:00.000-06:00`)
    const endBusinessDate = new Date(`${sourceDate}T23:59:59.999-06:00`)
    // Target: normalized to 06:00 Mexico (12:00 UTC)
    const newDate = new Date(`${targetDate}T06:00:00.000-06:00`)

    return {
      startBusinessDate: startBusinessDate.toISOString(),
      endBusinessDate: endBusinessDate.toISOString(),
      newBusinessDate: newDate.toISOString(),
      routeId: selectedRouteId || undefined,
    }
  }

  const handlePreview = () => {
    if (!sourceDate || !targetDate) {
      toast({
        title: 'Campos requeridos',
        description: 'Selecciona ambas fechas',
        variant: 'destructive',
      })
      return
    }

    if (sourceDate === targetDate) {
      toast({
        title: 'Fechas iguales',
        description: 'Las fechas origen y destino deben ser diferentes',
        variant: 'destructive',
      })
      return
    }

    previewMigration({
      variables: {
        input: buildMigrationInput(),
      },
    })
  }

  const handleExecute = () => {
    executeMigration({
      variables: {
        input: buildMigrationInput(),
      },
    })
  }

  const handleClose = () => {
    setSourceDate('')
    setTargetDate('')
    setPreviewData(null)
    setShowConfirm(false)
    onOpenChange(false)
  }

  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return ''
    return format(new Date(dateStr + 'T12:00:00'), "d 'de' MMMM", { locale: es })
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Migrar Fecha</DialogTitle>
          <DialogDescription>
            Mueve todos los registros de una fecha a otra
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Route indicator */}
          {!selectedRouteId && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Sin ruta seleccionada. Se migrarán datos de TODAS las rutas.
              </AlertDescription>
            </Alert>
          )}

          {/* Date inputs */}
          <div className="flex items-end gap-3">
            <div className="flex-1 space-y-2">
              <Label htmlFor="sourceDate">De</Label>
              <Input
                id="sourceDate"
                type="date"
                value={sourceDate}
                onChange={(e) => {
                  setSourceDate(e.target.value)
                  setPreviewData(null)
                  setShowConfirm(false)
                }}
              />
            </div>
            <ArrowRight className="h-5 w-5 mb-2.5 text-muted-foreground" />
            <div className="flex-1 space-y-2">
              <Label htmlFor="targetDate">A</Label>
              <Input
                id="targetDate"
                type="date"
                value={targetDate}
                onChange={(e) => {
                  setTargetDate(e.target.value)
                  setPreviewData(null)
                  setShowConfirm(false)
                }}
              />
            </div>
          </div>

          {/* Preview Results */}
          {previewData && (
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm text-center">
                Se moverán <span className="font-bold">{previewData.totalRecords}</span> registros
                {previewData.loansCount > 0 && (
                  <span className="text-muted-foreground"> ({previewData.loansCount} créditos, {previewData.loanPaymentsCount} abonos)</span>
                )}
              </p>
            </div>
          )}

          {/* Confirmation */}
          {showConfirm && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                ¿Mover todo del {formatDisplayDate(sourceDate)} al {formatDisplayDate(targetDate)}? Esta acción es irreversible.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} disabled={executing}>
            Cancelar
          </Button>
          {!showConfirm ? (
            <Button onClick={handlePreview} disabled={previewing || !sourceDate || !targetDate}>
              {previewing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Ver registros
            </Button>
          ) : (
            <Button onClick={handleExecute} disabled={executing} variant="destructive">
              {executing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Migrar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
