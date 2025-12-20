'use client'

import { useState } from 'react'
import { useLazyQuery, useMutation } from '@apollo/client'
import { Loader2, Database, AlertTriangle } from 'lucide-react'
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

  // Form state
  const [startDate, setStartDate] = useState('')
  const [startTime, setStartTime] = useState('00:00')
  const [endDate, setEndDate] = useState('')
  const [endTime, setEndTime] = useState('23:59')
  const [newBusinessDate, setNewBusinessDate] = useState('')

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
            description: 'No hay registros para migrar en el rango seleccionado',
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

  const handlePreview = () => {
    if (!startDate || !endDate || !newBusinessDate) {
      toast({
        title: 'Campos requeridos',
        description: 'Por favor completa todos los campos',
        variant: 'destructive',
      })
      return
    }

    const startCreatedAt = new Date(`${startDate}T${startTime}:00`)
    const endCreatedAt = new Date(`${endDate}T${endTime}:59`)
    const newDate = new Date(`${newBusinessDate}T06:00:00`)

    previewMigration({
      variables: {
        input: {
          startCreatedAt,
          endCreatedAt,
          newBusinessDate: newDate,
          routeId: selectedRouteId || undefined,
        },
      },
    })
  }

  const handleExecute = () => {
    const startCreatedAt = new Date(`${startDate}T${startTime}:00`)
    const endCreatedAt = new Date(`${endDate}T${endTime}:59`)
    const newDate = new Date(`${newBusinessDate}T06:00:00`)

    executeMigration({
      variables: {
        input: {
          startCreatedAt,
          endCreatedAt,
          newBusinessDate: newDate,
          routeId: selectedRouteId || undefined,
        },
      },
    })
  }

  const handleClose = () => {
    setStartDate('')
    setStartTime('00:00')
    setEndDate('')
    setEndTime('23:59')
    setNewBusinessDate('')
    setPreviewData(null)
    setShowConfirm(false)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Migración de Fechas en Lote
          </DialogTitle>
          <DialogDescription>
            Mueve todos los datos capturados en un rango de tiempo a una nueva fecha de negocio
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Warning Alert */}
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Esta operación es irreversible. Asegúrate de seleccionar el rango correcto antes de
              ejecutar.
            </AlertDescription>
          </Alert>

          {/* Route Filter Indicator */}
          {selectedRouteId ? (
            <Alert>
              <Database className="h-4 w-4" />
              <AlertDescription>
                Filtrando por la ruta actualmente seleccionada
              </AlertDescription>
            </Alert>
          ) : (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Sin ruta seleccionada. Se migrarán datos de TODAS las rutas.
              </AlertDescription>
            </Alert>
          )}

          {/* Date Range Selection */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Rango de Creación (createdAt)</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Fecha Inicio</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="startTime">Hora Inicio</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">Fecha Fin</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endTime">Hora Fin</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* New Business Date */}
          <div className="space-y-2">
            <Label htmlFor="newBusinessDate">Nueva Fecha de Negocio</Label>
            <Input
              id="newBusinessDate"
              type="date"
              value={newBusinessDate}
              onChange={(e) => setNewBusinessDate(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Todos los registros se moverán a esta fecha (actualiza date, receivedAt, signDate)
            </p>
          </div>

          {/* Preview Results */}
          {previewData && (
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <h3 className="font-semibold text-sm">Vista Previa</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>Transacciones:</div>
                <div className="font-mono">{previewData.transactionsCount}</div>
                <div>Abonos:</div>
                <div className="font-mono">{previewData.loanPaymentsCount}</div>
                <div>Créditos:</div>
                <div className="font-mono">{previewData.loansCount}</div>
                <div className="font-bold">Total:</div>
                <div className="font-mono font-bold">{previewData.totalRecords}</div>
              </div>
            </div>
          )}

          {/* Confirmation Step */}
          {showConfirm && (
            <Alert>
              <AlertDescription className="text-sm">
                ¿Estás seguro de migrar {previewData.totalRecords} registros a la fecha{' '}
                {format(new Date(newBusinessDate), "d 'de' MMMM, yyyy", { locale: es })}?
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} disabled={executing}>
            Cancelar
          </Button>
          {!showConfirm ? (
            <Button onClick={handlePreview} disabled={previewing}>
              {previewing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Previsualizar
            </Button>
          ) : (
            <Button onClick={handleExecute} disabled={executing} variant="destructive">
              {executing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Ejecutar Migración
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
