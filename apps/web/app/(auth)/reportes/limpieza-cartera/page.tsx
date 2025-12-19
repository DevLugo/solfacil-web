'use client'

import { useState } from 'react'
import { useQuery } from '@apollo/client'
import { useToast } from '@/hooks/use-toast'
import { GET_ROUTES } from '@/graphql/queries/reports'
import { usePortfolioCleanup, type PortfolioCleanup } from './hooks'
import {
  CleanupFilterForm,
  CleanupPreview,
  CleanupConfirmDialog,
  CleanupHistoryTable,
  CleanupEditDialog,
} from './components'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface Route {
  id: string
  name: string
}

export default function LimpiezaCarteraPage() {
  const { toast } = useToast()
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [currentMaxSignDate, setCurrentMaxSignDate] = useState<Date | null>(null)
  const [currentRouteId, setCurrentRouteId] = useState<string | undefined>()

  // Edit state
  const [editingCleanup, setEditingCleanup] = useState<PortfolioCleanup | null>(null)
  const [showEditDialog, setShowEditDialog] = useState(false)

  // Delete state
  const [deletingCleanup, setDeletingCleanup] = useState<PortfolioCleanup | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  // Fetch routes for filter
  const { data: routesData } = useQuery<{ routes: Route[] }>(GET_ROUTES)

  // Portfolio cleanup hook
  const {
    cleanups,
    cleanupsLoading,
    preview,
    previewLoading,
    getPreview,
    clearPreview,
    createCleanup,
    createLoading,
    updateCleanup,
    updateLoading,
    deleteCleanup,
    deleteLoading,
  } = usePortfolioCleanup()

  // Handle preview request
  const handlePreview = async (maxSignDate: Date, routeId?: string) => {
    setCurrentMaxSignDate(maxSignDate)
    setCurrentRouteId(routeId)
    await getPreview(maxSignDate, routeId)
  }

  // Handle cancel preview
  const handleCancelPreview = () => {
    clearPreview()
    setCurrentMaxSignDate(null)
    setCurrentRouteId(undefined)
  }

  // Handle confirm button in preview
  const handleProceed = () => {
    setShowConfirmDialog(true)
  }

  // Handle final confirmation
  const handleConfirm = async (name: string, description: string, cleanupDate: Date) => {
    if (!currentMaxSignDate) return

    try {
      await createCleanup({
        name,
        description,
        cleanupDate,
        maxSignDate: currentMaxSignDate,
        routeId: currentRouteId,
      })

      toast({
        title: 'Limpieza completada',
        description: `Se excluyeron ${preview?.totalLoans.toLocaleString()} prestamos exitosamente.`,
      })

      setShowConfirmDialog(false)
      handleCancelPreview()
    } catch {
      toast({
        title: 'Error',
        description: 'Ocurrio un error al ejecutar la limpieza.',
        variant: 'destructive',
      })
    }
  }

  // Handle edit
  const handleEdit = (cleanup: PortfolioCleanup) => {
    setEditingCleanup(cleanup)
    setShowEditDialog(true)
  }

  const handleSaveEdit = async (id: string, data: { name: string; description: string; cleanupDate: Date }) => {
    try {
      await updateCleanup(id, data)
      toast({
        title: 'Limpieza actualizada',
        description: 'Los cambios se guardaron correctamente.',
      })
      setShowEditDialog(false)
      setEditingCleanup(null)
    } catch {
      toast({
        title: 'Error',
        description: 'Ocurrio un error al actualizar la limpieza.',
        variant: 'destructive',
      })
    }
  }

  // Handle delete
  const handleDelete = (cleanup: PortfolioCleanup) => {
    setDeletingCleanup(cleanup)
    setShowDeleteDialog(true)
  }

  const handleConfirmDelete = async () => {
    if (!deletingCleanup) return

    try {
      await deleteCleanup(deletingCleanup.id)
      toast({
        title: 'Limpieza eliminada',
        description: `La limpieza "${deletingCleanup.name}" fue eliminada.`,
      })
      setShowDeleteDialog(false)
      setDeletingCleanup(null)
    } catch {
      toast({
        title: 'Error',
        description: 'Ocurrio un error al eliminar la limpieza.',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Limpieza de Cartera</h1>
        <p className="text-muted-foreground">
          Excluye prestamos antiguos de los reportes de cartera activa
        </p>
      </div>

      {/* Filter Form */}
      {!preview && (
        <CleanupFilterForm
          routes={routesData?.routes || []}
          onPreview={handlePreview}
          isLoading={previewLoading}
        />
      )}

      {/* Preview */}
      {preview && (
        <CleanupPreview
          preview={preview}
          onCancel={handleCancelPreview}
          onConfirm={handleProceed}
        />
      )}

      {/* Confirm Dialog */}
      {preview && currentMaxSignDate && (
        <CleanupConfirmDialog
          open={showConfirmDialog}
          onOpenChange={setShowConfirmDialog}
          totalLoans={preview.totalLoans}
          totalAmount={preview.totalPendingAmount}
          maxSignDate={currentMaxSignDate}
          onConfirm={handleConfirm}
          isLoading={createLoading}
        />
      )}

      {/* History */}
      <CleanupHistoryTable
        cleanups={cleanups}
        isLoading={cleanupsLoading}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {/* Edit Dialog */}
      <CleanupEditDialog
        cleanup={editingCleanup}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        onSave={handleSaveEdit}
        isLoading={updateLoading}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Limpieza</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estas seguro de eliminar la limpieza &quot;{deletingCleanup?.name}&quot;?
              <br />
              <span className="text-sm">
                Esto desvinculara {deletingCleanup?.excludedLoansCount.toLocaleString()} prestamos de esta limpieza,
                pero los prestamos seguiran excluidos de los reportes.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleteLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteLoading ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
