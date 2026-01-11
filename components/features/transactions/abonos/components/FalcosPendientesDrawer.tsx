'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { AlertTriangle, Loader2, DollarSign, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
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
import { formatCurrency } from '@/lib/utils'
import { CompensacionModal } from './CompensacionModal'
import { NuevoFalcoModal } from './NuevoFalcoModal'

interface FalcoPendiente {
  id: string
  falcoAmount: string
  createdAt: string
  lead: {
    id: string
    personalData: {
      id: string
      fullName: string
    }
  }
  falcoCompensatoryPayments: {
    id: string
    amount: string
    createdAt: string
  }[]
}

interface CurrentLprData {
  id: string
  cashPaidAmount: string
  falcoAmount: string
}

interface FalcosPendientesDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  falcosPendientes: FalcoPendiente[]
  isLoading: boolean
  onCompensationCreated: () => void
  // Props for creating/deleting Falcos on current LPR
  currentLprData?: CurrentLprData | null
  isCreatingFalco?: boolean
  onCreateFalco?: (amount: number) => Promise<void>
  isDeletingFalco?: boolean
  onDeleteFalco?: (lprId: string) => Promise<void>
}

export function FalcosPendientesDrawer({
  open,
  onOpenChange,
  falcosPendientes,
  isLoading,
  onCompensationCreated,
  currentLprData,
  isCreatingFalco = false,
  onCreateFalco,
  isDeletingFalco = false,
  onDeleteFalco,
}: FalcosPendientesDrawerProps) {
  const [selectedFalco, setSelectedFalco] = useState<FalcoPendiente | null>(null)
  const [showCompensacionModal, setShowCompensacionModal] = useState(false)
  const [showNuevoFalcoModal, setShowNuevoFalcoModal] = useState(false)
  const [falcoToDelete, setFalcoToDelete] = useState<FalcoPendiente | null>(null)

  const calculateRemainingFalco = (falco: FalcoPendiente) => {
    const originalAmount = parseFloat(falco.falcoAmount)
    const compensatedAmount = falco.falcoCompensatoryPayments.reduce(
      (sum, payment) => sum + parseFloat(payment.amount),
      0
    )
    return originalAmount - compensatedAmount
  }

  const handleOpenCompensacion = (falco: FalcoPendiente) => {
    setSelectedFalco(falco)
    setShowCompensacionModal(true)
  }

  const handleCompensacionSuccess = () => {
    setShowCompensacionModal(false)
    setSelectedFalco(null)
    onCompensationCreated()
  }

  const handleCreateFalco = async (amount: number) => {
    if (onCreateFalco) {
      await onCreateFalco(amount)
      setShowNuevoFalcoModal(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (falcoToDelete && onDeleteFalco) {
      await onDeleteFalco(falcoToDelete.id)
      setFalcoToDelete(null)
    }
  }

  // Check if current LPR has an active Falco
  const currentLprHasFalco = currentLprData && parseFloat(currentLprData.falcoAmount || '0') > 0
  const canCreateFalco = currentLprData && !currentLprHasFalco && onCreateFalco
  const maxFalcoAmount = currentLprData ? parseFloat(currentLprData.cashPaidAmount || '0') : 0

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-[420px] sm:w-[480px]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Falcos Pendientes
            </SheetTitle>
            <SheetDescription>
              Gestiona los faltantes de caja pendientes de compensación
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-4 max-h-[calc(100vh-180px)] overflow-y-auto pr-2">
            {/* Create new Falco section */}
            {canCreateFalco && (
              <Card className="border-dashed border-orange-300 dark:border-orange-700 bg-orange-50/50 dark:bg-orange-950/20">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-orange-700 dark:text-orange-400">
                        Registrar nuevo faltante
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Efectivo disponible: {formatCurrency(maxFalcoAmount)}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-orange-300 text-orange-700 hover:bg-orange-100 dark:border-orange-700 dark:text-orange-400 dark:hover:bg-orange-950/50"
                      onClick={() => setShowNuevoFalcoModal(true)}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Nuevo Falco
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Current LPR Falco notice */}
            {currentLprHasFalco && (
              <Card className="border-orange-300 dark:border-orange-700 bg-orange-50/50 dark:bg-orange-950/20">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-orange-700 dark:text-orange-400">
                        Falco del día actual
                      </p>
                      <p className="text-sm text-orange-600 dark:text-orange-500">
                        {formatCurrency(parseFloat(currentLprData!.falcoAmount))}
                      </p>
                    </div>
                    <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-300">
                      Activo
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* List of pending Falcos */}
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground mt-2">Cargando falcos...</p>
              </div>
            ) : falcosPendientes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <DollarSign className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground">No hay falcos pendientes</p>
                {!canCreateFalco && !currentLprHasFalco && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Primero guarda los abonos del día para poder registrar un falco
                  </p>
                )}
              </div>
            ) : (
              falcosPendientes.map((falco) => {
                const remainingFalco = calculateRemainingFalco(falco)
                const compensatedAmount = parseFloat(falco.falcoAmount) - remainingFalco
                const percentageCompensated = (compensatedAmount / parseFloat(falco.falcoAmount)) * 100
                const hasCompensations = falco.falcoCompensatoryPayments.length > 0
                const canDelete = !hasCompensations && onDeleteFalco

                return (
                  <Card key={falco.id} className="border-orange-200 dark:border-orange-800/50">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="font-medium">{falco.lead.personalData.fullName}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(falco.createdAt), "d 'de' MMMM yyyy", { locale: es })}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-300 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-700">
                            {formatCurrency(remainingFalco)} pendiente
                          </Badge>
                          {canDelete && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => setFalcoToDelete(falco)}
                              disabled={isDeletingFalco}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Monto Original:</span>
                          <span className="font-medium">{formatCurrency(parseFloat(falco.falcoAmount))}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Compensado:</span>
                          <span className="font-medium text-green-600">
                            {formatCurrency(compensatedAmount)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Pendiente:</span>
                          <span className="font-medium text-orange-600">
                            {formatCurrency(remainingFalco)}
                          </span>
                        </div>

                        {/* Progress bar */}
                        <div className="mt-2">
                          <div className="w-full h-2 bg-orange-100 dark:bg-orange-950/50 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-green-500 transition-all duration-300"
                              style={{ width: `${percentageCompensated}%` }}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground text-right mt-1">
                            {percentageCompensated.toFixed(0)}% compensado
                          </p>
                        </div>

                        {/* Compensatory payments history */}
                        {falco.falcoCompensatoryPayments.length > 0 && (
                          <div className="mt-3 pt-3 border-t">
                            <p className="text-xs text-muted-foreground mb-2">Pagos de compensación:</p>
                            <div className="space-y-1">
                              {falco.falcoCompensatoryPayments.map((payment) => (
                                <div key={payment.id} className="flex justify-between text-xs">
                                  <span className="text-muted-foreground">
                                    {format(new Date(payment.createdAt), "d MMM yyyy", { locale: es })}
                                  </span>
                                  <span className="text-green-600">+{formatCurrency(parseFloat(payment.amount))}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <Button
                        size="sm"
                        className="w-full mt-4"
                        onClick={() => handleOpenCompensacion(falco)}
                      >
                        <DollarSign className="h-4 w-4 mr-1" />
                        Registrar Pago
                      </Button>
                    </CardContent>
                  </Card>
                )
              })
            )}
          </div>
        </SheetContent>
      </Sheet>

      {selectedFalco && (
        <CompensacionModal
          open={showCompensacionModal}
          onOpenChange={setShowCompensacionModal}
          falco={selectedFalco}
          onSuccess={handleCompensacionSuccess}
        />
      )}

      <NuevoFalcoModal
        open={showNuevoFalcoModal}
        onOpenChange={setShowNuevoFalcoModal}
        isSubmitting={isCreatingFalco}
        onConfirm={handleCreateFalco}
        maxAmount={maxFalcoAmount > 0 ? maxFalcoAmount : undefined}
      />

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!falcoToDelete} onOpenChange={(open) => !open && setFalcoToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Falco</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de eliminar este faltante de caja de{' '}
              <strong>{falcoToDelete && formatCurrency(parseFloat(falcoToDelete.falcoAmount))}</strong>?
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingFalco}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeletingFalco}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeletingFalco ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Eliminando...
                </>
              ) : (
                'Eliminar'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
