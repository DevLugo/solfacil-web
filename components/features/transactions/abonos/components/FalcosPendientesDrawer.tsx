'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { AlertTriangle, Loader2, DollarSign } from 'lucide-react'
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
import { formatCurrency } from '@/lib/utils'
import { CompensacionModal } from './CompensacionModal'

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

interface FalcosPendientesDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  falcosPendientes: FalcoPendiente[]
  isLoading: boolean
  onCompensationCreated: () => void
}

export function FalcosPendientesDrawer({
  open,
  onOpenChange,
  falcosPendientes,
  isLoading,
  onCompensationCreated,
}: FalcosPendientesDrawerProps) {
  const [selectedFalco, setSelectedFalco] = useState<FalcoPendiente | null>(null)
  const [showCompensacionModal, setShowCompensacionModal] = useState(false)

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
              Lista de falcos pendientes de compensación
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-4 max-h-[calc(100vh-180px)] overflow-y-auto pr-2">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground mt-2">Cargando falcos...</p>
              </div>
            ) : falcosPendientes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <DollarSign className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground">No hay falcos pendientes</p>
              </div>
            ) : (
              falcosPendientes.map((falco) => {
                const remainingFalco = calculateRemainingFalco(falco)
                const compensatedAmount = parseFloat(falco.falcoAmount) - remainingFalco
                const percentageCompensated = (compensatedAmount / parseFloat(falco.falcoAmount)) * 100

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
                        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-300 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-700">
                          {formatCurrency(remainingFalco)} pendiente
                        </Badge>
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
    </>
  )
}
