'use client'

import { useState, useEffect, useMemo } from 'react'
import { useQuery } from '@apollo/client'
import { Loader2, Split } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { ROUTES_WITH_ACCOUNTS_QUERY } from '@/graphql/queries/transactions'
import { formatCurrency } from '@/lib/utils'
import { RouteSelector } from './RouteSelector'
import { ExpenseTypeCombobox } from './ExpenseTypeCombobox'
import { distributeAmount } from '../utils'

interface RouteWithAccounts {
  id: string
  name: string
  accounts: {
    id: string
    name: string
    type: string
    amount: string
  }[]
}

interface DistributedExpenseInput {
  routeId: string
  routeName: string
  accountId: string
  accountName: string
  amount: number
}

interface DistributedExpenseModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedDate: Date
  onSave: (expenses: DistributedExpenseInput[], expenseSource: string) => Promise<void>
  isSaving: boolean
}

export function DistributedExpenseModal({
  open,
  onOpenChange,
  selectedDate,
  onSave,
  isSaving,
}: DistributedExpenseModalProps) {
  const [totalAmount, setTotalAmount] = useState('')
  const [expenseSource, setExpenseSource] = useState('')
  const [selectedRouteIds, setSelectedRouteIds] = useState<string[]>([])
  // Global source account (applies to all routes - no restrictions)
  const [selectedSourceAccountId, setSelectedSourceAccountId] = useState<string>('')

  const { data: routesData, loading: routesLoading } = useQuery(ROUTES_WITH_ACCOUNTS_QUERY, {
    skip: !open,
  })

  const routes: RouteWithAccounts[] = routesData?.routes || []

  // Flatten all accounts from all routes for the global selector (no restrictions)
  const allAccounts = useMemo(() => {
    const accountsMap = new Map<string, { id: string; name: string; type: string; routeName: string }>()
    routes.forEach((route) => {
      route.accounts.forEach((account) => {
        if (!accountsMap.has(account.id)) {
          accountsMap.set(account.id, {
            id: account.id,
            name: account.name,
            type: account.type,
            routeName: route.name,
          })
        }
      })
    })
    return Array.from(accountsMap.values())
  }, [routes])

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setTotalAmount('')
      setExpenseSource('')
      setSelectedRouteIds([])
      setSelectedSourceAccountId('')
    }
  }, [open])

  // Auto-select default account when accounts load
  useEffect(() => {
    if (allAccounts.length > 0 && !selectedSourceAccountId) {
      // Default to EMPLOYEE_CASH_FUND if available
      const defaultAccount = allAccounts.find((a) => a.type === 'EMPLOYEE_CASH_FUND') || allAccounts[0]
      if (defaultAccount) {
        setSelectedSourceAccountId(defaultAccount.id)
      }
    }
  }, [allAccounts, selectedSourceAccountId])

  // Calculate distribution preview
  const distributionPreview = useMemo(() => {
    if (!totalAmount || selectedRouteIds.length === 0 || !selectedSourceAccountId) return []

    const total = parseFloat(totalAmount) || 0
    const distribution = distributeAmount(total, selectedRouteIds)
    const selectedAccount = allAccounts.find((a) => a.id === selectedSourceAccountId)

    return selectedRouteIds.map((routeId) => {
      const route = routes.find((r) => r.id === routeId)
      const amount = distribution.get(routeId) || 0

      return {
        routeId,
        routeName: route?.name || 'Unknown',
        accountId: selectedSourceAccountId,
        accountName: selectedAccount?.name || 'Sin cuenta',
        amount,
      }
    })
  }, [totalAmount, selectedRouteIds, routes, selectedSourceAccountId, allAccounts])

  const handleSave = async () => {
    if (!expenseSource || !totalAmount || distributionPreview.length === 0) return

    // Validate all routes have accounts
    const validExpenses = distributionPreview.filter((e) => e.accountId)
    if (validExpenses.length !== distributionPreview.length) {
      return // Some routes don't have valid accounts
    }

    await onSave(validExpenses, expenseSource)
    onOpenChange(false)
  }

  const isValid =
    expenseSource &&
    totalAmount &&
    parseFloat(totalAmount) > 0 &&
    selectedRouteIds.length > 0 &&
    selectedSourceAccountId

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Split className="h-5 w-5" />
            Gasto Distribuido
          </DialogTitle>
          <DialogDescription>
            Divide un gasto entre multiples rutas. El monto se distribuira equitativamente.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Expense Type */}
          <div className="grid gap-2">
            <Label>Tipo de Gasto</Label>
            <ExpenseTypeCombobox
              value={expenseSource}
              onValueChange={setExpenseSource}
              placeholder="Seleccionar tipo"
              className="w-full"
            />
          </div>

          {/* Total Amount */}
          <div className="grid gap-2">
            <Label>Monto Total</Label>
            <Input
              type="number"
              value={totalAmount}
              onChange={(e) => setTotalAmount(e.target.value)}
              onWheel={(e) => e.currentTarget.blur()}
              placeholder="0.00"
            />
          </div>

          {/* Source Account - Global selector */}
          <div className="grid gap-2">
            <Label>Cuenta Origen</Label>
            {routesLoading ? (
              <div className="flex items-center justify-center py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : (
              <Select
                value={selectedSourceAccountId}
                onValueChange={setSelectedSourceAccountId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar cuenta origen" />
                </SelectTrigger>
                <SelectContent>
                  {allAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name} ({account.routeName})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <p className="text-xs text-muted-foreground">
              Selecciona la cuenta de donde se tomara el dinero
            </p>
          </div>

          {/* Route Selection */}
          <div className="grid gap-2">
            <Label>Rutas a Distribuir</Label>
            {routesLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : (
              <RouteSelector
                routes={routes}
                selectedRouteIds={selectedRouteIds}
                onSelectionChange={setSelectedRouteIds}
              />
            )}
          </div>

          {/* Distribution Preview */}
          {distributionPreview.length > 0 && (
            <div className="grid gap-2">
              <Label>Vista Previa de Distribucion</Label>
              <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                {distributionPreview.map((item) => (
                  <div
                    key={item.routeId}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="font-medium">{item.routeName}</span>
                    <Badge variant="outline" className="bg-red-50 text-red-700">
                      {formatCurrency(item.amount)}
                    </Badge>
                  </div>
                ))}
                <div className="pt-2 border-t flex justify-between font-medium">
                  <span>Total</span>
                  <span className="text-red-700">
                    {formatCurrency(parseFloat(totalAmount) || 0)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!isValid || isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Split className="h-4 w-4 mr-2" />
                Distribuir Gasto
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
