'use client'

import { useState, useMemo, useEffect } from 'react'
import { useMutation } from '@apollo/client'
import { Loader2, ArrowRight, Check, AlertCircle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency } from '@/lib/utils'
import { DISTRIBUTE_MONEY } from '@/graphql/mutations/batchTransfer'
import { useBatchTransferData, type Account, type RouteWithBalance } from '../hooks/useBatchTransferData'
import { RouteSelectionList } from './RouteSelectionList'

interface DistributeMoneyModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => Promise<void>
}

type DistributionMode = 'FIXED_EQUAL' | 'VARIABLE'

export function DistributeMoneyModal({ open, onOpenChange, onSuccess }: DistributeMoneyModalProps) {
  const { toast } = useToast()
  const [sourceAccountId, setSourceAccountId] = useState<string>('')
  const [distributionMode, setDistributionMode] = useState<DistributionMode>('FIXED_EQUAL')
  const [fixedAmount, setFixedAmount] = useState<string>('')
  const [variableAmounts, setVariableAmounts] = useState<Map<string, string>>(new Map())

  const {
    routesWithBalance,
    sourceAccounts,
    isLoading,
    selectedRouteIds,
    setSelectedRouteIds,
    handleSelectAll,
    handleRouteToggle,
    selectAllRoutes,
  } = useBatchTransferData({ open, filterPositiveBalance: false })

  const [distributeMoney, { loading: distributing }] = useMutation(DISTRIBUTE_MONEY)

  // Select all routes by default when modal opens
  useEffect(() => {
    if (open && routesWithBalance.length > 0) {
      selectAllRoutes()
    }
  }, [open, routesWithBalance.length, selectAllRoutes])

  // Get selected source account details
  const sourceAccount = useMemo(() => {
    if (!sourceAccountId) return null
    return sourceAccounts.find((a) => a.id === sourceAccountId)
  }, [sourceAccounts, sourceAccountId])

  const sourceBalance = sourceAccount ? parseFloat(sourceAccount.amount || '0') : 0

  // Calculate total to distribute
  const totalToDistribute = useMemo(() => {
    if (distributionMode === 'FIXED_EQUAL') {
      return (parseFloat(fixedAmount) || 0) * selectedRouteIds.size
    }
    let total = 0
    for (const routeId of selectedRouteIds) {
      total += parseFloat(variableAmounts.get(routeId) || '0')
    }
    return total
  }, [distributionMode, fixedAmount, selectedRouteIds, variableAmounts])

  const hasInsufficientBalance = totalToDistribute > sourceBalance && sourceAccountId

  const handleVariableAmountChange = (routeId: string, amount: string) => {
    setVariableAmounts((prev) => new Map(prev).set(routeId, amount))
  }

  const handleSubmit = async () => {
    if (selectedRouteIds.size === 0) {
      toast({ title: 'Error', description: 'Selecciona al menos una ruta', variant: 'destructive' })
      return
    }
    if (!sourceAccountId) {
      toast({ title: 'Error', description: 'Selecciona una cuenta origen', variant: 'destructive' })
      return
    }
    if (hasInsufficientBalance) {
      toast({ title: 'Error', description: 'Saldo insuficiente en la cuenta origen', variant: 'destructive' })
      return
    }
    if (distributionMode === 'FIXED_EQUAL' && (!fixedAmount || parseFloat(fixedAmount) <= 0)) {
      toast({ title: 'Error', description: 'Ingresa un monto válido', variant: 'destructive' })
      return
    }

    try {
      const input: {
        sourceAccountId: string
        routeIds: string[]
        distributionMode: DistributionMode
        fixedAmount?: string
        variableAmounts?: { routeId: string; amount: string }[]
        description?: string
      } = {
        sourceAccountId,
        routeIds: Array.from(selectedRouteIds),
        distributionMode,
        description: 'Distribución de dinero',
      }

      if (distributionMode === 'FIXED_EQUAL') {
        input.fixedAmount = fixedAmount
      } else {
        input.variableAmounts = Array.from(selectedRouteIds)
          .map((routeId) => ({ routeId, amount: variableAmounts.get(routeId) || '0' }))
          .filter((v) => parseFloat(v.amount) > 0)
      }

      const result = await distributeMoney({ variables: { input } })

      if (result.data?.distributeMoney.success) {
        toast({ title: 'Dinero distribuido', description: result.data.distributeMoney.message })
        await onSuccess()
        onOpenChange(false)
        // Reset form
        setSourceAccountId('')
        setSelectedRouteIds(new Set())
        setFixedAmount('')
        setVariableAmounts(new Map())
        setDistributionMode('FIXED_EQUAL')
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error al distribuir dinero',
        variant: 'destructive',
      })
    }
  }

  const canSubmit =
    selectedRouteIds.size > 0 &&
    sourceAccountId &&
    !hasInsufficientBalance &&
    totalToDistribute > 0 &&
    !distributing

  const renderRouteContent = (route: RouteWithBalance, isSelected: boolean) => {
    const amountToReceive =
      distributionMode === 'FIXED_EQUAL'
        ? parseFloat(fixedAmount) || 0
        : parseFloat(variableAmounts.get(route.id) || '0')

    if (distributionMode === 'VARIABLE' && isSelected) {
      return (
        <Input
          type="number"
          placeholder="0.00"
          className="w-28"
          value={variableAmounts.get(route.id) || ''}
          onChange={(e) => handleVariableAmountChange(route.id, e.target.value)}
        />
      )
    }

    return (
      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">{formatCurrency(route.balance)}</span>
        {isSelected && amountToReceive > 0 && (
          <>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <span className="text-green-600 font-medium">
              {formatCurrency(route.balance + amountToReceive)}
            </span>
          </>
        )}
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Distribuir Dinero</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <ScrollArea className="max-h-[calc(90vh-180px)]">
            <div className="space-y-4 pr-4">
              {/* Source Account */}
              <div className="space-y-2">
                <Label>Cuenta Origen</Label>
                <Select value={sourceAccountId} onValueChange={setSourceAccountId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar cuenta origen" />
                  </SelectTrigger>
                  <SelectContent>
                    {sourceAccounts.map((account: Account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name} ({formatCurrency(parseFloat(account.amount || '0'))})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Distribution Mode Tabs */}
              <Tabs
                value={distributionMode}
                onValueChange={(v) => setDistributionMode(v as DistributionMode)}
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="FIXED_EQUAL">Monto Fijo</TabsTrigger>
                  <TabsTrigger value="VARIABLE">Monto Variable</TabsTrigger>
                </TabsList>

                <TabsContent value="FIXED_EQUAL" className="space-y-4">
                  <div className="space-y-2">
                    <Label>Monto por ruta</Label>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={fixedAmount}
                      onChange={(e) => setFixedAmount(e.target.value)}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="VARIABLE" className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Define el monto para cada ruta seleccionada
                  </p>
                </TabsContent>
              </Tabs>

              {/* Routes Selection */}
              <RouteSelectionList
                routes={routesWithBalance}
                selectedRouteIds={selectedRouteIds}
                onRouteToggle={handleRouteToggle}
                onSelectAll={handleSelectAll}
                height="h-[250px]"
                renderRouteContent={renderRouteContent}
              />

              {/* Insufficient Balance Warning */}
              {hasInsufficientBalance && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Saldo insuficiente. Disponible: {formatCurrency(sourceBalance)}, Requerido:{' '}
                    {formatCurrency(totalToDistribute)}
                  </AlertDescription>
                </Alert>
              )}

              {/* Summary Preview */}
              {selectedRouteIds.size > 0 && sourceAccount && totalToDistribute > 0 && (
                <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
                  <h4 className="font-medium text-sm">Resumen</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Rutas:</span>
                      <span className="ml-2 font-medium">{selectedRouteIds.size}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Total a distribuir:</span>
                      <span className="ml-2 font-medium text-red-600">
                        {formatCurrency(totalToDistribute)}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Nuevo saldo origen:</span>
                      <span className="ml-2 font-medium">
                        {formatCurrency(sourceBalance - totalToDistribute)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={distributing}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {distributing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Distribuyendo...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Distribuir a {selectedRouteIds.size} ruta{selectedRouteIds.size !== 1 ? 's' : ''}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
