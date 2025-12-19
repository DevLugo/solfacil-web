'use client'

import { useState, useMemo } from 'react'
import { useMutation } from '@apollo/client'
import { Loader2, ArrowRight, Check } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency } from '@/lib/utils'
import { DRAIN_ROUTES } from '@/graphql/mutations/batchTransfer'
import { useBatchTransferData, type Account } from '../hooks/useBatchTransferData'
import { RouteSelectionList } from './RouteSelectionList'

interface DrainRoutesModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => Promise<void>
}

export function DrainRoutesModal({ open, onOpenChange, onSuccess }: DrainRoutesModalProps) {
  const { toast } = useToast()
  const [destinationAccountId, setDestinationAccountId] = useState<string>('')

  const {
    routesWithBalance,
    officeAccounts,
    isLoading,
    selectedRouteIds,
    setSelectedRouteIds,
    handleSelectAll,
    handleRouteToggle,
  } = useBatchTransferData({ open, filterPositiveBalance: true })

  const [drainRoutes, { loading: draining }] = useMutation(DRAIN_ROUTES)

  // Calculate total to transfer
  const totalToTransfer = useMemo(() => {
    return routesWithBalance
      .filter((r) => selectedRouteIds.has(r.id))
      .reduce((sum, r) => sum + r.balance, 0)
  }, [routesWithBalance, selectedRouteIds])

  // Get destination account details
  const destinationAccount = useMemo(() => {
    if (!destinationAccountId) return null
    return officeAccounts.find((a) => a.id === destinationAccountId)
  }, [officeAccounts, destinationAccountId])

  const handleSubmit = async () => {
    if (selectedRouteIds.size === 0) {
      toast({ title: 'Error', description: 'Selecciona al menos una ruta', variant: 'destructive' })
      return
    }
    if (!destinationAccountId) {
      toast({ title: 'Error', description: 'Selecciona una cuenta destino', variant: 'destructive' })
      return
    }

    try {
      const result = await drainRoutes({
        variables: {
          input: {
            routeIds: Array.from(selectedRouteIds),
            destinationAccountId,
            description: 'Vaciado de rutas',
          },
        },
      })

      if (result.data?.drainRoutes.success) {
        toast({ title: 'Rutas vaciadas', description: result.data.drainRoutes.message })
        await onSuccess()
        onOpenChange(false)
        setSelectedRouteIds(new Set())
        setDestinationAccountId('')
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error al vaciar rutas',
        variant: 'destructive',
      })
    }
  }

  const canSubmit = selectedRouteIds.size > 0 && destinationAccountId && !draining

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Vaciar Rutas</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Destination Account */}
            <div className="space-y-2">
              <Label>Cuenta Destino</Label>
              <Select value={destinationAccountId} onValueChange={setDestinationAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar cuenta destino" />
                </SelectTrigger>
                <SelectContent>
                  {officeAccounts.map((account: Account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name} ({formatCurrency(parseFloat(account.amount || '0'))})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Routes Selection */}
            <RouteSelectionList
              routes={routesWithBalance}
              selectedRouteIds={selectedRouteIds}
              onRouteToggle={handleRouteToggle}
              onSelectAll={handleSelectAll}
              emptyMessage="No hay rutas con saldo disponible"
              renderRouteContent={(route, isSelected) => (
                <div className="flex items-center gap-2">
                  <span className="text-green-600 font-medium">
                    {formatCurrency(route.balance)}
                  </span>
                  {isSelected && (
                    <>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      <span className="text-red-600 font-medium">$0</span>
                    </>
                  )}
                </div>
              )}
            />

            {/* Summary Preview */}
            {selectedRouteIds.size > 0 && destinationAccount && (
              <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
                <h4 className="font-medium text-sm">Resumen</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Rutas a vaciar:</span>
                    <span className="ml-2 font-medium">{selectedRouteIds.size}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total a transferir:</span>
                    <span className="ml-2 font-medium text-green-600">
                      {formatCurrency(totalToTransfer)}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Nuevo saldo destino:</span>
                    <span className="ml-2 font-medium">
                      {formatCurrency(parseFloat(destinationAccount.amount || '0') + totalToTransfer)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={draining}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {draining ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Vaciando...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Vaciar {selectedRouteIds.size} ruta{selectedRouteIds.size !== 1 ? 's' : ''}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
