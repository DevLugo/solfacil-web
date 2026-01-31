'use client'

import { useState, useCallback } from 'react'
import { useLazyQuery, useMutation, useQuery } from '@apollo/client'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  PREVIEW_BULK_DATE_MIGRATION,
  EXECUTE_BULK_DATE_MIGRATION,
} from '@/graphql/mutations/bulkDateMigration'
import { ROUTES_QUERY } from '@/graphql/queries/transactions'

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

  const { data: routesData } = useQuery(ROUTES_QUERY)
  const routes = routesData?.routes || []

  const [selectedRoute, setSelectedRoute] = useState('')
  const [sourceDate, setSourceDate] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [previewData, setPreviewData] = useState<any>(null)
  const [showConfirm, setShowConfirm] = useState(false)

  const resetPreview = useCallback(() => {
    setPreviewData(null)
    setShowConfirm(false)
  }, [])

  const showToast = useCallback((title: string, description: string, variant?: 'destructive') => {
    toast({ title, description, variant })
  }, [toast])

  const [previewMigration, { loading: previewing }] = useLazyQuery(
    PREVIEW_BULK_DATE_MIGRATION,
    {
      fetchPolicy: 'network-only',
      onCompleted: (data) => {
        const preview = data.previewBulkDateMigration
        setPreviewData(preview)

        if (preview.totalRecords > 0) {
          setShowConfirm(true)
        } else {
          showToast('Sin registros', 'No hay registros en esa fecha')
        }
      },
      onError: (error) => {
        showToast('Error al previsualizar', error.message, 'destructive')
      },
    }
  )

  const [executeMigration, { loading: executing }] = useMutation(
    EXECUTE_BULK_DATE_MIGRATION,
    {
      onCompleted: (data) => {
        showToast('Migración completada', data.executeBulkDateMigration.message)
        handleClose()
        onSuccess?.()
      },
      onError: (error) => {
        showToast('Error en la migración', error.message, 'destructive')
      },
    }
  )

  const buildMigrationInput = useCallback(() => {
    // Send dates at UTC midnight - backend will build the full day range
    // This avoids double normalization and timezone confusion
    const businessDate = new Date(`${sourceDate}T00:00:00.000Z`)
    const newBusinessDate = new Date(`${targetDate}T00:00:00.000Z`)

    return {
      // Send same date for start/end - backend will expand to full day
      startBusinessDate: businessDate.toISOString(),
      endBusinessDate: businessDate.toISOString(),
      newBusinessDate: newBusinessDate.toISOString(),
      routeId: selectedRoute,
    }
  }, [sourceDate, targetDate, selectedRoute])

  const handlePreview = useCallback(() => {
    if (!sourceDate || !targetDate) {
      showToast('Campos requeridos', 'Selecciona ambas fechas', 'destructive')
      return
    }

    if (sourceDate === targetDate) {
      showToast('Fechas iguales', 'Las fechas origen y destino deben ser diferentes', 'destructive')
      return
    }

    previewMigration({
      variables: { input: buildMigrationInput() },
    })
  }, [sourceDate, targetDate, buildMigrationInput, previewMigration, showToast])

  const handleExecute = useCallback(() => {
    executeMigration({
      variables: { input: buildMigrationInput() },
    })
  }, [buildMigrationInput, executeMigration])

  const handleClose = useCallback(() => {
    setSelectedRoute('')
    setSourceDate('')
    setTargetDate('')
    resetPreview()
    onOpenChange(false)
  }, [onOpenChange, resetPreview])

  const formatDisplayDate = useCallback((dateStr: string) => {
    if (!dateStr) return ''
    return format(new Date(dateStr + 'T12:00:00'), "d 'de' MMMM", { locale: es })
  }, [])

  const handleRouteChange = useCallback((value: string) => {
    setSelectedRoute(value)
    resetPreview()
  }, [resetPreview])

  const handleSourceDateChange = useCallback((value: string) => {
    setSourceDate(value)
    resetPreview()
  }, [resetPreview])

  const handleTargetDateChange = useCallback((value: string) => {
    setTargetDate(value)
    resetPreview()
  }, [resetPreview])

  const isPreviewDisabled = previewing || !selectedRoute || !sourceDate || !targetDate

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
          <div className="space-y-2">
            <Label htmlFor="route">
              Ruta <span className="text-destructive">*</span>
            </Label>
            <Select value={selectedRoute} onValueChange={handleRouteChange}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona una ruta" />
              </SelectTrigger>
              <SelectContent>
                {routes.map((route: { id: string; name: string }) => (
                  <SelectItem key={route.id} value={route.id}>
                    {route.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end gap-3">
            <div className="flex-1 space-y-2">
              <Label htmlFor="sourceDate">De</Label>
              <Input
                id="sourceDate"
                type="date"
                value={sourceDate}
                onChange={(e) => handleSourceDateChange(e.target.value)}
              />
            </div>
            <ArrowRight className="h-5 w-5 mb-2.5 text-muted-foreground" />
            <div className="flex-1 space-y-2">
              <Label htmlFor="targetDate">A</Label>
              <Input
                id="targetDate"
                type="date"
                value={targetDate}
                onChange={(e) => handleTargetDateChange(e.target.value)}
              />
            </div>
          </div>

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
            <Button onClick={handlePreview} disabled={isPreviewDisabled}>
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
